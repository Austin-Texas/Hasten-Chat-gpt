/**
 * Detention Alert
 *
 * Runs every 15 minutes. Scans Manifest events for loads currently sitting at
 * a pickup or delivery location. If the driver has been there for 2+ hours
 * without moving to the next status, email dispatchers and flag potential
 * detention pay on the load.
 *
 * Logic:
 *   - Find the most recent "arrived_pickup" or "arrived_delivery" manifest event
 *     for each load still in a dwell status (arrived_pickup, loaded, arrived_delivery).
 *   - Compute dwell time = now - event_timestamp.
 *   - Alert when dwell >= DETENTION_THRESHOLD_HOURS.
 *   - Deduplication: store a tag in Load.notes so we only re-alert every
 *     ESCALATION_HOURS of additional dwell.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DETENTION_THRESHOLD_HOURS = 2;   // hours at location before alerting
const ESCALATION_HOURS          = 1;   // re-alert interval after first alert
const FREE_TIME_HOURS           = 2;   // standard free time (used in email copy)
const DETENTION_RATE_PER_HOUR   = 75;  // $ per hour for estimated detention pay

function parseLastAlertedHours(notes) {
  try {
    const match = (notes || "").match(/\[DETENTION_ALERTED:(\d+(?:\.\d+)?)h\]/);
    return match ? parseFloat(match[1]) : 0;
  } catch { return 0; }
}

function setDetentionTag(notes, hours) {
  const tag = `[DETENTION_ALERTED:${hours.toFixed(1)}h]`;
  const cleaned = (notes || "").replace(/\[DETENTION_ALERTED:\d+(?:\.\d+)?h\]/g, "").trim();
  return cleaned ? `${cleaned}\n${tag}` : tag;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function fmtHours(h) {
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    // Loads still physically at a location (haven't departed yet)
    const DWELL_STATUSES = ["arrived_pickup", "loaded", "arrived_delivery"];

    const [dwellingLoads, drivers, users, manifests] = await Promise.all([
      base44.asServiceRole.entities.Load.filter(
        { status: DWELL_STATUSES },
        "-updated_date", 300
      ),
      base44.asServiceRole.entities.Driver.list("-created_date", 200),
      base44.asServiceRole.entities.User.list("-created_date", 100),
      // Fetch recent manifest events covering pickup/delivery arrivals
      base44.asServiceRole.entities.Manifest.filter(
        { event_type: ["pickup_arrived", "delivery_arrived", "pickup_completed"] },
        "-event_timestamp", 500
      ),
    ]);

    const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));

    const dispatchEmails = users
      .filter(u => ["admin", "dispatcher"].includes(u.role) && u.email)
      .map(u => u.email);

    // Index manifests by load_id for quick lookup
    const manifestsByLoad = {};
    for (const m of manifests) {
      if (!manifestsByLoad[m.load_id]) manifestsByLoad[m.load_id] = [];
      manifestsByLoad[m.load_id].push(m);
    }

    const alertedLoads = [];
    const pendingUpdates = [];

    for (const load of dwellingLoads) {
      const isAtPickup   = ["arrived_pickup", "loaded"].includes(load.status);
      const isAtDelivery = load.status === "arrived_delivery";

      // ── Find the relevant arrival manifest event ──────────────────────────
      // Primary: use Manifest record for this load
      const loadManifests = (manifestsByLoad[load.id] || []).sort(
        (a, b) => new Date(b.event_timestamp) - new Date(a.event_timestamp)
      );

      const arrivalTypes = isAtPickup
        ? ["pickup_arrived", "pickup_completed"]
        : ["delivery_arrived"];

      const arrivalEvent = loadManifests.find(m => arrivalTypes.includes(m.event_type));

      // Fallback: use load.updated_date if no manifest event found
      // (covers loads whose status was set without a manifest entry)
      const arrivalTimestamp = arrivalEvent?.event_timestamp || load.updated_date;
      if (!arrivalTimestamp) continue;

      const arrivalTime = new Date(arrivalTimestamp);
      const dwellHours  = (now - arrivalTime) / 3_600_000;

      if (dwellHours < DETENTION_THRESHOLD_HOURS) continue;

      // ── Deduplication ─────────────────────────────────────────────────────
      const lastAlertedHours = parseLastAlertedHours(load.notes);
      if (lastAlertedHours > 0 && dwellHours < lastAlertedHours + ESCALATION_HOURS) continue;

      // Tag the load
      pendingUpdates.push(
        base44.asServiceRole.entities.Load.update(load.id, {
          notes: setDetentionTag(load.notes, dwellHours),
        }).catch(err => console.error(`Notes update failed for load ${load.id}:`, err))
      );

      const driver = driverMap[load.driver_id];
      const billableHours  = Math.max(0, dwellHours - FREE_TIME_HOURS);
      const estimatedPay   = Math.round(billableHours * DETENTION_RATE_PER_HOUR);
      const locationType   = isAtPickup ? "Pickup" : "Delivery";
      const locationName   = arrivalEvent?.location_city
        ? `${arrivalEvent.location_city}, ${arrivalEvent.location_state}`
        : isAtPickup
          ? `${load.origin_city}, ${load.origin_state}`
          : `${load.destination_city}, ${load.destination_state}`;

      const severity = dwellHours >= 4 ? "🔴 CRITICAL" : dwellHours >= 3 ? "🟠 HIGH" : "🟡 WARNING";

      alertedLoads.push({
        loadNumber:    load.load_number || `#LD${load.id.slice(-6).toUpperCase()}`,
        loadId:        load.id,
        status:        load.status,
        locationType,
        locationName,
        route:         `${load.origin_city || "?"}, ${load.origin_state || ""} → ${load.destination_city || "?"}, ${load.destination_state || ""}`,
        driverName:    driver ? `${driver.first_name} ${driver.last_name}` : "Unassigned",
        driverPhone:   driver?.phone || "",
        arrivalTime:   arrivalTime.toISOString(),
        dwellHours,
        billableHours,
        estimatedPay,
        severity,
        isEscalation:  lastAlertedHours > 0,
        lastAlertedHours,
        manifestEvent: !!arrivalEvent,
      });
    }

    // Flush load note updates
    await Promise.allSettled(pendingUpdates);

    // ── Email dispatch team ───────────────────────────────────────────────
    if (alertedLoads.length > 0 && dispatchEmails.length > 0) {
      alertedLoads.sort((a, b) => b.dwellHours - a.dwellHours);

      const totalEstimatedPay = alertedLoads.reduce((s, l) => s + l.estimatedPay, 0);

      const loadLines = alertedLoads.map(l => {
        const escalationNote = l.isEscalation
          ? ` [escalated — was ${fmtHours(l.lastAlertedHours)}]`
          : " [new alert]";
        return [
          `${l.severity}  Load ${l.loadNumber}  —  ${fmtHours(l.dwellHours)} at ${l.locationType}${escalationNote}`,
          `   Location:    ${l.locationName}  (${l.locationType})`,
          `   Route:       ${l.route}`,
          `   Driver:      ${l.driverName}${l.driverPhone ? ` · ${l.driverPhone}` : ""}`,
          `   Arrived:     ${fmtTime(l.arrivalTime)}`,
          `   Free Time:   ${FREE_TIME_HOURS}h standard — ${fmtHours(l.billableHours)} billable`,
          `   Est. Detention Pay: $${l.estimatedPay.toLocaleString()} @ $${DETENTION_RATE_PER_HOUR}/hr`,
        ].join("\n");
      }).join("\n\n");

      const worst   = alertedLoads[0];
      const subject = alertedLoads.length === 1
        ? `${worst.severity} – Load ${worst.loadNumber} at ${worst.locationType} for ${fmtHours(worst.dwellHours)} — Detention Flag`
        : `${worst.severity} – ${alertedLoads.length} loads flagged for detention (est. $${totalEstimatedPay.toLocaleString()})`;

      const body = [
        `HASTEN DISPATCH — DETENTION ALERT`,
        `Generated: ${now.toLocaleString("en-US", { timeZone: "America/New_York" })}`,
        `Threshold: >${DETENTION_THRESHOLD_HOURS}h dwell at pickup or delivery location`,
        "",
        "═".repeat(60),
        "",
        loadLines,
        "",
        "═".repeat(60),
        "",
        `TOTAL ESTIMATED DETENTION PAY: $${totalEstimatedPay.toLocaleString()}`,
        `(${FREE_TIME_HOURS}h free time standard · $${DETENTION_RATE_PER_HOUR}/hr thereafter)`,
        "",
        "RECOMMENDED ACTIONS:",
        "  • Call the driver to understand the cause of the delay",
        "  • Contact the facility to request expedited loading/unloading",
        "  • Document detention start time in the load manifest",
        "  • Apply detention charges to the invoice if applicable",
        "",
        `Re-alert fires every ${ESCALATION_HOURS}h of additional dwell.`,
        `Alert clears once the load moves to 'in_transit' or 'delivered'.`,
      ].join("\n");

      await Promise.allSettled(
        dispatchEmails.map(email =>
          base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject,
            body,
            from_name: "HASTEN Dispatch System",
          }).catch(err => console.error(`Detention alert email failed to ${email}:`, err))
        )
      );

      console.log(`Detention alert sent to ${dispatchEmails.length} dispatcher(s) for ${alertedLoads.length} load(s), est. $${totalEstimatedPay} detention`);
    }

    return Response.json({
      success:      true,
      checked:      dwellingLoads.length,
      alerted:      alertedLoads.length,
      alertedLoads: alertedLoads.map(l => ({
        loadNumber:    l.loadNumber,
        locationType:  l.locationType,
        dwellHours:    Math.round(l.dwellHours * 10) / 10,
        estimatedPay:  l.estimatedPay,
        severity:      l.severity,
      })),
      timestamp: now.toISOString(),
    });

  } catch (err) {
    console.error("detentionAlert error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});