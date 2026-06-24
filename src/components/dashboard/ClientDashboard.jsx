import { Link } from "react-router-dom";
import { Package, DollarSign, FileText, MapPin, ChevronRight, Clock } from "lucide-react";
import KpiCard from "@/components/hasten/KpiCard";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function ClientDashboard({ loads, invoices, currentUser }) {
  const clientLoads = loads.filter(l => l.client_id === currentUser?.id);
  const activeLoads = clientLoads.filter(l => ["in_transit", "en_route", "arrived_pickup", "loaded", "arrived_delivery"].includes(l.status));
  const completedLoads = clientLoads.filter(l => l.status === "completed").length;
  const clientInvoices = invoices.filter(i => i.client_id === currentUser?.id);
  const pendingInvoices = clientInvoices.filter(i => i.status === "sent" || i.status === "viewed").length;
  const paidInvoices = clientInvoices.filter(i => i.status === "paid").length;

  const totalSpent = clientInvoices
    .filter(i => i.status === "paid")
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">My Shipments</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track your loads and manage invoices</p>
        </div>
        <Link
          to="/client/tracking"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
        >
          View Tracking
        </Link>
      </div>

      {/* Client KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Loads" value={activeLoads.length} icon={Package} color="orange" />
        <KpiCard label="Completed" value={completedLoads} icon={Package} color="green" />
        <KpiCard label="Pending Invoices" value={pendingInvoices} icon={FileText} color="blue" />
        <KpiCard label="Total Spent" value={`$${(totalSpent / 1000).toFixed(1)}k`} icon={DollarSign} color="cyan" />
      </div>

      {/* Active Shipments */}
      <div className="glass-card rounded-xl border border-white/5">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-white font-heading font-semibold">Active Shipments</h2>
          <Link to="/client/tracking" className="text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1 transition-colors">
            Track All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {activeLoads.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No active shipments</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {activeLoads.slice(0, 5).map(load => (
              <Link
                key={load.id}
                to={`/client/tracking?load=${load.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-orange-400 font-mono text-xs font-bold">
                      {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                    </span>
                    <StatusBadge status={load.status} />
                  </div>
                  <div className="text-slate-300 text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{load.origin_city}</span>
                    <span className="text-slate-600">→</span>
                    <span>{load.destination_city}</span>
                  </div>
                </div>
                {load.eta && (
                  <div className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(load.eta).toLocaleDateString()}
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Invoices */}
      <div className="glass-card rounded-xl border border-white/5">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-white font-heading font-semibold">Invoices</h2>
          <Link to="/client/invoices" className="text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1 transition-colors">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {clientInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No invoices yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {clientInvoices.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-slate-300 font-medium text-sm">INV-{inv.id?.slice(-8).toUpperCase()}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="text-slate-500 text-xs">
                    {new Date(inv.created_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-green-400 font-bold text-sm flex-shrink-0">
                  ${(inv.total || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}