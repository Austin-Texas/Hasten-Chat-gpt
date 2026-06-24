import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payroll_record_id, driver_id } = await req.json();
    
    if (!payroll_record_id) {
      return Response.json({ error: 'Missing payroll_record_id' }, { status: 400 });
    }

    // Fetch payroll record
    const records = await base44.asServiceRole.entities.PayrollRecord.filter({ id: payroll_record_id }, "-created_date", 1);
    if (!records[0]) {
      return Response.json({ error: 'Payroll record not found' }, { status: 404 });
    }
    const record = records[0];

    // Security: Driver can only see own records
    if (user.role === 'driver' && record.driver_id !== user.id) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch driver
    const drivers = await base44.asServiceRole.entities.Driver.filter({ id: record.driver_id }, "-created_date", 1);
    const driver = drivers[0];

    // Fetch loads in period
    const loads = await base44.asServiceRole.entities.Load.filter({
      id: { $in: record.loads_included || [] }
    }, "-created_date", 1000);

    // Generate CSV statement
    const fmt = (n) => n.toFixed(2);
    const rows = [];

    // Header
    rows.push('HASTEN SETTLEMENT STATEMENT');
    rows.push(`Driver: ${record.driver_name}`);
    rows.push(`Period: ${record.pay_period_start} to ${record.pay_period_end}`);
    rows.push(`Generated: ${new Date().toLocaleDateString()}`);
    rows.push('');
    rows.push('');

    // Summary
    rows.push('SUMMARY');
    rows.push(`Gross Pay,${fmt(record.gross_pay)}`);
    if (record.federal_withholding) rows.push(`Federal Withholding,${fmt(record.federal_withholding)}`);
    if (record.fica_social_security) rows.push(`Social Security (6.2%),${fmt(record.fica_social_security)}`);
    if (record.fica_medicare) rows.push(`Medicare (1.45%),${fmt(record.fica_medicare)}`);
    if (record.state_withholding) rows.push(`State Withholding,${fmt(record.state_withholding)}`);
    if (record.health_insurance) rows.push(`Health Insurance,${fmt(record.health_insurance)}`);
    rows.push(`Total Deductions,${fmt(record.total_deductions)}`);
    rows.push(`NET PAY,${fmt(record.net_pay)}`);
    rows.push('');
    rows.push('');

    // Load details
    rows.push('LOAD DETAILS');
    rows.push('Load #,Origin,Destination,Miles,Rate');
    loads.forEach(load => {
      rows.push(`${load.load_number || load.id.slice(-6)},${load.origin_city},${load.destination_city},${load.miles || 0},${fmt(load.rate || 0)}`);
    });
    rows.push('');
    rows.push(`Total Loads: ${record.loads_completed}`);
    rows.push(`Total Miles: ${record.total_miles}`);
    rows.push(`Total Hours: ${(record.total_hours || 0).toFixed(1)}`);

    const csv = rows.join('\n');
    const filename = `Settlement-${record.driver_name.replace(' ', '-')}-${record.pay_period_start}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Settlement statement error:', error);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});