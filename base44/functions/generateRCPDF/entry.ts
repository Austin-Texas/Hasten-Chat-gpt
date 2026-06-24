import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { load_id, version = 1 } = await req.json();
    if (!load_id) return Response.json({ error: 'Missing load_id' }, { status: 400 });

    // Fetch load and rate confirmation
    const [loads, rcs] = await Promise.all([
      base44.asServiceRole.entities.Load.filter({ id: load_id }, '-created_date', 1),
      base44.asServiceRole.entities.RateConfirmation.filter({ load_id }, '-created_date', 1),
    ]);

    const load = loads[0];
    if (!load) return Response.json({ error: 'Load not found' }, { status: 404 });

    const rc = rcs[0];

    // Create PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    // Header
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('RATE CONFIRMATION', margin, 10);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Version ${version}`, margin, 17);

    // Reset text color
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    y = 35;

    // Section: Load Details
    doc.setFont(undefined, 'bold');
    doc.text('LOAD DETAILS', margin, y);
    y += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const loadSection = [
      [`Load Number:`, load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`],
      [`Status:`, load.status],
      [`Generated:`, new Date().toLocaleDateString()],
      [`Version:`, version.toString()],
    ];

    loadSection.forEach(([label, value]) => {
      doc.text(`${label}`, margin, y);
      doc.text(`${value}`, margin + 50, y);
      y += 6;
    });

    y += 3;

    // Section: Route
    doc.setFont(undefined, 'bold');
    doc.text('ROUTE', margin, y);
    y += 8;

    doc.setFont(undefined, 'normal');
    const routeSection = [
      [`Pickup:`, `${load.origin_city}, ${load.origin_state}`],
      [`Delivery:`, `${load.destination_city}, ${load.destination_state}`],
      [`Equipment:`, load.equipment_type || '—'],
      [`Commodity:`, load.commodity || '—'],
    ];

    routeSection.forEach(([label, value]) => {
      doc.text(`${label}`, margin, y);
      doc.text(`${value}`, margin + 50, y);
      y += 6;
    });

    y += 3;

    // Section: Rate
    doc.setFont(undefined, 'bold');
    doc.text('RATE CONFIRMATION', margin, y);
    y += 8;

    doc.setFont(undefined, 'normal');
    const ratePerMile = load.miles > 0 ? (load.rate / load.miles).toFixed(2) : 0;
    const rateSection = [
      [`Base Rate:`, `$${(load.rate || 0).toFixed(2)}`],
      [`Miles:`, (load.miles || 0).toString()],
      [`Rate/Mile:`, `$${ratePerMile}`],
      [`Fuel Surcharge:`, `$${(load.fuel_surcharge || 0).toFixed(2)}`],
      [`Accessorial:`, `$${(load.accessorial_charges || 0).toFixed(2)}`],
      [`Total:`, `$${((load.rate || 0) + (load.fuel_surcharge || 0) + (load.accessorial_charges || 0)).toFixed(2)}`],
    ];

    rateSection.forEach(([label, value]) => {
      doc.text(`${label}`, margin, y);
      doc.text(`${value}`, margin + 50, y);
      y += 6;
    });

    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    y += 5;

    // Section: Terms
    doc.setFont(undefined, 'bold');
    doc.text('DETENTION & SPECIAL TERMS', margin, y);
    y += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const termsText = load.special_instructions || 'Standard detention: 2 hours free, $50/hour thereafter. Driver detention: $30/hour after 4 hours.';
    const termsLines = doc.splitTextToSize(termsText, pageWidth - 2 * margin);
    doc.text(termsLines, margin, y);
    y += termsLines.length * 4 + 5;

    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    // Signature section
    y = pageHeight - 50;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('DRIVER SIGNATURE', margin, y);
    y += 15;

    doc.setDrawColor(100, 100, 100);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Signature of Driver', margin, y + 3);

    y += 10;
    doc.text(`Date: _______________`, margin, y);
    doc.text(`Time: _______________`, pageWidth / 2, y);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.text(`This Rate Confirmation is valid until ${rc?.expires_at ? new Date(rc.expires_at).toLocaleDateString() : 'as negotiated'}`, margin, pageHeight - 5);

    // Return PDF as base64
    const pdfBase64 = doc.output('dataurlstring').split(',')[1];
    return Response.json({ pdf_base64: pdfBase64, success: true });
  } catch (error) {
    console.error('[generateRCPDF]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});