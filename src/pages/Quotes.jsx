import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Check, X, Clock, MapPin, Package, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    fetchQuotes();
    const unsub = base44.entities.QuoteRequest.subscribe(() => fetchQuotes());
    return unsub;
  }, []);

  const fetchQuotes = () => {
    base44.entities.QuoteRequest.list("-created_date", 100)
      .then(setQuotes)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const filtered = quotes.filter(q => filter === "all" ? true : q.status === filter);

  const stats = {
    pending: quotes.filter(q => q.status === "pending").length,
    quoted: quotes.filter(q => q.status === "quoted").length,
    approved: quotes.filter(q => q.status === "approved").length,
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Quote Requests</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage incoming shipping quote requests</p>
      </div>

      {/* Test Data Panel */}
      {quotes.length === 0 && (
        <div className="glass-card rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-amber-400 font-semibold text-sm">No quote requests yet</p>
              <p className="text-slate-400 text-xs mt-1">Create sample quotes for testing:</p>
            </div>
            <button
              onClick={async () => {
                for (let i = 0; i < 5; i++) {
                  await base44.entities.QuoteRequest.create({
                    status: ["pending", "quoted", "approved"][i % 3],
                    requester_name: `Shipper ${i + 1}`,
                    requester_email: `shipper${i + 1}@example.com`,
                    requester_phone: `555-${String(1000 + i).padStart(4, '0')}`,
                    company_name: `Company ${i + 1}`,
                    origin_city: ["Denver", "Dallas", "Chicago", "Atlanta", "Boston"][i],
                    origin_state: ["CO", "TX", "IL", "GA", "MA"][i],
                    origin_zip: String(80000 + i * 100),
                    destination_city: ["Los Angeles", "New York", "Phoenix", "Houston", "Seattle"][i],
                    destination_state: ["CA", "NY", "AZ", "TX", "WA"][i],
                    destination_zip: String(90000 + i * 100),
                    pickup_date: new Date(Date.now() + i * 86400000).toISOString(),
                    delivery_date: new Date(Date.now() + (i + 3) * 86400000).toISOString(),
                    equipment_type: ["Dry Van", "Flatbed", "Reefer"][i % 3],
                    commodity: ["General Cargo", "Refrigerated", "Hazmat"][i % 3],
                    weight: Math.floor(Math.random() * 40000) + 5000,
                    pieces: Math.floor(Math.random() * 20) + 1,
                    is_hazmat: Math.random() > 0.7,
                    estimated_miles: Math.floor(Math.random() * 2000) + 300,
                  });
                }
                setTimeout(fetchQuotes, 500);
              }}
              className="text-xs px-3 py-1.5 rounded bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors whitespace-nowrap"
            >
              Create Test Quotes
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Requests</div>
          <div className="text-2xl font-bold text-white">{quotes.length}</div>
          <div className="text-slate-500 text-xs mt-1">all time</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Pending</div>
          <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
          <div className="text-slate-500 text-xs mt-1">awaiting quote</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Quoted</div>
          <div className="text-2xl font-bold text-blue-400">{stats.quoted}</div>
          <div className="text-slate-500 text-xs mt-1">sent to client</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Approved</div>
          <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
          <div className="text-slate-500 text-xs mt-1">converted to loads</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: "pending", label: "Pending", count: stats.pending },
          { key: "quoted", label: "Quoted", count: stats.quoted },
          { key: "approved", label: "Approved", count: stats.approved },
          { key: "all", label: "All", count: quotes.length },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.key ? "bg-orange-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}>
            {f.label} {f.count > 0 && `(${f.count})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl border border-white/5 p-8 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No quotes in this category</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
          {filtered.map(quote => {
            const isExpanded = expandedId === quote.id;
            return (
              <div key={quote.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : quote.id)}
                  className="w-full p-5 text-left hover:bg-white/2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white font-semibold">{quote.company_name || quote.requester_name}</span>
                        <StatusBadge status={quote.status} />
                      </div>
                      <div className="flex items-center gap-4 text-slate-400 text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {quote.origin_city}, {quote.origin_state} → {quote.destination_city}, {quote.destination_state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {quote.equipment_type}
                        </span>
                        {quote.pickup_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(quote.pickup_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-white/5 space-y-4">
                    {/* Details Grid */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Contact</div>
                        <div className="space-y-0.5">
                          <div className="text-white text-sm font-medium">{quote.requester_name}</div>
                          <div className="text-slate-400 text-xs">{quote.requester_email}</div>
                          <div className="text-slate-400 text-xs">{quote.requester_phone}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Cargo</div>
                        <div className="space-y-0.5 text-sm">
                          <div className="text-white">{quote.weight ? `${quote.weight} lbs` : "—"} {quote.pieces ? `• ${quote.pieces} pieces` : ""}</div>
                          <div className="text-slate-400">{quote.commodity || "Not specified"}</div>
                          {quote.is_hazmat && <div className="text-red-400 text-xs font-semibold">⚠ HAZMAT</div>}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Pickup</div>
                        <div className="space-y-0.5 text-sm">
                          <div className="text-white">{quote.origin_city}, {quote.origin_state} {quote.origin_zip}</div>
                          <div className="text-slate-400">{quote.pickup_date ? new Date(quote.pickup_date).toLocaleDateString() : "—"}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Delivery</div>
                        <div className="space-y-0.5 text-sm">
                          <div className="text-white">{quote.destination_city}, {quote.destination_state} {quote.destination_zip}</div>
                          <div className="text-slate-400">{quote.delivery_date ? new Date(quote.delivery_date).toLocaleDateString() : "—"}</div>
                        </div>
                      </div>
                    </div>

                    {quote.special_requirements && (
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Special Requirements</div>
                        <div className="text-slate-300 text-sm">{quote.special_requirements}</div>
                      </div>
                    )}

                    {/* Actions */}
                    {quote.status === "pending" && (
                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <button className="flex-1 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
                          onClick={() => {
                            base44.entities.QuoteRequest.update(quote.id, { status: "quoted" }).then(fetchQuotes).catch(console.error);
                          }}>
                          <Check className="w-4 h-4 inline mr-2" /> Send Quote
                        </button>
                        <button className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
                          onClick={() => {
                            base44.entities.QuoteRequest.update(quote.id, { status: "rejected" }).then(fetchQuotes).catch(console.error);
                          }}>
                          <X className="w-4 h-4 inline mr-2" /> Reject
                        </button>
                      </div>
                    )}

                    {quote.status === "quoted" && (
                      <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
                        Quote sent to {quote.requester_email}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}