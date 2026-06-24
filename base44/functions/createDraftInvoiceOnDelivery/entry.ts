/**
 * createDraftInvoiceOnDelivery — entity automation handler
 * Fires when a Load's status changes to "delivered".
 * Creates a draft Invoice linked to the load, updates the load with invoice_id,
 * and logs a timeline event.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { event, data, old_data, payload_too_large } = body;

    // If payload was too large, fetch the load
    let load = data;
    if (payload_too_large || !load) {
      const entityId = event?.entity_id;
      if (!entityId) {
        return Response.json({ error: "No entity_id in payload" }, { status: 400 });
      }
      load = await base44.asServiceRole.entities.Load.get(entityId);
    }

    if (!load) {
      return Response.json({ error: "Load not found" }, { status: 404 });
    }

    // Safety: only proceed if status is delivered
    if (load.status !== "delivered") {
      return Response.json({ skipped: true, reason: `status is ${load.status}, not delivered` });
    }

    // Skip if an invoice already exists for this load
    if (load.invoice_id) {
      return Response.json({ skipped: true, reason: "invoice already exists for this load", invoice_id: load.invoice_id });
    }

    const invoiceNum = `INV-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

    const totalAmount = (load.rate || 0) + (load.fuel_surcharge || 0) + (load.accessorial_charges || 0);
    const issueDate = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const invoice = await base44.asServiceRole.entities.Invoice.create({
      invoice_number: invoiceNum,
      load_id: load.id,
      client_id: load.client_id,
      broker_id: load.broker_id,
      driver_id: load.driver_id,
      issue_date: issueDate,
      due_date: dueDate,
      line_haul: load.rate || 0,
      fuel_surcharge: load.fuel_surcharge || 0,
      accessorial_charges: load.accessorial_charges || 0,
      total_amount: totalAmount,
      balance_due: totalAmount,
      status: "draft",
      payment_terms: "net30",
    });

    // Link invoice back to the load
    await base44.asServiceRole.entities.Load.update(load.id, { invoice_id: invoice.id });

    // Log timeline event
    await base44.asServiceRole.entities.Manifest.create({
      load_id: load.id,
      event_type: "invoice_generated",
      event_title: "Draft Invoice Created",
      event_description: `Invoice ${invoiceNum} auto-generated on delivery for $${totalAmount.toLocaleString()}`,
      event_timestamp: new Date().toISOString(),
      is_system_event: true,
    }).catch(() => {});

    console.log(`[createDraftInvoiceOnDelivery] Created ${invoiceNum} for load ${load.id}`);

    return Response.json({ success: true, invoice_id: invoice.id, invoice_number: invoiceNum, total_amount: totalAmount });
  } catch (error) {
    console.error("[createDraftInvoiceOnDelivery]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});