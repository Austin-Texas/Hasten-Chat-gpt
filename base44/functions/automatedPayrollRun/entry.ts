import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Called by scheduled automation (weekly)
// Generates draft payroll records without auto-paying
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function is called by automation (no user context needed)
    // Log as system event
    
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday, 5=Friday
    
    // Calculate pay period (previous week, Monday-Friday)
    const payPeriodEnd = new Date(now);
    payPeriodEnd.setDate(now.getDate() - dayOfWeek + 5); // Move to Friday
    
    const payPeriodStart = new Date(payPeriodEnd);
    payPeriodStart.setDate(payPeriodEnd.getDate() - 6); // Move back to Monday
    
    const formatDate = (d) => d.toISOString().split('T')[0];
    const startStr = formatDate(payPeriodStart);
    const endStr = formatDate(payPeriodEnd);

    // Fetch all active drivers
    const drivers = await base44.asServiceRole.entities.Driver.filter({
      status: { $ne: 'inactive' }
    }, "-created_date", 500);

    let processedCount = 0;
    let successCount = 0;
    const errors = [];

    // Process each driver
    for (const driver of drivers) {
      try {
        // Call calculatePayroll for this driver
        // Note: This assumes calculatePayroll is exposed internally
        // In production, may need to invoke it as a backend function
        
        // For now, we'll create draft records directly
        const draftRecords = await base44.asServiceRole.entities.PayrollRecord.filter({
          driver_id: driver.id,
          pay_period_start: startStr,
          pay_period_end: endStr,
        }, "-created_date", 1);

        // Skip if already processed
        if (draftRecords.length > 0) {
          continue;
        }

        // Fetch completed loads
        const loads = await base44.asServiceRole.entities.Load.filter({
          driver_id: driver.id,
          status: 'completed'
        }, "-created_date", 500);

        const loadsInPeriod = loads.filter(l => {
          const deliveryDate = new Date(l.actual_delivery || l.delivery_date);
          return deliveryDate >= new Date(startStr) && deliveryDate <= new Date(endStr);
        });

        if (loadsInPeriod.length === 0) continue;

        // Fetch tax profile
        const taxProfiles = await base44.asServiceRole.entities.TaxProfile.filter({
          driver_id: driver.id
        }, "-created_date", 1);
        const taxProfile = taxProfiles[0] || {
          employment_type: driver.driver_type === 'contractor' ? '1099_contractor' : 'W2_employee',
          filing_status: 'single',
          state: 'TX',
        };

        // Fetch approved expenses in period
        const allExpenses = await base44.asServiceRole.entities.Expense.filter({
          status: 'approved'
        }, "-created_date", 5000);

        const expensesForDriver = allExpenses.filter(e => {
          const expenseDate = new Date(e.date);
          const isInPeriod = expenseDate >= new Date(startStr) && expenseDate <= new Date(endStr);
          const isDriverOrTruck = e.driver_id === driver.id || e.truck_id === driver.truck_id;
          return isInPeriod && isDriverOrTruck;
        });

        let totalApprovedExpenses = 0;
        expensesForDriver.forEach(exp => {
          totalApprovedExpenses += exp.amount || 0;
        });

        // Calculate gross pay
        let basePay = 0;
        let totalMiles = 0;

        loadsInPeriod.forEach(load => {
          totalMiles += load.miles || 0;
          
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
              basePay += ((load.miles || 0) / 55) * (driver.pay_rate || 0);
              break;
          }
        });

        // Simple tax calculation (reuse IRS logic from calculatePayroll.js)
        let federalWithholding = 0;
        let ficaSSWithholding = 0;
        let ficaMedicareWithholding = 0;
        let stateWithholding = 0;

        if (taxProfile.employment_type === 'W2_employee') {
          // Federal (simplified)
          const rate = taxProfile.filing_status === 'married_filing_jointly' ? 0.10 : 0.12;
          const threshold = rate === 0.10 ? 900 : 600;
          federalWithholding = basePay > threshold ? (basePay - threshold) * rate : 0;
          
          // FICA
          ficaSSWithholding = basePay * 0.062;
          ficaMedicareWithholding = basePay * 0.0145;
          
          // State
          const stateRates = { CA: 0.05, TX: 0.00, FL: 0.00, NY: 0.0627 };
          const stateRate = stateRates[taxProfile.state] || 0.03;
          stateWithholding = basePay * stateRate;
        }

        // Calculate expense deductions
        let expenseDeduction = 0;
        if (taxProfile.employment_type !== 'W2_employee') {
          expenseDeduction = totalApprovedExpenses;
        } else {
          expensesForDriver.forEach(exp => {
            if (exp.is_reimbursable === false) {
              expenseDeduction += exp.amount || 0;
            }
          });
        }

        const totalDeductions = federalWithholding + ficaSSWithholding + ficaMedicareWithholding + stateWithholding + (taxProfile.health_insurance_deduction || 0) + expenseDeduction;
        const netPay = Math.max(0, basePay - totalDeductions);

        // Create draft payroll record
        await base44.asServiceRole.entities.PayrollRecord.create({
          driver_id: driver.id,
          driver_name: `${driver.first_name} ${driver.last_name}`,
          pay_type: driver.pay_type,
          employment_type: taxProfile.employment_type,
          pay_period_start: startStr,
          pay_period_end: endStr,
          loads_completed: loadsInPeriod.length,
          total_miles: totalMiles,
          base_pay: Math.round(basePay * 100) / 100,
          bonuses: 0,
          reimbursements: 0,
          gross_pay: Math.round(basePay * 100) / 100,
          federal_withholding: Math.round(federalWithholding * 100) / 100,
          fica_social_security: Math.round(ficaSSWithholding * 100) / 100,
          fica_medicare: Math.round(ficaMedicareWithholding * 100) / 100,
          state_withholding: Math.round(stateWithholding * 100) / 100,
          approved_expenses_amount: Math.round(totalApprovedExpenses * 100) / 100,
          total_deductions: Math.round(totalDeductions * 100) / 100,
          net_pay: Math.round(netPay * 100) / 100,
          status: 'draft',
          loads_included: loadsInPeriod.map(l => l.id),
          expenses_included: expensesForDriver.map(e => e.id),
        });

        successCount++;
      } catch (err) {
        console.error(`Error processing driver ${driver.id}:`, err);
        errors.push(`${driver.first_name} ${driver.last_name}: ${err.message}`);
      }
      processedCount++;
    }

    // Log to manifest
    await base44.asServiceRole.entities.Manifest.create({
      load_id: null,
      event_type: 'payroll_automated_run',
      event_title: 'Automated Payroll Run',
      event_description: `Automated payroll run for ${startStr} to ${endStr}: ${successCount}/${processedCount} drivers processed`,
      event_timestamp: new Date().toISOString(),
      performed_by_role: 'system',
      is_system_event: true,
    }).catch(() => {});

    return Response.json({
      success: true,
      message: `Payroll run complete: ${successCount}/${processedCount} drivers`,
      period: { start: startStr, end: endStr },
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Automated payroll run error:', error);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});