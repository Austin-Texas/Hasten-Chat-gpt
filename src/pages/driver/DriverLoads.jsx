import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Calendar, CheckCircle, ChevronRight, Loader2, MapPin, Package, Search, Send, Truck, XCircle } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import DriverCalendar from "@/components/driver/DriverCalendar";
import { filterExternalLoadsForDriver, getDriverSafeOffer } from "@/lib/equipmentMatching";

const TABS = [
  { key: "assigned", label: "Assigned" },
  { key: "offers", label: "Offers" },
  { key: "calendar", label: "Calendar" },
  { key: "completed", label: "Done" },
];

function buildDriverProfile(user, driverRecord) {
  return {
    id: user?.id,
    full_name: user?.full_name || user?.name,
    vehicle_type: driverRecord?.vehicle_type || user?.vehicle_type || "Sprinter",
    trailer_type: driverRecord?.trailer_type || user?.trailer_type,
    max_payload: driverRecord?.max_payload || user?.max_payload || 3000,
    status: driverRecord?.availability || driverRecord?.status || "available",
    availability: driverRecord?.availability || driverRecord?.status || "available",
    compliance_status: driverRecord?.compliance_status || "valid",
    ...driverRecord,
  };
}

function getDriverLookupIds(user, profile) {
  return [...new Set([user?.id, profile?.id, profile?.user_id].filter(Boolean))];
}

function dedupeById(records = []) {
  const seen = new Set();
  return records.filter((record) => {
    const key = record?.id || JSON.stringify(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isCounterOffer(offer = {}) {
  return offer.bid_status === "counter_offer" || Boolean(offer.dispatcher_counter_amount || offer.dispatcher_notes);
}

function offerStatusLabel(offer = {}) {
  if (offer.bid_status === "counter_accepted") return "Counter accepted";
  if (offer.bid_status === "counter_declined") return "Counter declined";
  if (offer.bid_status === "counter_offer") return "Counter offer";
  if (offer.bid_status === "bid_submitted") return "Bid submitted";
  if (offer.bid_status === "interested") return "Interested";
  if (offer.bid_status === "declined") return "Declined";
  return "Offer";
}

export default function DriverLoads({ user }) {
  const [tab, setTab] = useState("assigned");
  const [loads, setLoads] = useState([]);
  const [offers, setOffers] = useState([]);
  const [driverProfile, setDriverProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actioning, setActioning] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => { fetchLoads(); }, [tab, user?.id]);

  const fetchDriverProfile = async () => {
    try {
      const records = await base44.entities.Driver.filter({ user_id: user?.id }, "-created_date", 1);
      const fallbackRecords = records?.length ? records : await base44.entities.Driver.filter({ id: user?.id }, "-created_date", 1);
      const profile = buildDriverProfile(user, fallbackRecords?.[0] || null);
      setDriverProfile(profile);
      return profile;
    } catch (error) {
      console.warn("[DriverLoads] Failed to load driver profile:", error?.message || error);
      const profile = buildDriverProfile(user, null);
      setDriverProfile(profile);
      return profile;
    }
  };

  const fetchDriverBids = async (profileOverride = driverProfile) => {
    const all = [];
    for (const id of getDriverLookupIds(user, profileOverride)) {
      try {
        const records = await base44.entities.DriverLoadBid.filter({ driver_id: id }, "-submitted_at", 200);
        all.push(...(records || []));
      } catch (error) {
        console.warn("[DriverLoads] Failed to load driver bids:", error?.message || error);
      }
    }
    return dedupeById(all);
  };

  const fetchDriverLoadsForTab = async (profile, selectedTab) => {
    const all = [];
    for (const id of getDriverLookupIds(user, profile)) {
      try {
        const filter = selectedTab === "completed" ? { driver_id: id, status: "completed" } : { driver_id: id };
        const records = await base44.entities.Load.filter(filter, "-created_date", 50);
        all.push(...(records || []));
      } catch (error) {
        console.warn("[DriverLoads] Failed to load assigned loads:", error?.message || error);
      }
    }
    return dedupeById(all);
  };

  const fetchLoads = async () => {
    setLoading(true);
    setNotice("");
    try {
      const profile = driverProfile || await fetchDriverProfile();

      if (tab === "offers") {
        const [externalLoads, driverBids] = await Promise.all([
          base44.entities.ExternalLoad.list("-imported_at", 100),
          fetchDriverBids(profile),
        ]);
        const bidByExternalLoad = new Map((driverBids || []).map((bid) => [bid.external_load_id, bid]));
        const available = (externalLoads || []).filter((load) => ["available", "auction"].includes(load.normalized_status || "available"));
        const matchedOffers = filterExternalLoadsForDriver(available, profile).map((load) => {
          const safeOffer = getDriverSafeOffer(load);
          const bid = bidByExternalLoad.get(load.id) || bidByExternalLoad.get(safeOffer.external_load_id);
          return {
            ...safeOffer,
            bid_id: bid?.id,
            bid_status: bid?.status,
            driver_bid_amount: bid?.driver_bid_amount,
            driver_notes: bid?.driver_notes,
            dispatcher_counter_amount: bid?.dispatcher_counter_amount,
            dispatcher_notes: bid?.dispatcher_notes,
            counter_sent_at: bid?.counter_sent_at,
          };
        });
        setOffers(matchedOffers);
        setLoads([]);
        return;
      }

      const data = await fetchDriverLoadsForTab(profile, tab);
      const activeStatuses = ["assigned", "accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery"];
      if (tab === "assigned") setLoads((data || []).filter((load) => activeStatuses.includes(load.status)));
      else setLoads(data || []);
      setOffers([]);
    } catch (error) {
      console.error(error);
      setLoads([]);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOfferAction = async (offer, status, extra = {}) => {
    setActioning(`${offer.id}-${status}`);
    setNotice("");
    const payload = {
      external_load_id: offer.external_load_id || offer.id,
      driver_id: driverProfile?.id || user?.id,
      status,
      driver_notes: extra.driver_notes || offer.driver_notes || "",
      driver_bid_amount: extra.driver_bid_amount || offer.driver_bid_amount || null,
      driver_response_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    };
    try {
      if (offer.bid_id) await base44.entities.DriverLoadBid.update(offer.bid_id, payload);
      else await base44.entities.DriverLoadBid.create(payload);
      setNotice(status === "declined" || status === "counter_declined" ? "Offer declined." : "Your response was sent to dispatch.");
      await fetchLoads();
    } catch (error) {
      console.error(error);
      setNotice("Could not send response. Check connection or Base44 entity setup.");
    } finally {
      setActioning(null);
    }
  };

  const filteredAssigned = loads.filter((load) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (load.load_number || "").toLowerCase().includes(q) || (load.origin_city || "").toLowerCase().includes(q) || (load.destination_city || "").toLowerCase().includes(q);
  });

  const filteredOffers = offers.filter((offer) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (offer.load_number || "").toLowerCase().includes(q) || (offer.origin_city || "").toLowerCase().includes(q) || (offer.destination_city || "").toLowerCase().includes(q) || (offer.equipment_type || "").toLowerCase().includes(q);
  });

  const visibleCount = tab === "offers" ? filteredOffers.length : filteredAssigned.length;

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-xl">Loads</h1>
          <p className="text-slate-500 text-xs mt-0.5">{driverProfile?.vehicle_type || "Equipment"} · only compatible offers are shown</p>
        </div>
        <span className="text-slate-500 text-sm">{visibleCount} items</span>
      </div>

      <div className="flex gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5">
        {TABS.map((tabItem) => (
          <button key={tabItem.key} onClick={() => { setTab(tabItem.key); setSearch(""); }} className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all duration-150 ${tab === tabItem.key ? "bg-green-500 text-black shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>
            {tabItem.key === "calendar" ? <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {tabItem.label}</span> : tabItem.label}
          </button>
        ))}
      </div>

      {notice && <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">{notice}</div>}

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" /><input type="text" placeholder={tab === "offers" ? "Search offers…" : "Search loads…"} value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/40 transition-colors" /></div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-36 rounded-2xl" />)}</div>
      ) : tab === "calendar" ? (
        <DriverCalendar driverId={user?.id} loads={loads} />
      ) : tab === "offers" ? (
        filteredOffers.length === 0 ? <EmptyState title="No matched offers" subtitle="Only equipment-compatible load offers will appear here." /> : <div className="space-y-3">{filteredOffers.map((offer) => <OfferCard key={offer.id} offer={offer} actioning={actioning} onAction={handleOfferAction} />)}</div>
      ) : filteredAssigned.length === 0 ? (
        <EmptyState title="No loads found" subtitle={tab === "completed" ? "Completed loads will appear here" : "Assigned loads will appear here"} />
      ) : (
        <div className="space-y-3">{filteredAssigned.map((load) => <AssignedLoadCard key={load.id} load={load} tab={tab} />)}</div>
      )}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return <div className="text-center py-16"><div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4"><Package className="w-8 h-8 text-slate-600" /></div><p className="text-slate-300 font-semibold">{title}</p><p className="text-slate-600 text-sm mt-1">{subtitle}</p></div>;
}

function OfferCard({ offer, actioning, onAction }) {
  const hasCounter = isCounterOffer(offer);
  const isClosed = ["declined", "counter_declined", "counter_accepted"].includes(offer.bid_status);
  return (
    <div className="rounded-2xl p-4 transition-all duration-150 active:scale-[0.99]" style={{ background: "linear-gradient(135deg, rgba(15,24,42,0.86) 0%, rgba(20,30,55,0.76) 100%)", border: hasCounter ? "1px solid rgba(251,191,36,0.35)" : "1px solid rgba(34,197,94,0.16)", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
      <div className="flex items-start justify-between gap-2 mb-3"><div><span className="text-green-400 font-mono font-bold text-base">{offer.load_number}</span><span className="ml-2 text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">{offerStatusLabel(offer)}</span></div><span className="rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-300">Matched</span></div>
      <div className="flex items-center gap-2 mb-3"><div className="flex-1 min-w-0"><div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Pickup</div><div className="text-white font-semibold text-sm truncate">{offer.origin_city}, {offer.origin_state}</div></div><div className="flex flex-col items-center gap-0.5 flex-shrink-0"><ArrowRight className="w-4 h-4 text-green-500/70" />{offer.miles && <span className="text-slate-600 text-[9px]">{offer.miles}mi</span>}</div><div className="flex-1 min-w-0 text-right"><div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Delivery</div><div className="text-white font-semibold text-sm truncate">{offer.destination_city}, {offer.destination_state}</div></div></div>
      <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">{offer.equipment_type && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{offer.equipment_type}</span>}{offer.weight && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{(offer.weight / 1000).toFixed(0)}k lbs</span>}{offer.commodity && <span className="truncate">{offer.commodity}</span>}<span className="ml-auto text-[10px] font-semibold uppercase text-slate-500">Rate hidden until dispatch review</span></div>
      {hasCounter && <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3"><div className="text-xs font-bold uppercase tracking-wide text-amber-300">Dispatcher Counter</div><div className="mt-1 text-lg font-bold text-white">${Number(offer.dispatcher_counter_amount || 0).toLocaleString()}</div>{offer.dispatcher_notes && <p className="mt-1 text-xs text-amber-100/80">{offer.dispatcher_notes}</p>}</div>}
      {hasCounter ? (
        <div className="grid grid-cols-2 gap-2"><button onClick={() => onAction(offer, "counter_accepted")} disabled={isClosed || actioning === `${offer.id}-counter_accepted`} className="flex items-center justify-center gap-1 rounded-xl bg-green-500 px-3 py-2.5 text-sm font-bold text-black disabled:opacity-60">{actioning === `${offer.id}-counter_accepted` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Accept Counter</button><button onClick={() => onAction(offer, "counter_declined")} disabled={isClosed || actioning === `${offer.id}-counter_declined`} className="flex items-center justify-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-300 disabled:opacity-60"><XCircle className="h-3.5 w-3.5" /> Decline</button></div>
      ) : (
        <div className="grid grid-cols-3 gap-2"><button onClick={() => onAction(offer, "interested")} disabled={actioning === `${offer.id}-interested`} className="flex items-center justify-center gap-1 rounded-xl bg-green-500 px-3 py-2.5 text-sm font-bold text-black disabled:opacity-60">{actioning === `${offer.id}-interested` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Interested</button><button onClick={() => onAction(offer, "bid_submitted")} disabled={actioning === `${offer.id}-bid_submitted`} className="flex items-center justify-center gap-1 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2.5 text-sm font-bold text-blue-300 disabled:opacity-60"><Send className="h-3.5 w-3.5" /> Bid</button><button onClick={() => onAction(offer, "declined")} disabled={actioning === `${offer.id}-declined`} className="flex items-center justify-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-300 disabled:opacity-60"><XCircle className="h-3.5 w-3.5" /> Decline</button></div>
      )}
    </div>
  );
}

function AssignedLoadCard({ load, tab }) {
  return (
    <div className="rounded-2xl p-4 transition-all duration-150 active:scale-[0.99]" style={{ background: "linear-gradient(135deg, rgba(15,24,42,0.8) 0%, rgba(20,30,55,0.7) 100%)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
      <div className="flex items-start justify-between gap-2 mb-3"><div><span className="text-green-400 font-mono font-bold text-base">{load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}</span>{load.priority === "critical" && <span className="ml-2 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">URGENT</span>}</div><StatusBadge status={load.status} /></div>
      <div className="flex items-center gap-2 mb-3"><div className="flex-1 min-w-0"><div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Origin</div><div className="text-white font-semibold text-sm truncate">{load.origin_city}, {load.origin_state}</div></div><div className="flex flex-col items-center gap-0.5 flex-shrink-0"><ArrowRight className="w-4 h-4 text-green-500/70" />{load.miles && <span className="text-slate-600 text-[9px]">{load.miles}mi</span>}</div><div className="flex-1 min-w-0 text-right"><div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Destination</div><div className="text-white font-semibold text-sm truncate">{load.destination_city}, {load.destination_state}</div></div></div>
      <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">{load.equipment_type && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{load.equipment_type}</span>}{load.weight && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{(load.weight / 1000).toFixed(0)}k lbs</span>}{load.commodity && <span className="truncate">{load.commodity}</span>}<span className="ml-auto text-green-400 font-bold text-sm">${(load.rate || 0).toLocaleString()}</span></div>
      <div className="flex gap-2"><Link to={`/driver/loads/${load.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium text-center transition-all active:scale-95" style={{ background: "rgba(255,255,255,0.04)" }}>Details <ChevronRight className="w-3.5 h-3.5" /></Link>{tab === "assigned" && <Link to="/driver/map" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold text-center transition-all active:scale-95" style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)" }}><MapPin className="w-3.5 h-3.5" /> Navigate</Link>}{tab === "completed" && <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/15 text-green-400 text-sm font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Done</div>}</div>
    </div>
  );
}
