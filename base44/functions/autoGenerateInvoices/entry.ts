/**
 * autoGenerateInvoices — runs every hour
 * Finds completed loads without invoices and auto-generates them
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find completed loads without invoices
    const completedLoads = await base44.asServiceRole.entities.Load.filter(
      { status: "completed" },
      "-created_date",
      50
    ).catch(() => []);

    const loadsNeedingInvoice = completedLoads.filter(l => !l.invoice_id);

    let created = 0;

    for (const load of loadsNeedingInvoice) {
      const invoiceNum = `INV-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      
      const totalAmount = (load.rate || 0) + (load.fuel_surcharge || 0) + (load.accessorial_charges || 0);

      const invoice = await base44.asServiceRole.entities.Invoice.create({
        invoice_number: invoiceNum,
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
        status: "draft",
        payment_terms: "net30",
      }).catch(e => {
        console.error("[invoice creation]", e.message);
        return null;
      });

      if (invoice) {
        // Update load with invoice_id
        await base44.asServiceRole.entities.Load.update(load.id, { invoice_id: invoice.id }).catch(() => {});

        // Create manifest event
        await base44.asServiceRole.entities.Manifest.create({
          load_id: load.id,
          event_type: "invoice_generated",
          event_title: "Invoice Generated",
          event_description: `Invoice ${invoiceNum} auto-generated for $${totalAmount.toLocaleString()}`,
          event_timestamp: new Date().toISOString(),
          is_system_event: true,
        }).catch(() => {});

        created++;
        console.log(`[invoice] Created ${invoiceNum} for load ${load.id}`);
      }
    }

    return Response.json({ processed: loadsNeedingInvoice.length, created });
  } catch (error) {
    console.error("[autoGenerateInvoices]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});