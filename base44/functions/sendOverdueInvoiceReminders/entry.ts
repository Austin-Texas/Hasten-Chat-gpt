/**
 * sendOverdueInvoiceReminders — runs daily at 9 AM
 * Finds overdue invoices and sends reminders to clients/brokers
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find all overdue or near-due invoices
    const invoices = await base44.asServiceRole.entities.Invoice.list("-created_date", 100).catch(() => []);
    
    const today = new Date();
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status === "paid" || inv.status === "void") return false;
      const dueDate = new Date(inv.due_date);
      return dueDate < today;
    });

    const dueSoonInvoices = invoices.filter(inv => {
      if (inv.status === "paid" || inv.status === "void") return false;
      const dueDate = new Date(inv.due_date);
      const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
      return dueDate <= threeDaysFromNow && dueDate >= today;
    });

    let reminded = 0;

    // Process overdue invoices
    for (const inv of overdueInvoices) {
      const daysOverdue = Math.floor((today - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
      
      // Send notification
      await base44.asServiceRole.entities.Notification.create({
        user_id: inv.client_id || inv.broker_id || "system",
        role: "client",
        title: `OVERDUE: Invoice ${inv.invoice_number}`,
        message: `Invoice ${inv.invoice_number} is ${daysOverdue} days overdue. Amount due: $${(inv.balance_due || inv.total_amount).toLocaleString()}`,
        type: "invoice_overdue",
        priority: "critical",
        related_entity_type: "Invoice",
        related_entity_id: inv.id,
        delivery_channels: ["in_app", "email"],
        action_url: `/crm`,
        cta_label: "View Invoice",
      }).catch(e => console.error("[notification]", e.message));

      // Update invoice status if not already overdue
      if (inv.status !== "overdue") {
        await base44.asServiceRole.entities.Invoice.update(inv.id, { status: "overdue" }).catch(() => {});
      }

      reminded++;
    }

    // Process due-soon invoices (optional: lighter reminder)
    for (const inv of dueSoonInvoices.slice(0, 10)) {
      const daysUntilDue = Math.floor((new Date(inv.due_date) - today) / (1000 * 60 * 60 * 24));
      
      await base44.asServiceRole.entities.Notification.create({
        user_id: inv.client_id || inv.broker_id || "system",
        role: "client",
        title: `Invoice ${inv.invoice_number} Due in ${daysUntilDue} Days`,
        message: `Please remit payment by ${new Date(inv.due_date).toLocaleDateString()}. Amount: $${(inv.balance_due || inv.total_amount).toLocaleString()}`,
        type: "invoice_payment",
        priority: "normal",
        related_entity_type: "Invoice",
        related_entity_id: inv.id,
        delivery_channels: ["in_app"],
      }).catch(() => {});
    }

    return Response.json({ 
      overdue_invoices: overdueInvoices.length,
      due_soon_invoices: dueSoonInvoices.length,
      reminded 
    });
  } catch (error) {
    console.error("[sendOverdueInvoiceReminders]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});