import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch unpaid invoices
    const invoices = await base44.asServiceRole.entities.Invoice.filter({
      status: ["sent", "viewed", "partial", "overdue"]
    }, "-created_date", 500);

    const clients = await base44.asServiceRole.entities.Client.list("-created_date", 200);
    const loads = await base44.asServiceRole.entities.Load.list("-created_date", 300);

    const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
    const loadMap = Object.fromEntries(loads.map(l => [l.id, l]));

    const now = new Date();
    const remindersToSend = [];
    const remindersSent = [];

    for (const invoice of invoices) {
      if (!invoice.due_date || !invoice.client_id) continue;

      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

      // Send reminders for invoices 1, 7, and 14 days overdue (or more)
      const sendReminder = daysOverdue >= 1 && (daysOverdue === 1 || daysOverdue === 7 || daysOverdue === 14 || daysOverdue % 7 === 0);

      if (sendReminder) {
        const client = clientMap[invoice.client_id];
        if (!client || !client.email) continue;

        const load = invoice.load_id ? loadMap[invoice.load_id] : null;
        const balanceDue = invoice.balance_due || (invoice.total_amount - (invoice.amount_paid || 0));

        remindersToSend.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          clientId: invoice.client_id,
          clientName: client.company_name,
          clientEmail: client.email,
          dueDate: dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          daysOverdue,
          totalAmount: invoice.total_amount || 0,
          balanceDue: balanceDue || 0,
          amountPaid: invoice.amount_paid || 0,
          load,
          invoiceStatus: invoice.status,
        });
      }
    }

    // Send emails
    for (const reminder of remindersToSend) {
      let urgencyLabel = "is due";
      let tone = "friendly";

      if (reminder.daysOverdue === 1) {
        urgencyLabel = "became due yesterday";
        tone = "friendly";
      } else if (reminder.daysOverdue === 7) {
        urgencyLabel = "is now 7 days overdue";
        tone = "gentle_follow_up";
      } else if (reminder.daysOverdue >= 14) {
        urgencyLabel = `is now ${reminder.daysOverdue} days overdue`;
        tone = "urgent";
      }

      let emailBody = "";

      if (tone === "friendly") {
        emailBody = `Hi ${reminder.clientName},

I hope you're having a great day! I wanted to give you a friendly reminder that Invoice #${reminder.invoiceNumber} ${urgencyLabel}.

${reminder.load ? `Load Details:
  Route: ${reminder.load.origin_city}, ${reminder.load.origin_state} → ${reminder.load.destination_city}, ${reminder.load.destination_state}
  Tracking: ${reminder.load.load_number || "N/A"}

` : ""}Invoice Details:
  Invoice Number: ${reminder.invoiceNumber}
  Due Date: ${reminder.dueDate}
  Total Amount: $${reminder.totalAmount.toLocaleString()}
  Amount Paid: $${reminder.amountPaid.toLocaleString()}
  Balance Due: $${reminder.balanceDue.toLocaleString()}

If you've already sent payment, please disregard this message. If you have any questions about this invoice, feel free to reach out.

Thank you for your business!

Best regards,
HASTEN Logistics Team`;
      } else if (tone === "gentle_follow_up") {
        emailBody = `Hi ${reminder.clientName},

Just following up on Invoice #${reminder.invoiceNumber}, which ${urgencyLabel}. We haven't received payment yet.

${reminder.load ? `Load Details:
  Route: ${reminder.load.origin_city}, ${reminder.load.origin_state} → ${reminder.load.destination_city}, ${reminder.load.destination_state}

` : ""}Current Status:
  Balance Due: $${reminder.balanceDue.toLocaleString()}
  Due Since: ${reminder.dueDate}

If there are any issues or concerns preventing payment, please let us know so we can help resolve them. We're happy to discuss payment terms if needed.

Please arrange payment at your earliest convenience.

Thank you,
HASTEN Logistics Team`;
      } else if (tone === "urgent") {
        emailBody = `Hi ${reminder.clientName},

PAYMENT REQUIRED

Invoice #${reminder.invoiceNumber} is now ${reminder.daysOverdue} days overdue and requires immediate payment.

${reminder.load ? `Load Reference:
  Route: ${reminder.load.origin_city}, ${reminder.load.origin_state} → ${reminder.load.destination_city}, ${reminder.load.destination_state}

` : ""}Amount Due: $${reminder.balanceDue.toLocaleString()}
Original Due Date: ${reminder.dueDate}

Please submit payment immediately to bring your account current. If you have already sent payment, please disregard this message and provide us with payment confirmation details.

If you're experiencing difficulties with payment, please contact us right away so we can work out a solution.

HASTEN Logistics Team`;
      }

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: reminder.clientEmail,
        subject: reminder.daysOverdue === 1
          ? `Payment Reminder: Invoice #${reminder.invoiceNumber} Now Due`
          : reminder.daysOverdue === 7
          ? `Payment Follow-Up: Invoice #${reminder.invoiceNumber} (7 Days Overdue)`
          : `URGENT: Invoice #${reminder.invoiceNumber} (${reminder.daysOverdue} Days Overdue)`,
        body: emailBody,
        from_name: "HASTEN Logistics",
      }).then(() => {
        remindersSent.push(reminder.invoiceNumber);
      }).catch(err => {
        console.error(`Failed to send reminder for invoice ${reminder.invoiceNumber} to ${reminder.clientEmail}:`, err);
      });
    }

    return Response.json({
      success: true,
      remindersChecked: invoices.filter(i => i.due_date).length,
      remindersSent: remindersSent.length,
      invoices: remindersSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending overdue invoice reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});