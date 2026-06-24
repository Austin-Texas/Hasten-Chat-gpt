import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Fetch all completed loads without invoices
    const completedLoads = await base44.asServiceRole.entities.Load.filter({ status: 'completed' }, '-created_date', 500);
    const invoices = await base44.asServiceRole.entities.Invoice.list('-created_date', 500);

    const invoicedLoadIds = new Set(invoices.map(i => i.load_id).filter(Boolean));
    const loadsNeedingInvoices = completedLoads.filter(l => !invoicedLoadIds.has(l.id));

    if (loadsNeedingInvoices.length === 0) {
      return Response.json({ success: true, message: 'No loads pending invoices' });
    }

    // Generate invoice for each load
    const newInvoices = [];
    for (const load of loadsNeedingInvoices) {
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      const totalAmount = (load.rate || 0) + (load.fuel_surcharge || 0) + (load.accessorial_charges || 0);
      
      const invoiceData = {
        invoice_number: invoiceNumber,
        load_id: load.id,
        client_id: load.client_id,
        broker_id: load.broker_id,
        driver_id: load.driver_id,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        line_haul: load.rate || 0,
        fuel_surcharge: load.fuel_surcharge || 0,
        accessorial_charges: load.accessorial_charges || 0,
        total_amount: totalAmount,
        balance_due: totalAmount,
        status: 'draft',
        payment_terms: 'net30',
      };

      const createdInvoice = await base44.asServiceRole.entities.Invoice.create(invoiceData);
      newInvoices.push(createdInvoice);
    }

    return Response.json({
      success: true,
      message: `Generated ${newInvoices.length} invoice${newInvoices.length !== 1 ? 's' : ''}`,
      invoicesCreated: newInvoices.length,
      invoices: newInvoices.map(i => ({ id: i.id, invoice_number: i.invoice_number, amount: i.total_amount })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});