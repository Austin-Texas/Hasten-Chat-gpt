import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Building2, Phone, Mail, AlertCircle, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function DriverCompanies({ user }) {
  const navigate = useNavigate();
  const [driver, setDriver]     = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const drivers = await base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1);
        if (!drivers.length) { setLoading(false); return; }
        const d = drivers[0];
        setDriver(d);

        // Pull clients/brokers assigned to this driver via dispatcher_id or direct match
        const [clients] = await Promise.all([
          base44.entities.Client.filter({ status: "active" }, "-created_date", 100),
        ]);

        // Build relationship list:
        // 1. Dispatcher's company (from dispatcher_id → User lookup is not possible, so we show the assigned company from loads)
        // 2. Clients this driver has delivered for
        const loads = await base44.entities.Load.filter({ driver_id: d.id }, "-created_date", 200);
        const clientIdSet = new Set();
        loads.forEach(l => {
          if (l.client_id) clientIdSet.add(l.client_id);
          if (l.broker_id) clientIdSet.add(l.broker_id);
        });

        const assigned = clients.filter(c => clientIdSet.has(c.id));

        // If dispatcher_id points to a client record, include it too
        if (d.dispatcher_id) {
          const dispClients = await base44.entities.Client.filter({ id: d.dispatcher_id }, "", 1);
          dispClients.forEach(c => {
            if (!clientIdSet.has(c.id)) assigned.unshift({ ...c, _isPrimary: true });
          });
        }

        setCompanies(assigned);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 pb-28 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-2">
        <button onClick={() => navigate("/driver/profile")} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">My Companies</h1>
        <div className="w-9" />
      </div>

      {/* Info banner */}
      <div className="rounded-xl p-4 border border-blue-500/20 bg-blue-500/5">
        <p className="text-blue-300 text-xs">Companies and brokers you've worked with, based on your load history.</p>
      </div>

      {companies.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 border border-white/5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-slate-600" />
          </div>
          <p className="text-slate-300 font-semibold text-sm">No companies found</p>
          <p className="text-slate-600 text-xs mt-1">Companies will appear here after completing loads</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map(c => {
            const initials = (c.company_name || "?")
              .split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
            const isActive = c.status === "active";
            const isPrimary = c._isPrimary;

            return (
              <div
                key={c.id}
                className="glass-card rounded-2xl border border-white/5 p-4"
                style={isPrimary ? { borderColor: "rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.04)" } : {}}
              >
                <div className="flex items-start gap-4">
                  {/* Initials avatar */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                    style={{
                      background: isPrimary
                        ? "linear-gradient(135deg, rgba(234,88,12,0.25), rgba(249,115,22,0.1))"
                        : "rgba(59,130,246,0.1)",
                      border: isPrimary ? "1px solid rgba(234,88,12,0.3)" : "1px solid rgba(59,130,246,0.2)",
                      color: isPrimary ? "#F97316" : "#60A5FA",
                    }}
                  >
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-white font-semibold text-sm">{c.company_name}</div>
                        {c.type && (
                          <div className="text-slate-500 text-xs capitalize mt-0.5">{c.type}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isActive
                          ? <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold"><CheckCircle className="w-2.5 h-2.5" />Active</span>
                          : <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500 text-[10px] font-bold"><XCircle className="w-2.5 h-2.5" />Inactive</span>
                        }
                      </div>
                    </div>

                    {/* Contact info */}
                    <div className="mt-3 space-y-2">
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white active:text-orange-400 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white active:text-orange-400 transition-colors truncate"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </a>
                      )}
                      {c.city && (
                        <div className="text-xs text-slate-600">
                          {c.city}{c.state ? `, ${c.state}` : ""}
                        </div>
                      )}
                    </div>

                    {isPrimary && (
                      <div className="mt-2 px-2 py-1 rounded-lg bg-orange-500/8 border border-orange-500/15 text-orange-400 text-[10px] font-bold w-fit">
                        PRIMARY CARRIER
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}