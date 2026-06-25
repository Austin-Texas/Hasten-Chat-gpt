import { useState, useEffect, useCallback } from "react";
import { base44, isLocalDemoMode } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Search,
  RefreshCw,
  Truck,
  MapPin,
  DollarSign,
  Weight,
  Package,
  Zap,
  Users,
  ArrowRight,
  Clock,
  Loader2,
  X,
  Radio,
  ShieldCheck,
  Send,
  CheckCircle,
} from "lucide-react";
import {
  EQUIPMENT_CLASSES,
  getLoadEquipment,
  matchExternalLoadsToDrivers,
} from "@/lib/equipmentMatching";

const LOCAL_EXTERNAL_LOADS = [
  {
    id: "local-ext-001",
    source_provider: "DAT Demo",
    external_load_id: "DAT-SPR-001",
    broker_name: "Demo Broker",
    pickup_city: "Fayetteville",
    pickup_state: "NC",
    pickup_zip: "28301",
    delivery_city: "Raleigh",
    delivery_state: "NC",
    delivery_zip: "27601",
    required_equipment: "Sprinter",
    weight: 1800,
    miles_total: 68,
    rate_available: 650,
    commodity: "Auto parts",
    normalized_status: "available",
    imported_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 5 * 3600000).toISOString(),
  },
  {
    id: "local-ext-002",
    source_provider: "Truckstop Demo",
    external_load_id: "TS-HOT-002",
    broker_name: "Demo Broker",
    pickup_city: "Charlotte",
    pickup_state: "NC",
    pickup_zip: "28202",
    delivery_city: "Atlanta",
    delivery_state: "GA",
    delivery_zip: "30301",
    required_equipment: "Hot Shot",
    weight: 9200,
    miles_total: 245,
    rate_available: 1750,
    commodity: "Machinery parts",
    normalized_status: "available",
    imported_at: new Date().toISOString(),
  },
  {
    id: "local-ext-003",
    source_provider: "123Loadboard Demo",
    external_load_id: "123-DV-003",
    broker_name: "Demo Shipper",
    pickup_city: "Greensboro",
    pickup_state: "NC",
    pickup_zip: "27401",
    delivery_city: "Richmond",
    delivery_state: "VA",
    delivery_zip: "23219",
    required_equipment: "Dry Van",
    weight: 22000,
    miles_total: 205,
    rate_available: 1400,
    commodity: "Retail freight",
    normalized_status: "available",
    imported_at: new Date().toISOString(),
  },
];

const LOCAL_DRIVERS = [
  {
    id: "local-driver-sprinter",
    full_name: "Sprinter Demo Driver",
    vehicle_type: "Sprinter",
    max_payload: 3000,
    status: "available",
    compliance_status: "valid",
    home_city: "Fayetteville",
    home_state: "NC",
  },
  {
    id: "local-driver-hotshot",
    full_name: "Hot Shot Demo Driver",
    vehicle_type: "Hot Shot",
    max_payload: 12000,
    status: "available",
    compliance_status: "valid",
    home_city: "Charlotte",
    home_state: "NC",
  },
  {
    id: "local-driver-dryvan",
    full_name: "Dry Van Demo Driver",
    vehicle_type: "Dry Van",
    max_payload: 44000,
    status: "available",
    compliance_status: "valid",
    home_city: "Greensboro",
    home_state: "NC",
  },
];

export default function LoadMarketplace() {
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [equipFilter, setEquipFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [minRate, setMinRate] = useState("");
  const [showMatchModal, setShowMatchModal] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matching, setMatching] = useState(false);
  const [auctioning, setAuctioning] = useState(null);
  const [notice, setNotice] = useState("");

  const fetchDrivers = useCallback(async () => {
    try {
      const records = await base44.entities.Driver.list("-created_date", 200);
      const nextDrivers = records?.length ? records : (isLocalDemoMode ? LOCAL_DRIVERS : []);
      setDrivers(nextDrivers);
      return nextDrivers;
    } catch (error) {
      console.warn("[LoadMarketplace] Failed to fetch drivers:", error?.message || error);
      const fallback = isLocalDemoMode ? LOCAL_DRIVERS : [];
      setDrivers(fallback);
      return fallback;
    }
  }, []);

  const fetchLoads = useCallback(async () => {
    setLoading(true);
    try {
      const records = await base44.entities.ExternalLoad.list("-imported_at", 200);
      setLoads(records?.length ? records : (isLocalDemoMode ? LOCAL_EXTERNAL_LOADS : []));
    } catch (error) {
      console.warn("[LoadMarketplace] Failed to fetch external loads:", error?.message || error);
      setLoads(isLocalDemoMode ? LOCAL_EXTERNAL_LOADS : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoads();
    fetchDrivers();
  }, [fetchLoads, fetchDrivers]);

  const handleSync = async () => {
    setSyncing(true);
    setNotice("");
    try {
      const result = await base44.functions.invoke("syncExternalLoads", { mode: isLocalDemoMode ? "local_demo" : "manual" });
      if (result.data?.success !== false) {
        await fetchLoads();
        setNotice(isLocalDemoMode ? "Local demo loads loaded. Connect real providers in Super Admin for production sync." : "External loads synced.");
      }
    } catch (err) {
      console.error(err);
      if (isLocalDemoMode) {
        setLoads(LOCAL_EXTERNAL_LOADS);
        setNotice("Local demo loads loaded. Real API sync requires provider credentials.");
      }
    } finally {
      setSyncing(false);
    }
  };

  const findMatches = async (load) => {
    let functionMatches = [];
    try {
      const result = await base44.functions.invoke("matchExternalLoadsToDrivers", { external_load_id: load.id });
      functionMatches = result.data?.matches || [];
    } catch (err) {
      console.warn("[LoadMarketplace] Match function fallback:", err?.message || err);
    }

    if (functionMatches.length > 0) return functionMatches;

    const availableDrivers = drivers.length ? drivers : await fetchDrivers();
    return matchExternalLoadsToDrivers(load, availableDrivers);
  };

  const handleMatch = async (load) => {
    setShowMatchModal(load);
    setMatching(true);
    setMatches([]);
    try {
      setMatches(await findMatches(load));
    } finally {
      setMatching(false);
    }
  };

  const handleSendToAuction = async (load) => {
    setAuctioning(load.id);
    setNotice("");
    try {
      const matchedDrivers = await findMatches(load);
      if (!matchedDrivers.length) {
        setNotice("No compatible drivers found for this equipment class.");
        return;
      }

      await Promise.all(matchedDrivers.slice(0, 10).map((match) => base44.entities.DriverLoadBid.create({
        external_load_id: load.id,
        driver_id: match.driver_id,
        status: "pending",
        driver_notes: "Load offer sent by dispatcher from marketplace.",
        match_score: match.match_score,
        submitted_at: new Date().toISOString(),
      })));

      await base44.entities.ExternalLoad.update(load.id, {
        normalized_status: "auction",
        auction_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setNotice(`Sent to ${Math.min(matchedDrivers.length, 10)} matching driver${matchedDrivers.length === 1 ? "" : "s"}.`);
      await fetchLoads();
    } catch (error) {
      console.error(error);
      setNotice("Auction action could not complete. Check console/API setup.");
    } finally {
      setAuctioning(null);
    }
  };

  const handleImport = async (load) => {
    try {
      const created = await base44.entities.Load.create({
        load_number: `EXT-${String(load.external_load_id || load.id).slice(-6).toUpperCase()}`,
        status: "available",
        origin_city: load.pickup_city,
        origin_state: load.pickup_state,
        origin_zip: load.pickup_zip,
        destination_city: load.delivery_city,
        destination_state: load.delivery_state,
        destination_zip: load.delivery_zip,
        equipment_type: getLoadEquipment(load),
        commodity: load.commodity,
        weight: load.weight,
        miles: load.miles_total,
        rate: load.rate_available,
        rate_per_mile: load.miles_total > 0 ? load.rate_available / load.miles_total : 0,
        broker_id: load.broker_customer_id,
        is_hazmat: load.hazmat,
        notes: `Imported from ${load.source_provider} - Broker: ${load.broker_name}`,
        total_revenue: load.rate_available,
      });

      await base44.entities.ExternalLoad.update(load.id, {
        normalized_status: "imported",
        imported_load_id: created.id,
        updated_at: new Date().toISOString(),
      });
      setNotice("External load converted to internal HASTEN load.");
      fetchLoads();
    } catch (err) {
      console.error(err);
      setNotice("Import failed. Check Base44 entity configuration.");
    }
  };

  const filtered = loads.filter((load) => {
    if (!["available", "auction"].includes(load.normalized_status || "available")) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = (load.broker_name || "").toLowerCase().includes(q) ||
        (load.pickup_city || "").toLowerCase().includes(q) ||
        (load.delivery_city || "").toLowerCase().includes(q) ||
        (load.commodity || "").toLowerCase().includes(q) ||
        (load.source_provider || "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (equipFilter && getLoadEquipment(load) !== equipFilter) return false;
    if (sourceFilter && load.source_provider !== sourceFilter) return false;
    if (minRate && load.rate_available < parseFloat(minRate)) return false;
    return true;
  });

  const sources = [...new Set(loads.map((load) => load.source_provider).filter(Boolean))];
  const availableCount = loads.filter((load) => (load.normalized_status || "available") === "available").length;
  const auctionCount = loads.filter((load) => load.normalized_status === "auction").length;
  const avgRate = loads.length ? Math.round(loads.reduce((sum, load) => sum + Number(load.rate_available || 0), 0) / loads.length) : 0;

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Load Marketplace</h1>
          <p className="text-slate-400 text-sm mt-0.5">{filtered.length} visible loads from {sources.length} sources</p>
        </div>
        <div className="flex gap-2">
          <Link to="/super-admin/settings/integrations/load-board-apis" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">
            API Sources
          </Link>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? "Syncing…" : "Sync Loads"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="glass-card rounded-xl border border-white/5 p-3">
          <div className="flex items-center justify-between text-xs text-slate-500"><span>Available</span><Truck className="h-4 w-4 text-green-400" /></div>
          <div className="mt-2 text-2xl font-bold text-white">{availableCount}</div>
        </div>
        <div className="glass-card rounded-xl border border-white/5 p-3">
          <div className="flex items-center justify-between text-xs text-slate-500"><span>In Auction</span><Radio className="h-4 w-4 text-blue-400" /></div>
          <div className="mt-2 text-2xl font-bold text-white">{auctionCount}</div>
        </div>
        <div className="glass-card rounded-xl border border-white/5 p-3">
          <div className="flex items-center justify-between text-xs text-slate-500"><span>Avg Rate</span><DollarSign className="h-4 w-4 text-green-400" /></div>
          <div className="mt-2 text-2xl font-bold text-white">${avgRate.toLocaleString()}</div>
        </div>
        <div className="glass-card rounded-xl border border-white/5 p-3">
          <div className="flex items-center justify-between text-xs text-slate-500"><span>Drivers Loaded</span><Users className="h-4 w-4 text-purple-400" /></div>
          <div className="mt-2 text-2xl font-bold text-white">{drivers.length}</div>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">
          {notice}
        </div>
      )}

      <div className="glass-card rounded-xl p-3 border border-white/5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search source, city, commodity…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-green-500/40" />
        </div>
        <select value={equipFilter} onChange={e => setEquipFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40">
          <option value="">All Equipment</option>
          {EQUIPMENT_CLASSES.map(e => <option key={e} value={e} style={{ background: "#0F1829" }}>{e}</option>)}
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

      {loading ? (
        <div className="grid gap-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No loads available</p>
          <p className="text-slate-600 text-sm mt-1">Click Sync Loads or configure a source in Super Admin.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(load => {
            const ratePerMile = load.miles_total > 0 ? (load.rate_available / load.miles_total).toFixed(2) : null;
            const isExpiring = load.expires_at && new Date(load.expires_at) < new Date(Date.now() + 6 * 3600000);
            const equipment = getLoadEquipment(load);
            return (
              <div key={load.id} className="glass-card rounded-xl border border-white/5 p-3 hover:border-green-500/20 transition-all group">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-shrink-0">
                    <span className="inline-block px-2 py-1 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                      {load.source_provider || "Source"}
                    </span>
                    {load.normalized_status === "auction" && (
                      <span className="ml-1 inline-block px-2 py-1 rounded text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/25">
                        Auction
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-white font-medium">{load.pickup_city}, {load.pickup_state}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="text-white font-medium">{load.delivery_city}, {load.delivery_state}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{equipment}</span>
                      {load.miles_total && <span>{load.miles_total} mi</span>}
                      {load.weight > 0 && <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{load.weight.toLocaleString()} lbs</span>}
                      {load.commodity && <span className="flex items-center gap-1"><Package className="w-3 h-3" />{load.commodity}</span>}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-slate-400 text-xs">{load.broker_name || "Broker/Customer"}</div>
                    {ratePerMile && <div className="text-slate-600 text-[10px]">${ratePerMile}/mi</div>}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-green-400 font-bold text-lg">${(load.rate_available || 0).toLocaleString()}</div>
                    {isExpiring && <div className="text-amber-400 text-[10px] flex items-center gap-0.5 justify-end"><Clock className="w-2.5 h-2.5" />Expiring</div>}
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => handleMatch(load)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-medium hover:bg-blue-500/25 transition-colors"
                      title="Find matching drivers">
                      <Users className="w-3.5 h-3.5" /> Match
                    </button>
                    <button onClick={() => handleSendToAuction(load)} disabled={auctioning === load.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/25 text-purple-300 text-xs font-medium hover:bg-purple-500/25 transition-colors disabled:opacity-60"
                      title="Send offer to matching drivers">
                      {auctioning === load.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Auction
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

      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowMatchModal(null)}>
          <div className="glass-card rounded-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-sm">Driver Matches</h3>
                <p className="text-slate-500 text-xs">{showMatchModal.pickup_city} → {showMatchModal.delivery_city} · {getLoadEquipment(showMatchModal)}</p>
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
                    <div key={`${m.driver_id}-${i}`} className="glass-card rounded-xl border border-white/5 p-3 flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          m.match_score >= 80 ? "bg-green-500/15 text-green-400" :
                          m.match_score >= 60 ? "bg-amber-500/15 text-amber-400" :
                          "bg-slate-500/15 text-slate-400"
                        }`}>
                          {m.match_score}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">{m.driver_name}</div>
                        <div className="text-slate-500 text-xs">{m.equipment} · {m.home_city}, {m.home_state}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(m.reasons || []).map((reason) => (
                            <span key={reason} className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-300">{reason}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-400" />
                        <Link to={`/drivers/${m.driver_id}`} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:text-white transition-colors">
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {matches.length > 0 && !matching && (
              <div className="border-t border-white/10 p-4 flex justify-end">
                <button onClick={() => handleSendToAuction(showMatchModal)} disabled={auctioning === showMatchModal.id}
                  className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-60">
                  {auctioning === showMatchModal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Send to Auction
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
