import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// IRS 2026 Federal Withholding Tables (simplified single-pay-period)
const getIRSWithholding = (grossPay, filingStatus, allowances = 0, extraWithholding = 0) => {
  // Simplified 2026 rates (use actual IRS tables in production)
  const rates = {
    single: { base: 0.12, threshold: 600 },
    married_filing_jointly: { base: 0.10, threshold: 900 },
    head_of_household: { base: 0.11, threshold: 700 },
  };
  const rate = rates[filingStatus] || rates.single;
  
  if (grossPay <= rate.threshold) return extraWithholding;
  const withheld = (grossPay - rate.threshold) * rate.base + extraWithholding;
  return Math.max(0, withheld);
};

// Calculate FICA taxes
const getFICAWithholding = (grossPay) => {
  const socialSecurity = grossPay * 0.062; // 6.2%
  const medicare = grossPay * 0.0145; // 1.45%
  return { socialSecurity, medicare, total: socialSecurity + medicare };
};

// Calculate state withholding (if applicable)
const getStateWithholding = (grossPay, state, filingStatus) => {
  // Simplified: most states 2-6% (varies by state)
  const stateRates = {
    CA: 0.05, TX: 0.00, FL: 0.00, NY: 0.0627, // examples
  };
  const rate = stateRates[state] || 0.03; // default 3% for unknown states
  return grossPay * rate;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Verify admin access
    if (!user || user.role !== 'admin') {
      console.error('Unauthorized: non-admin attempted payroll calculation');
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Parse request body
    const { driver_id, pay_period_start, pay_period_end } = await req.json();
    
    if (!driver_id || !pay_period_start || !pay_period_end) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch driver
    const drivers = await base44.asServiceRole.entities.Driver.filter({ id: driver_id }, "-created_date", 1);
    if (!drivers[0]) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }
    const driver = drivers[0];

    // Fetch tax profile
    const taxProfiles = await base44.asServiceRole.entities.TaxProfile.filter({ driver_id }, "-created_date", 1);
    const taxProfile = taxProfiles[0] || {
      employment_type: driver.driver_type || 'W2_employee',
      filing_status: 'single',
      state: 'TX',
    };

    // Fetch completed loads in period
    const loads = await base44.asServiceRole.entities.Load.filter({
      driver_id,
      status: 'completed'
    }, "-created_date", 500);

    const loadsInPeriod = loads.filter(l => {
      const deliveryDate = new Date(l.actual_delivery || l.delivery_date);
      return deliveryDate >= new Date(pay_period_start) && deliveryDate <= new Date(pay_period_end);
    });

    // Fetch approved expenses in period (driver or truck)
    const allExpenses = await base44.asServiceRole.entities.Expense.filter({
      status: 'approved'
    }, "-created_date", 5000);

    const expensesInPeriod = allExpenses.filter(e => {
      const expenseDate = new Date(e.date);
      const isInPeriod = expenseDate >= new Date(pay_period_start) && expenseDate <= new Date(pay_period_end);
      const isDriverOrTruck = e.driver_id === driver_id || e.truck_id === driver.truck_id;
      return isInPeriod && isDriverOrTruck;
    });

    // Categorize expenses
    const expensesByCategory = {};
    let totalApprovedExpenses = 0;

    expensesInPeriod.forEach(exp => {
      if (!expensesByCategory[exp.category]) {
        expensesByCategory[exp.category] = 0;
      }
      expensesByCategory[exp.category] += exp.amount || 0;
      totalApprovedExpenses += exp.amount || 0;
    });

    // Calculate gross pay
    let basePay = 0;
    let totalMiles = 0;
    let totalHours = 0;

    loadsInPeriod.forEach(load => {
      totalMiles += load.miles || 0;
      
      // Calculate pay based on pay_type
      switch (driver.pay_type) {
        case 'per_mile':
          basePay += (load.miles || 0) * (driver.pay_rate || 0);
          break;
        case 'percentage':
          basePay += (load.rate || 0) * ((driver.pay_rate || 0) / 100);
          break;
        case 'flat_rate':
          basePay += driver.pay_rate || 0;
          break;
        case 'hourly':
          // Estimate hours based on miles / average speed (55 mph default)
          totalHours += (load.miles || 0) / 55;
          basePay += ((load.miles || 0) / 55) * (driver.pay_rate || 0);
          break;
      }
    });

    const grossPay = basePay;

    // Tax calculations (employees only)
    let federalWithholding = 0;
    let ficaSSWithholding = 0;
    let ficaMedicareWithholding = 0;
    let stateWithholding = 0;

    if (taxProfile.employment_type === 'W2_employee') {
      // Federal withholding
      federalWithholding = getIRSWithholding(
        grossPay,
        taxProfile.filing_status || 'single',
        taxProfile.withholding_allowances || 0,
        taxProfile.extra_withholding_per_paycheck || 0
      );

      // FICA
      const fica = getFICAWithholding(grossPay);
      ficaSSWithholding = fica.socialSecurity;
      ficaMedicareWithholding = fica.medicare;

      // State withholding
      if (taxProfile.state_withholding_enabled !== false) {
        stateWithholding = getStateWithholding(grossPay, taxProfile.state, taxProfile.filing_status);
      }
    }

    // Calculate expense deductions based on employment type
    let fuelDeduction = expensesByCategory['fuel'] || 0;
    let maintenanceDeduction = (expensesByCategory['maintenance'] || 0) + (expensesByCategory['tires'] || 0) + (expensesByCategory['parts'] || 0) + (expensesByCategory['labor'] || 0);
    let insuranceDeduction = expensesByCategory['insurance'] || 0;
    let tollsDeduction = expensesByCategory['tolls'] || 0;
    let lumperDetentionDeduction = (expensesByCategory['lumper'] || 0) + (expensesByCategory['detention'] || 0);
    let otherExpenseDeduction = (expensesByCategory['permits'] || 0) + (expensesByCategory['scales'] || 0) + (expensesByCategory['registration'] || 0) + (expensesByCategory['meals'] || 0) + (expensesByCategory['lodging'] || 0) + (expensesByCategory['other'] || 0);

    // For contractors/owners: all approved expenses reduce settlement
    // For W-2 employees: non-reimbursable expenses reduce net (reimbursable = separate check)
    let expenseDeduction = 0;
    if (taxProfile.employment_type !== 'W2_employee') {
      // Contractors and owner-operators absorb all business expenses
      expenseDeduction = totalApprovedExpenses;
    } else {
      // W-2 employees: only non-reimbursable expenses reduce paycheck
      // (reimbursable ones are sent separately)
      expensesInPeriod.forEach(exp => {
        if (exp.is_reimbursable === false) {
          expenseDeduction += exp.amount || 0;
        }
      });
    }

    const totalDeductions = federalWithholding + ficaSSWithholding + ficaMedicareWithholding + stateWithholding + (taxProfile.health_insurance_deduction || 0) + expenseDeduction;
    const netPay = Math.max(0, grossPay - totalDeductions);

    // Create PayrollRecord with expense tracking
    const payrollRecord = await base44.asServiceRole.entities.PayrollRecord.create({
      driver_id,
      driver_name: `${driver.first_name} ${driver.last_name}`,
      pay_type: driver.pay_type,
      employment_type: taxProfile.employment_type,
      pay_period_start,
      pay_period_end,
      loads_completed: loadsInPeriod.length,
      total_miles: totalMiles,
      total_hours: Math.round(totalHours * 100) / 100,
      base_pay: Math.round(basePay * 100) / 100,
      bonuses: 0,
      reimbursements: 0,
      gross_pay: Math.round(grossPay * 100) / 100,
      federal_withholding: Math.round(federalWithholding * 100) / 100,
      fica_social_security: Math.round(ficaSSWithholding * 100) / 100,
      fica_medicare: Math.round(ficaMedicareWithholding * 100) / 100,
      state_withholding: Math.round(stateWithholding * 100) / 100,
      health_insurance: Math.round((taxProfile.health_insurance_deduction || 0) * 100) / 100,
      approved_expenses_amount: Math.round(totalApprovedExpenses * 100) / 100,
      fuel_deduction: Math.round(fuelDeduction * 100) / 100,
      maintenance_deduction: Math.round(maintenanceDeduction * 100) / 100,
      insurance_deduction: Math.round(insuranceDeduction * 100) / 100,
      tolls_deduction: Math.round(tollsDeduction * 100) / 100,
      lumper_detention_deduction: Math.round(lumperDetentionDeduction * 100) / 100,
      other_deductions: Math.round(otherExpenseDeduction * 100) / 100,
      total_deductions: Math.round(totalDeductions * 100) / 100,
      net_pay: Math.round(netPay * 100) / 100,
      status: 'calculated',
      loads_included: loadsInPeriod.map(l => l.id),
      expenses_included: expensesInPeriod.map(e => e.id),
    });

    // Log to manifest
    await base44.asServiceRole.entities.Manifest.create({
      load_id: null,
      event_type: 'payroll_generated',
      event_title: 'Payroll Generated',
      event_description: `Payroll calculated for ${driver.first_name} ${driver.last_name} (${pay_period_start} to ${pay_period_end}): ${loadsInPeriod.length} loads, ${expensesInPeriod.length} expenses, net pay ${netPay.toFixed(2)}`,
      event_timestamp: new Date().toISOString(),
      performed_by: user.id,
      performed_by_role: 'admin',
      is_system_event: true,
    }).catch(() => {});

    return Response.json({
      success: true,
      message: `Payroll calculated for ${driver.first_name} ${driver.last_name}`,
      payroll_record: payrollRecord,
    });

  } catch (error) {
    console.error('Payroll calculation error:', error);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});