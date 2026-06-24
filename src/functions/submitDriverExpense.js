import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { category, amount, description, vendor, location_state, load_id, receipt_url } = await req.json();

    if (!category || !amount || isNaN(parseFloat(amount))) {
      return Response.json({ error: 'Invalid expense data' }, { status: 400 });
    }

    // Get driver record
    const drivers = await base44.asServiceRole.entities.Driver.filter({ user_id: user.id }, "-created_date", 1);
    const driver = drivers[0];

    // Create expense
    const expense = await base44.asServiceRole.entities.Expense.create({
      category,
      amount: parseFloat(amount),
      description,
      vendor,
      location_state,
      load_id,
      driver_id: driver?.id || user.id,
      truck_id: driver?.truck_id,
      date: new Date().toISOString().slice(0, 10),
      receipt_url: receipt_url || null,
      status: "pending",
      is_reimbursable: true,
      approved_by: null,
    });

    // Notify admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" }, "-created_date", 10);
    const loadData = load_id ? await base44.asServiceRole.entities.Load.filter({ id: load_id }, "-created_date", 1) : null;
    const load = loadData?.[0];

    for (const admin of admins) {
      if (admin.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: `💰 New Expense Submission: ${driver?.first_name} ${driver?.last_name} - $${amount}`,
            body: `A new expense requires approval:

Driver: ${driver?.first_name} ${driver?.last_name}
Category: ${category}
Amount: $${parseFloat(amount).toFixed(2)}
Vendor: ${vendor || "—"}
Location: ${location_state || "—"}
Description: ${description || "—"}
Load: ${load?.load_number || (load_id ? `#${load_id.slice(-6)}` : "—")}
Receipt: ${receipt_url ? "✓ Attached" : "Not attached"}

Status: Pending Review
Review in the Expense Approvals dashboard.`,
            from_name: "HASTEN Expense System",
          });
        } catch (err) {
          console.error(`Failed to notify admin ${admin.email}:`, err);
        }
      }
    }

    console.log(
      `Expense submitted: ${category} $${amount} by ${driver?.first_name} ${driver?.last_name}`
    );

    return Response.json({
      success: true,
      expense,
      message: "Expense submitted for approval",
    });
  } catch (error) {
    console.error("Error submitting expense:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});