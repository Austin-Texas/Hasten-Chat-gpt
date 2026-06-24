import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.2.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { loadIds, clientId } = await req.json();
    if (!loadIds || !Array.isArray(loadIds) || loadIds.length === 0) {
      return new Response(JSON.stringify({ error: 'loadIds required' }), { status: 400 });
    }

    // Fetch loads, client, invoices
    const [loads, clients, invoices] = await Promise.all([
      Promise.all(loadIds.map(id => base44.entities.Load.get(id))),
      clientId ? base44.entities.Client.get(clientId) : Promise.resolve(null),
      base44.entities.Invoice.filter({ client_id: clientId || loadIds[0] }, '-created_date', 10),
    ]);

    const client = clients || { company_name: 'Client', email: 'contact@example.com', address: '' };
    const invoiceNum = `INV-${Date.now()}`;
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Calculate totals
    let subtotal = 0;
    let fuelSurcharge = 0;
    let accessorials = 0;

    loads.forEach(l => {
      subtotal += l.rate || 0;
      fuelSurcharge += l.fuel_surcharge || 0;
      accessorials += l.accessorial_charges || 0;
    });

    const total = subtotal + fuelSurcharge + accessorials;

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Header
    doc.setFillColor(234, 88, 12); // Orange
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('HASTEN', margin, 20);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Freight & Logistics', margin, 27);

    // Company info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('HASTEN Logistics Inc.', pageWidth - margin - 80, yPos + 35);
    doc.text('123 Commerce St, Suite 100', pageWidth - margin - 80, yPos + 42);
    doc.text('New York, NY 10001', pageWidth - margin - 80, yPos + 49);
    doc.text('contact@hasten.com', pageWidth - margin - 80, yPos + 56);

    yPos += 40;

    // Invoice title and details
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('INVOICE', margin, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Invoice #: ${invoiceNum}`, margin, yPos + 8);
    doc.text(`Date: ${invoiceDate.toLocaleDateString()}`, margin, yPos + 14);
    doc.text(`Due Date: ${dueDate.toLocaleDateString()}`, margin, yPos + 20);

    // Bill To
    doc.setFont(undefined, 'bold');
    doc.text('BILL TO:', margin, yPos + 30);
    doc.setFont(undefined, 'normal');
    doc.text(client.company_name, margin, yPos + 37);
    if (client.contact_name) doc.text(client.contact_name, margin, yPos + 44);
    if (client.address) doc.text(client.address, margin, yPos + 51);
    if (client.city) doc.text(`${client.city}, ${client.state} ${client.zip}`, margin, yPos + 58);
    doc.text(client.email, margin, yPos + 65);

    yPos += 75;

    // Table header
    const tableTop = yPos;
    const col1 = margin;
    const col2 = margin + 60;
    const col3 = margin + 120;
    const col4 = pageWidth - margin - 40;

    doc.setFillColor(240, 240, 240);
    doc.rect(col1, tableTop, pageWidth - 2 * margin, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Load #', col1 + 2, tableTop + 6);
    doc.text('Route', col2 + 2, tableTop + 6);
    doc.text('Miles', col3 + 2, tableTop + 6);
    doc.text('Amount', col4 - 15, tableTop + 6);

    yPos = tableTop + 10;

    // Table rows
    doc.setFont(undefined, 'normal');
    loads.forEach(load => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(load.load_number || `LD${load.id.slice(-6)}`, col1 + 2, yPos);
      doc.text(`${load.origin_city} → ${load.destination_city}`, col2 + 2, yPos);
      doc.text(`${load.miles || '—'}`, col3 + 2, yPos);
      doc.text(`$${(load.rate || 0).toLocaleString()}`, col4 - 15, yPos);
      yPos += 6;
    });

    // Totals
    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text('Subtotal:', col3 + 2, yPos);
    doc.text(`$${subtotal.toLocaleString()}`, col4 - 15, yPos);
    yPos += 6;

    if (fuelSurcharge > 0) {
      doc.text('Fuel Surcharge:', col3 + 2, yPos);
      doc.text(`$${fuelSurcharge.toLocaleString()}`, col4 - 15, yPos);
      yPos += 6;
    }

    if (accessorials > 0) {
      doc.text('Accessorials:', col3 + 2, yPos);
      doc.text(`$${accessorials.toLocaleString()}`, col4 - 15, yPos);
      yPos += 6;
    }

    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL DUE:', col3 + 2, yPos + 3);
    doc.setTextColor(234, 88, 12);
    doc.text(`$${total.toLocaleString()}`, col4 - 15, yPos + 3);

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Output PDF as base64
    const pdfData = doc.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(pdfData)));

    // Create invoice record
    const createdInvoice = await base44.entities.Invoice.create({
      invoice_number: invoiceNum,
      status: 'draft',
      client_id: clientId,
      issue_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      line_haul: subtotal,
      fuel_surcharge: fuelSurcharge,
      accessorial_charges: accessorials,
      total_amount: total,
      balance_due: total,
      payment_terms: 'net30',
      notes: `Generated from ${loads.length} completed load(s)`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        invoiceId: createdInvoice.id,
        invoiceNumber: invoiceNum,
        total,
        pdfBase64,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});