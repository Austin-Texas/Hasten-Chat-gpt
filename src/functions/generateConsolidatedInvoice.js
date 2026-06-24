import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { loadIds, clientId } = await req.json();
    if (!Array.isArray(loadIds) || loadIds.length === 0 || !clientId) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Fetch all loads and client details
    const loads = await Promise.all(loadIds.map(id => base44.asServiceRole.entities.Load.get(id)));
    const client = await base44.asServiceRole.entities.Client.get(clientId);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Calculate totals
    let lineHaul = 0;
    let fuelSurcharge = 0;
    let accessorialCharges = 0;

    loads.forEach(load => {
      lineHaul += load.rate || 0;
      fuelSurcharge += load.fuel_surcharge || 0;
      accessorialCharges += load.accessorial_charges || 0;
    });

    const totalAmount = lineHaul + fuelSurcharge + accessorialCharges;

    // Create consolidated invoice
    const invoiceNumber = `INV-BULK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const now = new Date();
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const invoiceData = {
      invoice_number: invoiceNumber,
      client_id: clientId,
      issue_date: now.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      line_haul: lineHaul,
      fuel_surcharge: fuelSurcharge,
      accessorial_charges: accessorialCharges,
      total_amount: totalAmount,
      balance_due: totalAmount,
      status: 'draft',
      payment_terms: 'net30',
      notes: `Consolidated invoice for ${loads.length} load${loads.length !== 1 ? 's' : ''}. Load numbers: ${loads.map(l => l.load_number || l.id.slice(-4)).join(', ')}`,
    };

    const createdInvoice = await base44.asServiceRole.entities.Invoice.create(invoiceData);

    return Response.json({
      success: true,
      message: `Consolidated invoice created from ${loads.length} load${loads.length !== 1 ? 's' : ''}`,
      invoice: {
        id: createdInvoice.id,
        invoice_number: createdInvoice.invoice_number,
        total_amount: createdInvoice.total_amount,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});