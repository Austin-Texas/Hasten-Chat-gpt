import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Verify admin/finance access
    if (!user || !['admin', 'finance'].includes(user.role)) {
      console.error('Unauthorized: non-admin/finance attempted payroll export');
      return Response.json({ error: 'Admin/Finance only' }, { status: 403 });
    }

    const { export_type, year } = await req.json();
    
    if (!export_type || !['w2', '1099'].includes(export_type)) {
      return Response.json({ error: 'Invalid export type' }, { status: 400 });
    }

    const currentYear = year || new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // Fetch all payroll records for year
    const allRecords = await base44.asServiceRole.entities.PayrollRecord.filter({}, "-created_date", 5000);
    const yearRecords = allRecords.filter(r => {
      const periodEnd = new Date(r.pay_period_end);
      return periodEnd.getFullYear() === currentYear && r.status === 'paid';
    });

    // Group by driver
    const driverData = {};
    yearRecords.forEach(record => {
      if (!driverData[record.driver_id]) {
        driverData[record.driver_id] = {
          driver_name: record.driver_name,
          employment_type: record.employment_type,
          records: [],
          total_gross: 0,
          total_federal: 0,
          total_fica_ss: 0,
          total_fica_medicare: 0,
          total_state: 0,
        };
      }
      driverData[record.driver_id].records.push(record);
      driverData[record.driver_id].total_gross += record.gross_pay || 0;
      driverData[record.driver_id].total_federal += record.federal_withholding || 0;
      driverData[record.driver_id].total_fica_ss += record.fica_social_security || 0;
      driverData[record.driver_id].total_fica_medicare += record.fica_medicare || 0;
      driverData[record.driver_id].total_state += record.state_withholding || 0;
    });

    // Filter by employment type
    const filtered = Object.values(driverData).filter(d => {
      if (export_type === 'w2') return d.employment_type === 'W2_employee';
      return d.employment_type !== 'W2_employee';
    });

    // Generate CSV
    const rows = [];
    
    if (export_type === 'w2') {
      rows.push('Driver Name,SSN (Last 4),Gross Income,Federal Withholding,SS Withholding,Medicare Withholding,State Withholding,Pay Periods');
      filtered.forEach(driver => {
        rows.push([
          driver.driver_name,
          '****',
          driver.total_gross.toFixed(2),
          driver.total_federal.toFixed(2),
          driver.total_fica_ss.toFixed(2),
          driver.total_fica_medicare.toFixed(2),
          driver.total_state.toFixed(2),
          driver.records.length,
        ].join(','));
      });
    } else {
      rows.push('Contractor Name,EIN,Gross Income,Deductions,Net Settlement');
      filtered.forEach(driver => {
        const totalDeductions = driver.total_federal + driver.total_fica_ss + driver.total_fica_medicare + driver.total_state;
        rows.push([
          driver.driver_name,
          '****',
          driver.total_gross.toFixed(2),
          totalDeductions.toFixed(2),
          (driver.total_gross - totalDeductions).toFixed(2),
        ].join(','));
      });
    }

    const csv = rows.join('\n');
    const filename = `${export_type.toUpperCase()}-Export-${currentYear}.csv`;

    // Log to manifest
    await base44.asServiceRole.entities.Manifest.create({
      load_id: null,
      event_type: export_type === 'w2' ? 'w2_export_generated' : '1099_export_generated',
      event_title: `${export_type.toUpperCase()} Export Generated`,
      event_description: `${export_type.toUpperCase()} export generated for ${currentYear}: ${filtered.length} records`,
      event_timestamp: new Date().toISOString(),
      performed_by: user.id,
      performed_by_role: user.role,
      is_system_event: false,
    }).catch(() => {});

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Payroll export error:', error);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});