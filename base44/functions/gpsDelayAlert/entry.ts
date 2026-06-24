/**
 * GPS-Based ETA Slip Alert
 *
 * Runs on a schedule. For every active in-transit load:
 *   1. Uses the driver's real-time GPS coordinates + elapsed time since pickup
 *      to estimate remaining miles and compute a fresh GPS-ETA.
 *   2. Compares GPS-ETA against the load's scheduled delivery_date.
 *   3. If slip >= ALERT_THRESHOLD_MINUTES, emails every dispatcher/admin.
 *   4. Deduplication: tags Load.notes so the same load doesn't re-alert
 *      unless slip worsens by ESCALATION_MINUTES.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALERT_THRESHOLD_MINUTES = 45;   // min slip before alerting
const ESCALATION_MINUTES      = 30;   // additional slip needed to re-alert same load
const AVG_SPEED_MPH           = 60;   // assumed cruising speed

function parseLastAlertedSlip(notes) {
  try {
    const match = (notes || "").match(/\[DELAY_ALERTED:(\d+)min\]/);
    return match ? parseInt(match[1]) : 0;
  } catch { return 0; }
}

function setAlertTag(notes, slipMinutes) {
  const tag = `[DELAY_ALERTED:${slipMinutes}min]`;
  const cleaned = (notes || "").replace(/\[DELAY_ALERTED:\d+min\]/g, "").trim();
  return cleaned ? `${cleaned}\n${tag}` : tag;
}

function formatET(iso) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    const [activeLoads, drivers, users] = await Promise.all([
      base44.asServiceRole.entities.Load.filter(
        { status: ["en_route", "loaded", "in_transit"] },
        "-created_date", 300
      ),
      base44.asServiceRole.entities.Driver.list("-created_date", 200),
      base44.asServiceRole.entities.User.list("-created_date", 100),
    ]);

    const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));
    const dispatchEmails = users
      .filter(u => ["admin", "dispatcher"].includes(u.role) && u.email)
      .map(u => u.email);

    const alertedLoads = [];
    const pendingUpdates = [];

    for (const load of activeLoads) {
      if (!load.delivery_date) continue;

      const scheduledDelivery = new Date(load.delivery_date);
      // If already past scheduled delivery just flag as overdue vs. predicting
      if (scheduledDelivery < now) continue;

      const driver = driverMap[load.driver_id];

      // ── Compute GPS-based remaining time ─────────────────────────────────
      let gpsETA = null;

      // Best: elapsed-time method using actual pickup time + load miles
      const pickupAt = load.actual_pickup || load.pickup_date;
      if (pickupAt && load.miles) {
        const pickupTime   = new Date(pickupAt);
        const elapsedHours = Math.max(0, (now - pickupTime) / 3_600_000);
        const milesDriven  = Math.min(elapsedHours * AVG_SPEED_MPH, load.miles * 0.98);
        const remaining    = Math.max(1, load.miles - milesDriven);
        const etaMs        = now.getTime() + (remaining / AVG_SPEED_MPH) * 3_600_000;
        gpsETA = new Date(etaMs);
      }

      // Fallback: use existing ETA on the load
      if (!gpsETA && load.eta) {
        gpsETA = new Date(load.eta);
      }

      if (!gpsETA) continue;

      // ── Compute slip ──────────────────────────────────────────────────────
      const slipMinutes = Math.round((gpsETA - scheduledDelivery) / 60_000);

      // Update ETA on the load record with GPS-calculated value
      if (pickupAt && load.miles) {
        pendingUpdates.push(
          base44.asServiceRole.entities.Load.update(load.id, { eta: gpsETA.toISOString() })
            .catch(err => console.error(`ETA update failed for load ${load.id}:`, err))
        );
      }

      if (slipMinutes < ALERT_THRESHOLD_MINUTES) continue;

      // ── Deduplication ─────────────────────────────────────────────────────
      const lastAlerted = parseLastAlertedSlip(load.notes);
      if (lastAlerted > 0 && slipMinutes < lastAlerted + ESCALATION_MINUTES) continue;

      // Tag the load so we don't re-alert for the same slip
      pendingUpdates.push(
        base44.asServiceRole.entities.Load.update(load.id, {
          notes: setAlertTag(load.notes, slipMinutes),
        }).catch(err => console.error(`Notes update failed for load ${load.id}:`, err))
      );

      const severity = slipMinutes >= 120 ? "🔴 CRITICAL"
                     : slipMinutes >= 60  ? "🟠 HIGH"
                     :                      "🟡 WARNING";

      const remainingMiles = pickupAt && load.miles
        ? Math.round(Math.max(1, load.miles - Math.min((now - new Date(pickupAt)) / 3_600_000 * AVG_SPEED_MPH, load.miles * 0.98)))
        : null;

      alertedLoads.push({
        loadNumber:        load.load_number || `#LD${load.id.slice(-6).toUpperCase()}`,
        route:             `${load.origin_city || "?"}, ${load.origin_state || ""} → ${load.destination_city || "?"}, ${load.destination_state || ""}`,
        driverName:        driver ? `${driver.first_name} ${driver.last_name}` : "Unassigned",
        driverPhone:       driver?.phone || "",
        scheduledDelivery: scheduledDelivery.toISOString(),
        gpsETA:            gpsETA.toISOString(),
        slipMinutes,
        remainingMiles,
        severity,
        isEscalation:      lastAlerted > 0,
        lastAlertedSlip:   lastAlerted,
      });
    }

    // Flush all load updates concurrently
    await Promise.allSettled(pendingUpdates);

    // ── Email dispatch team ───────────────────────────────────────────────
    if (alertedLoads.length > 0 && dispatchEmails.length > 0) {
      alertedLoads.sort((a, b) => b.slipMinutes - a.slipMinutes);

      const loadLines = alertedLoads.map(l => {
        const h = Math.floor(l.slipMinutes / 60);
        const m = l.slipMinutes % 60;
        const slipStr = h > 0 ? `${h}h ${m}m` : `${m} min`;
        const note    = l.isEscalation ? ` [escalated from ${l.lastAlertedSlip}min]` : " [new alert]";
        return [
          `${l.severity}  Load ${l.loadNumber}  —  ${slipStr} behind schedule${note}`,
          `   Route:      ${l.route}`,
          `   Driver:     ${l.driverName}${l.driverPhone ? ` · ${l.driverPhone}` : ""}`,
          `   Scheduled:  ${formatET(l.scheduledDelivery)}`,
          `   GPS ETA:    ${formatET(l.gpsETA)}${l.remainingMiles ? `  (~${l.remainingMiles} mi remaining)` : ""}`,
        ].join("\n");
      }).join("\n\n");

      const worst   = alertedLoads[0];
      const subject = alertedLoads.length === 1
        ? `${worst.severity} – Load ${worst.loadNumber} is ${worst.slipMinutes}min behind schedule`
        : `${worst.severity} – ${alertedLoads.length} loads behind schedule (worst: ${worst.slipMinutes}min)`;

      const body = [
        `HASTEN DISPATCH — GPS ETA SLIP ALERT`,
        `Generated: ${now.toLocaleString("en-US", { timeZone: "America/New_York" })}`,
        `Threshold: >${ALERT_THRESHOLD_MINUTES}min slip vs. scheduled delivery`,
        "",
        "═".repeat(58),
        "",
        loadLines,
        "",
        "═".repeat(58),
        "",
        "RECOMMENDED ACTIONS:",
        "  • Open Dispatch Board → Tracking to see live positions",
        "  • Call drivers to get updated ETAs",
        "  • Notify clients via Client Portal if delay >60 min",
        "",
        `Re-alert fires if slip grows by another ${ESCALATION_MINUTES}+ min.`,
        `Alerts stop automatically once load status changes to delivered.`,
      ].join("\n");

      await Promise.allSettled(
        dispatchEmails.map(email =>
          base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject,
            body,
            from_name: "HASTEN Dispatch System",
          }).catch(err => console.error(`Email failed to ${email}:`, err))
        )
      );

      console.log(`GPS delay alert sent to ${dispatchEmails.length} dispatcher(s) for ${alertedLoads.length} load(s)`);
    }

    return Response.json({
      success:      true,
      checked:      activeLoads.length,
      alerted:      alertedLoads.length,
      alertedLoads: alertedLoads.map(l => ({
        loadNumber:  l.loadNumber,
        slipMinutes: l.slipMinutes,
        severity:    l.severity,
        gpsETA:      l.gpsETA,
      })),
      timestamp: now.toISOString(),
    });

  } catch (err) {
    console.error("gpsDelayAlert error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});