import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { buildDriverReadinessRows, buildDriverReadinessSummary } from "@/lib/complianceReadiness";
import { readinessClass } from "@/lib/driverReadiness";

function driverName(driver = {}) {
  return driver.full_name || driver.name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "Driver";
}

export default function DriverReadinessPanel({ drivers = [], search = "", filter = "all" }) {
  const summary = buildDriverReadinessSummary(drivers);
  const rows = buildDriverReadinessRows(drivers, search, filter);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Drivers" value={summary.total} icon={<ShieldCheck className="h-4 w-4 text-blue-400" />} />
        <Metric label="Ready" value={summary.ready} icon={<CheckCircle2 className="h-4 w-4 text-green-400" />} />
        <Metric label="Review" value={summary.warning} icon={<AlertTriangle className="h-4 w-4 text-amber-400" />} />
        <Metric label="Setup" value={summary.blocked} icon={<XCircle className="h-4 w-4 text-red-400" />} />
      </div>

      <div className="space-y-3">
        {rows.map((driver) => {
          const missing = driver.readiness?.missing || [];
          return (
            <div key={driver.id} className="glass-card rounded-xl border border-white/5 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{driverName(driver)}</h3>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${readinessClass(driver.readiness?.level)}`}>
                      {driver.readiness?.label || "Needs Review"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{driver.email || driver.phone || "No contact"}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{driver.vehicle_type || "Equipment missing"}</span>
                    <span>{driver.max_payload ? `${Number(driver.max_payload).toLocaleString()} lbs` : "Payload missing"}</span>
                    <span>{driver.availability || driver.status || "Availability unknown"}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">{driver.readiness?.message}</p>
                  {missing.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {missing.map((item) => (
                        <span key={item} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300">{item}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, icon }) {
  return (
    <div className="glass-card rounded-xl border border-white/5 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
