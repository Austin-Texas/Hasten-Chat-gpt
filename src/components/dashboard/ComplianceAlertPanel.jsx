import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, ShieldAlert, ChevronRight } from "lucide-react";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function getExpiryStatus(dateStr) {
  if (!dateStr) return { level: "none", daysLeft: null };
  const now = Date.now();
  const exp = new Date(dateStr).getTime();
  const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (exp < now) return { level: "expired", daysLeft };
  if (exp < now + THIRTY_DAYS) return { level: "expiring", daysLeft };
  return { level: "valid", daysLeft };
}

export default function ComplianceAlertPanel({ drivers = [] }) {
  const atRisk = useMemo(() => {
    return drivers
      .map(d => {
        const license = getExpiryStatus(d.license_expiry);
        const medical = getExpiryStatus(d.medical_expiry);
        const twic = getExpiryStatus(d.twic_expiry);

        // Determine highest severity
        let severity = "valid";
        if (license.level === "expired" || medical.level === "expired" || twic.level === "expired") {
          severity = "expired";
        } else if (license.level === "expiring" || medical.level === "expiring" || twic.level === "expiring") {
          severity = "expiring";
        }

        const issues = [];
        if (license.level !== "valid" && license.level !== "none") {
          issues.push({ type: "License", ...license });
        }
        if (medical.level !== "valid" && medical.level !== "none") {
          issues.push({ type: "Medical Card", ...medical });
        }
        if (twic.level !== "valid" && twic.level !== "none") {
          issues.push({ type: "TWIC", ...twic });
        }

        return {
          driver: d,
          severity,
          issues,
          minDays: Math.min(
            ...issues.map(i => i.daysLeft),
            Infinity
          ),
        };
      })
      .filter(item => item.severity === "expired" || item.severity === "expiring")
      .sort((a, b) => a.minDays - b.minDays);
  }, [drivers]);

  const expiredCount = atRisk.filter(a => a.severity === "expired").length;
  const expiringCount = atRisk.filter(a => a.severity === "expiring").length;

  if (atRisk.length === 0) {
    return (
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-green-400" />
          <h2 className="text-white font-heading font-semibold">Compliance Alerts</h2>
        </div>
        <div className="flex items-center gap-3 py-6 justify-center">
          <div className="text-green-400 text-sm font-medium">✓ All driver credentials are current</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl border border-red-500/20 overflow-hidden">
      {/* Header with severity counts */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-red-500/5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <h2 className="text-white font-heading font-semibold">Compliance Alerts</h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {expiredCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 font-bold">
              <AlertTriangle className="w-3 h-3" /> {expiredCount} Expired
            </span>
          )}
          {expiringCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 font-bold">
              <Clock className="w-3 h-3" /> {expiringCount} Expiring
            </span>
          )}
        </div>
      </div>

      {/* At-risk driver list */}
      <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
        {atRisk.map(({ driver, severity, issues }) => {
          const isExpired = severity === "expired";
          const bgColor = isExpired
            ? "bg-red-500/8 hover:bg-red-500/12 border-l-red-500"
            : "bg-amber-500/5 hover:bg-amber-500/10 border-l-amber-500";

          return (
            <Link
              key={driver.id}
              to={`/drivers/${driver.id}`}
              className={`flex items-center gap-3 p-4 border-l-2 ${bgColor} transition-colors group`}
            >
              {/* Avatar / initial */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                isExpired ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
              }`}>
                {driver.first_name?.[0] || "?"}{driver.last_name?.[0] || ""}
              </div>

              {/* Name + issues */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm truncate">
                    {driver.first_name} {driver.last_name}
                  </span>
                  {isExpired ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0">
                      EXPIRED
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                      EXPIRING
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {issues.map((issue, i) => (
                    <span
                      key={i}
                      className={`text-[11px] flex items-center gap-1 ${
                        issue.level === "expired" ? "text-red-400" : "text-amber-400"
                      }`}
                    >
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {issue.type}
                      {issue.daysLeft < 0
                        ? ` (${Math.abs(issue.daysLeft)}d overdue)`
                        : ` (${issue.daysLeft}d left)`}
                    </span>
                  ))}
                </div>
              </div>

              {/* Driver status */}
              <div className="text-right flex-shrink-0">
                <div className="text-slate-500 text-[10px] uppercase tracking-wider">Status</div>
                <div className="text-slate-300 text-xs font-medium capitalize">
                  {driver.status?.replace(/_/g, " ") || "—"}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-red-400 transition-colors flex-shrink-0" />
            </Link>
          );
        })}
      </div>

      {/* Footer link */}
      <Link
        to="/compliance"
        className="flex items-center justify-center gap-1 py-3 text-center text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors border-t border-white/5"
      >
        View Full Compliance Center <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}