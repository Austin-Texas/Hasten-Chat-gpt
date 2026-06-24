import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Search, RefreshCw, Truck, MapPin, DollarSign, Weight, Package,
  Filter, Zap, Users, ArrowRight, Clock, ExternalLink, Loader2, X
} from "lucide-react";

const EQUIPMENT_FILTERS = ["Sprinter", "Cargo Van", "Box Truck", "Hot Shot", "Gooseneck", "Dry Van", "Power Only", "Flatbed", "Car Hauler", "Reefer"];

export default function LoadMarketplace() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [equipFilter, setEquipFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [minRate, setMinRate] = useState("");
  const [showMatchModal, setShowMatchModal] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matching, setMatching] = useState(false);

  const fetchLoads = useCallback(() => {
    setLoading(true);
    base44.entities.ExternalLoad.list("-imported_at", 200)
      .then(setLoads)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLoads(); }, [fetchLoads]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await base44.functions.invoke('syncExternalLoads', { mode: 'sample' });
      if (result.data?.success !== false) {
        await fetchLoads();
      }
    } catch (err) { console.error(err); }
    finally { setSyncing(false); }
  };

  const handleMatch = async (load) => {
    setShowMatchModal(load);
    setMatching(true);
    setMatches([]);
    try {
      const result = await base44.functions.invoke('matchExternalLoadsToDrivers', { external_load_id: load.id });
      setMatches(result.data?.matches || []);
    } catch (err) { console.error(err); }
    finally { setMatching(false); }
  };

  const handleImport = async (load) => {
    try {
      // Import external load into HASTEN dispatch as a Load entity
      const created = await base44.entities.Load.create({
        load_number: `EXT-${load.external_load_id?.slice(-6).toUpperCase()}`,
        status: 'available',
        origin_city: load.pickup_city,
        origin_state: load.pickup_state,
        origin_zip: load.pickup_zip,
        destination_city: load.delivery_city,
        destination_state: load.delivery_state,
        destination_zip: load.delivery_zip,
        equipment_type: load.required_equipment,
        commodity: load.commodity,
        weight: load.weight,
        miles: load.miles_total,
        rate: load.rate_available,
        rate_per_mile: load.miles_total > 0 ? load.rate_available / load.miles_total : 0,
        broker_id: load.broker_customer_id,
        is_hazmat: load.hazmat,
        notes: `Imported from ${load.source_provider} - Broker: ${load.broker_name}`,
        total_revenue: load.rate_available
      });
      // Mark external load as imported
      await base44.entities.ExternalLoad.update(load.id, {
        normalized_status: 'imported',
        imported_load_id: created.id,
        updated_at: new Date().toISOString()
      });
      fetchLoads();
    } catch (err) { console.error(err); }
  };

  // Filter logic
  const filtered = loads.filter(l => {
    if (l.normalized_status !== 'available') return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = (l.broker_name || '').toLowerCase().includes(q) ||
        (l.pickup_city || '').toLowerCase().includes(q) ||
        (l.delivery_city || '').toLowerCase().includes(q) ||
        (l.commodity || '').toLowerCase().includes(q) ||
        (l.source_provider || '').toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (equipFilter && l.required_equipment !== equipFilter) return false;
    if (sourceFilter && l.source_provider !== sourceFilter) return false;
    if (minRate && l.rate_available < parseFloat(minRate)) return false;
    return true;
  });

  const sources = [...new Set(loads.map(l => l.source_provider).filter(Boolean))];

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Load Marketplace</h1>
          <p className="text-slate-400 text-sm mt-0.5">{filtered.length} available loads from {sources.length} sources</p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all"
          style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}>
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {syncing ? "Syncing…" : "Sync Loads"}
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-3 border border-white/5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search broker, city, commodity…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-green-500/40" />
        </div>
        <select value={equipFilter} onChange={e => setEquipFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40">
          <option value="">All Equipment</option>
          {EQUIPMENT_FILTERS.map(e => <option key={e} value={e} style={{ background: "#0F1829" }}>{e}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40">
          <option value="">All Sources</option>
          {sources.map(s => <option key={s} value={s} style={{ background: "#0F1829" }}>{s}</option>)}
        </select>
        <input type="number" value={minRate} onChange={e => setMinRate(e.target.value)} placeholder="Min $"
          className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-green-500/40" />
        {(search || equipFilter || sourceFilter || minRate) && (
          <button onClick={() => { setSearch(""); setEquipFilter(""); setSourceFilter(""); setMinRate(""); }}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Load Cards */}
      {loading ? (
        <div className="grid gap-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No loads available</p>
          <p className="text-slate-600 text-sm mt-1">Click "Sync Loads" to import from connected load boards</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(load => {
            const ratePerMile = load.miles_total > 0 ? (load.rate_available / load.miles_total).toFixed(2) : null;
            const isExpiring = load.expires_at && new Date(load.expires_at) < new Date(Date.now() + 6 * 3600000);
            return (
              <div key={load.id} className="glass-card rounded-xl border border-white/5 p-3 hover:border-green-500/20 transition-all group">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Source badge */}
                  <div className="flex-shrink-0">
                    <span className="inline-block px-2 py-1 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                      {load.source_provider}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-white font-medium">{load.pickup_city}, {load.pickup_state}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="text-white font-medium">{load.delivery_city}, {load.delivery_state}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{load.required_equipment}</span>
                      {load.miles_total && <span>{load.miles_total} mi</span>}
                      {load.weight > 0 && <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{load.weight.toLocaleString()} lbs</span>}
                      {load.commodity && <span className="flex items-center gap-1"><Package className="w-3 h-3" />{load.commodity}</span>}
                      {load.hazmat && <span className="text-red-400 font-medium">⚠ Hazmat</span>}
                      {load.temperature_controlled && <span className="text-cyan-400">❄ Reefer</span>}
                    </div>
                  </div>

                  {/* Broker */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-slate-400 text-xs">{load.broker_name}</div>
                    {ratePerMile && <div className="text-slate-600 text-[10px]">${ratePerMile}/mi</div>}
                  </div>

                  {/* Rate */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-green-400 font-bold text-lg">${(load.rate_available || 0).toLocaleString()}</div>
                    {isExpiring && <div className="text-amber-400 text-[10px] flex items-center gap-0.5 justify-end"><Clock className="w-2.5 h-2.5" />Expiring</div>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => handleMatch(load)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-medium hover:bg-blue-500/25 transition-colors"
                      title="Find matching drivers">
                      <Users className="w-3.5 h-3.5" /> Match
                    </button>
                    <button onClick={() => handleImport(load)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors"
                      style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
                      title="Import into HASTEN dispatch">
                      <Zap className="w-3.5 h-3.5" /> Import
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Match Modal */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowMatchModal(null)}>
          <div className="glass-card rounded-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-sm">Driver Matches</h3>
                <p className="text-slate-500 text-xs">{showMatchModal.pickup_city} → {showMatchModal.delivery_city} · {showMatchModal.required_equipment}</p>
              </div>
              <button onClick={() => setShowMatchModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {matching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-green-400" />
                  <span className="text-slate-400 text-sm ml-2">Matching drivers…</span>
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No matching drivers available</p>
                  <p className="text-slate-600 text-xs mt-1">No available drivers with compatible equipment</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {matches.map((m, i) => (
                    <div key={i} className="glass-card rounded-xl border border-white/5 p-3 flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          m.match_score >= 80 ? 'bg-green-500/15 text-green-400' :
                          m.match_score >= 60 ? 'bg-amber-500/15 text-amber-400' :
                          'bg-slate-500/15 text-slate-400'
                        }`}>
                          {m.match_score}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">{m.driver_name}</div>
                        <div className="text-slate-500 text-xs">{m.equipment} · {m.home_city}, {m.home_state}</div>
                        {m.hazmat_cert && <span className="text-green-400 text-[10px]">✓ Hazmat</span>}
                      </div>
                      <Link to={`/drivers/${m.driver_id}`}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:text-white transition-colors">
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}