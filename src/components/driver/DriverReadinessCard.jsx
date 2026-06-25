import { AlertCircle, CheckCircle, FileText, ShieldCheck, Truck } from "lucide-react";
import { getDriverReadiness, normalizeDriverProfile, readinessClass } from "@/lib/driverReadiness";

export default function DriverReadinessCard({ user, driver, truck }) {
  const profile = normalizeDriverProfile(user, driver);
  const readiness = getDriverReadiness(profile);
  const missing = readiness.missing || [];

  return (
    <div className={`rounded-2xl border p-4 ${readinessClass(readiness.level)}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-current/20 bg-black/10">
          {readiness.level === "ready" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-white">Driver Readiness</h3>
            <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {readiness.label}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-90">{readiness.message}</p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <ReadinessFact icon={<Truck className="h-3.5 w-3.5" />} label="Equipment" value={profile.vehicle_type || truck?.type || "Not set"} />
            <ReadinessFact icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Compliance" value={profile.compliance_status || "Needs review"} />
            <ReadinessFact icon={<FileText className="h-3.5 w-3.5" />} label="Payload" value={profile.max_payload ? `${Number(profile.max_payload).toLocaleString()} lbs` : "Missing"} />
            <ReadinessFact icon={<CheckCircle className="h-3.5 w-3.5" />} label="Availability" value={profile.availability || profile.status || "Unknown"} />
          </div>

          {missing.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {missing.map((item) => (
                <span key={item} className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-[10px] font-semibold text-white/90">
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReadinessFact({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-2">
      <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-70">{icon}{label}</div>
      <div className="truncate font-semibold text-white">{value}</div>
    </div>
  );
}
