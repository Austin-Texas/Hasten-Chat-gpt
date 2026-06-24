import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  AlertTriangle, CheckCircle, RefreshCw, Bell, Wrench,
  Shield, ClipboardCheck, Gauge, ChevronDown, ChevronUp
} from "lucide-react";

const ALERT_CONFIG = {
  SERVICE_OVERDUE:       { icon: Wrench,        color: "red",    label: "Service Overdue" },
  SERVICE_DUE_SOON:      { icon: Wrench,        color: "amber",  label: "Service Due Soon" },
  INSURANCE_EXPIRED:     { icon: Shield,        color: "red",    label: "Insurance Expired" },
  INSURANCE_EXPIRING:    { icon: Shield,        color: "amber",  label: "Insurance Expiring" },
  REGISTRATION_EXPIRED:  { icon: ClipboardCheck,color: "red",    label: "Registration Expired" },
  REGISTRATION_EXPIRING: { icon: ClipboardCheck,color: "amber",  label: "Registration Expiring" },
  INSPECTION_EXPIRED:    { icon: AlertTriangle, color: "red",    label: "Inspection Expired" },
  INSPECTION_EXPIRING:   { icon: AlertTriangle, color: "amber",  label: "Inspection Expiring" },
};

const COLOR_MAP = {
  red:   { badge: "bg-red-500/10 border-red-500/20 text-red-400",   dot: "bg-red-400",   icon: "text-red-400" },
  amber: { badge: "bg-amber-500/10 border-amber-500/20 text-amber-400", dot: "bg-amber-400", icon: "text-amber-400" },
};

function computeAlerts(trucks) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const in30 = new Date(today); in30.setDate(today.getDate() + 30);
  const in30Str = in30.toISOString().split("T")[0];

  const alerts = [];

  for (const truck of trucks) {
    if (truck.status === "sold") continue;
    const label = `Unit #${truck.unit_number} — ${truck.year || ""} ${truck.make || ""} ${truck.model || ""}`.trim();

    // Service mileage
    if (truck.next_service_miles && truck.odometer) {
      const remaining = truck.next_service_miles - truck.odometer;
      if (remaining <= 0) {
        alerts.push({ truckId: truck.id, truck: label, type: "SERVICE_OVERDUE", detail: `Overdue by ${Math.abs(remaining).toLocaleString()} mi`, odometer: truck.odometer });
      } else if (remaining <= 2500) {
        alerts.push({ truckId: truck.id, truck: label, type: "SERVICE_DUE_SOON", detail: `${remaining.toLocaleString()} mi until service`, odometer: truck.odometer });
      }
    }

    // Insurance
    if (truck.insurance_expiry) {
      if (truck.insurance_expiry < todayStr) {
        alerts.push({ truckId: truck.id, truck: label, type: "INSURANCE_EXPIRED", detail: `Expired ${truck.insurance_expiry}` });
      } else if (truck.insurance_expiry <= in30Str) {
        const days = Math.ceil((new Date(truck.insurance_expiry) - today) / 86400000);
        alerts.push({ truckId: truck.id, truck: label, type: "INSURANCE_EXPIRING", detail: `Expires in ${days}d on ${truck.insurance_expiry}` });
      }
    }

    // Registration
    if (truck.registration_expiry) {
      if (truck.registration_expiry < todayStr) {
        alerts.push({ truckId: truck.id, truck: label, type: "REGISTRATION_EXPIRED", detail: `Expired ${truck.registration_expiry}` });
      } else if (truck.registration_expiry <= in30Str) {
        const days = Math.ceil((new Date(truck.registration_expiry) - today) / 86400000);
        alerts.push({ truckId: truck.id, truck: label, type: "REGISTRATION_EXPIRING", detail: `Expires in ${days}d on ${truck.registration_expiry}` });
      }
    }

    // Annual inspection
    if (truck.annual_inspection_expiry) {
      if (truck.annual_inspection_expiry < todayStr) {
        alerts.push({ truckId: truck.id, truck: label, type: "INSPECTION_EXPIRED", detail: `Expired ${truck.annual_inspection_expiry}` });
      } else if (truck.annual_inspection_expiry <= in30Str) {
        const days = Math.ceil((new Date(truck.annual_inspection_expiry) - today) / 86400000);
        alerts.push({ truckId: truck.id, truck: label, type: "INSPECTION_EXPIRING", detail: `Expires in ${days}d on ${truck.annual_inspection_expiry}` });
      }
    }
  }

  return alerts;
}

export default function FleetAlertsPanel() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [filterType, setFilterType] = useState("all"); // all | critical | warning

  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Truck.list("-created_date", 200);
      setTrucks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrucks(); }, []);

  const alerts = computeAlerts(trucks);
  const criticalAlerts = alerts.filter(a => a.type.includes("EXPIRED") || a.type.includes("OVERDUE"));
  const warningAlerts = alerts.filter(a => !a.type.includes("EXPIRED") && !a.type.includes("OVERDUE"));

  const displayed = filterType === "critical" ? criticalAlerts
    : filterType === "warning" ? warningAlerts
    : alerts;

  const triggerEmailAlert = async () => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await base44.functions.invoke("fleetAlerts", {});
      setTriggerResult(res.data);
    } catch (err) {
      setTriggerResult({ error: err.message });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            criticalAlerts.length > 0 ? "bg-red-500/10 border border-red-500/20" : alerts.length > 0 ? "bg-amber-500/10 border border-amber-500/20" : "bg-green-500/10 border border-green-500/20"
          }`}>
            {criticalAlerts.length > 0
              ? <AlertTriangle className="w-4 h-4 text-red-400" />
              : alerts.length > 0
              ? <AlertTriangle className="w-4 h-4 text-amber-400" />
              : <CheckCircle className="w-4 h-4 text-green-400" />
            }
          </div>
          <div>
            <h2 className="text-white font-heading font-semibold text-sm">Fleet Compliance Alerts</h2>
            <p className="text-slate-500 text-xs">
              {loading ? "Loading…"
                : alerts.length === 0 ? "All trucks compliant"
                : `${criticalAlerts.length} critical · ${warningAlerts.length} warnings`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual email trigger */}
          <button
            onClick={triggerEmailAlert}
            disabled={triggering}
            title="Send alert email to all fleet managers now"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
          >
            {triggering
              ? <RefreshCw className="w-3 h-3 animate-spin" />
              : <Bell className="w-3 h-3" />}
            {triggering ? "Sending…" : "Email Managers"}
          </button>
          <button onClick={fetchTrucks} title="Refresh" className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-400" : ""}`} />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Email trigger feedback */}
      {triggerResult && (
        <div className={`px-5 py-2.5 text-xs border-b border-white/5 flex items-center gap-2 ${triggerResult.error ? "text-red-400 bg-red-500/5" : "text-green-400 bg-green-500/5"}`}>
          {triggerResult.error
            ? <><AlertTriangle className="w-3.5 h-3.5" /> Error: {triggerResult.error}</>
            : triggerResult.alerts === 0
            ? <><CheckCircle className="w-3.5 h-3.5" /> No alerts today — no email sent</>
            : <><CheckCircle className="w-3.5 h-3.5" /> Sent {triggerResult.alerts} alert{triggerResult.alerts !== 1 ? "s" : ""} to {triggerResult.notified} manager{triggerResult.notified !== 1 ? "s" : ""}</>
          }
        </div>
      )}

      {expanded && (
        <>
          {/* Filter tabs */}
          {alerts.length > 0 && (
            <div className="flex gap-1 px-5 pt-4">
              {[
                { key: "all", label: `All (${alerts.length})` },
                { key: "critical", label: `Critical (${criticalAlerts.length})`, color: "red" },
                { key: "warning", label: `Warnings (${warningAlerts.length})`, color: "amber" },
              ].map(tab => (
                <button key={tab.key} onClick={() => setFilterType(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    filterType === tab.key
                      ? tab.color === "red" ? "bg-red-500/15 border-red-500/30 text-red-400"
                        : tab.color === "amber" ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                        : "bg-orange-500/15 border-orange-500/30 text-orange-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Alerts list */}
          <div className="p-4 space-y-2">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-lg" />)
            ) : displayed.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle className="w-8 h-8 text-green-500/40 mx-auto mb-2" />
                <p className="text-slate-400 text-sm font-medium">
                  {alerts.length === 0 ? "All trucks are compliant" : "No alerts in this category"}
                </p>
                <p className="text-slate-600 text-xs mt-1">
                  {alerts.length === 0 ? "Daily check runs at 11:00 AM · Alerts sent by email" : ""}
                </p>
              </div>
            ) : displayed.map((alert, i) => {
              const cfg = ALERT_CONFIG[alert.type] || {};
              const colors = COLOR_MAP[cfg.color] || COLOR_MAP.amber;
              const Icon = cfg.icon || AlertTriangle;
              const isCritical = alert.type.includes("EXPIRED") || alert.type.includes("OVERDUE");
              return (
                <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${colors.badge} transition-colors`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isCritical ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                    <Icon className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-xs font-semibold">{cfg.label || alert.type}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${isCritical ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                        {isCritical ? "Critical" : "Warning"}
                      </span>
                    </div>
                    <div className="text-slate-300 text-xs mt-0.5 font-mono">{alert.truck}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{alert.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-5 pb-4 flex items-center gap-2 text-xs text-slate-600">
            <Bell className="w-3 h-3" />
            <span>Automated emails run daily at 11:00 AM · Monitors service mileage, insurance, registration & inspections</span>
          </div>
        </>
      )}
    </div>
  );
}