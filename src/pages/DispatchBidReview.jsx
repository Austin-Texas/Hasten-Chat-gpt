import { useEffect, useMemo, useState } from "react";
import { base44, isLocalDemoMode } from "@/api/base44Client";
import { CheckCircle, Clock, Loader2, MessageSquare, RefreshCw, ShieldCheck, Truck, XCircle } from "lucide-react";
import { getLoadEquipment } from "@/lib/equipmentMatching";

const REVIEWABLE_STATUSES = ["pending", "interested", "bid_submitted", "counter_offer"];

const LOCAL_BIDS = [
  {
    id: "local-bid-001",
    external_load_id: "local-ext-001",
    driver_id: "local-driver-sprinter",
    status: "interested",
    match_score: 95,
    driver_notes: "Available now.",
    submitted_at: new Date().toISOString(),
  },
];

const LOCAL_LOADS = [
  {
    id: "local-ext-001",
    external_load_id: "DAT-SPR-001",
    source_provider: "DAT Demo",
    pickup_city: "Fayetteville",
    pickup_state: "NC",
    pickup_zip: "28301",
    delivery_city: "Raleigh",
    delivery_state: "NC",
    delivery_zip: "27601",
    required_equipment: "Sprinter",
    commodity: "Auto parts",
    weight: 1800,
    miles_total: 68,
    rate_available: 650,
    normalized_status: "auction",
  },
];

const LOCAL_DRIVERS = [
  {
    id: "local-driver-sprinter",
    full_name: "Sprinter Demo Driver",
    vehicle_type: "Sprinter",
    home_city: "Fayetteville",
    home_state: "NC",
    compliance_status: "valid",
  },
];

function statusClass(status) {
  if (status === "accepted_by_dispatch") return "bg-green-500/15 text-green-300 border-green-500/25";
  if (status === "rejected_by_dispatch" || status === "declined") return "bg-red-500/10 text-red-300 border-red-500/20";
  if (status === "bid_submitted") return "bg-blue-500/10 text-blue-300 border-blue-500/20";
  if (status === "counter_offer") return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  return "bg-green-500/10 text-green-300 border-green-500/20";
}

async function safeCreate(entityName, payload) {
  try {
    await base44.entities[entityName].create(payload);
  } catch (error) {
    console.warn(`[DispatchBidReview] ${entityName} create skipped`, error?.message || error);
  }
}

async function safeInvoke(name, payload) {
  try {
    await base44.functions.invoke(name, payload);
  } catch (error) {
    console.warn(`[DispatchBidReview] ${name} skipped`, error?.message || error);
  }
}

export default function DispatchBidReview() {
  const [bids, setBids] = useState([]);
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [statusFilter, setStatusFilter] = useState("open");
  const [notice, setNotice] = useState("");

  const loadById = useMemo(() => new Map(loads.map((load) => [load.id, load])), [loads]);
  const driverById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers]);

  const fetchData = async () => {
    setLoading(true);
    setNotice("");
    try {
      const [bidRecords, loadRecords, driverRecords] = await Promise.all([
        base44.entities.DriverLoadBid.list("-submitted_at", 200),
        base44.entities.ExternalLoad.list("-imported_at", 200),
        base44.entities.Driver.list("-created_date", 200),
      ]);
      setBids(bidRecords?.length ? bidRecords : (isLocalDemoMode ? LOCAL_BIDS : []));
      setLoads(loadRecords?.length ? loadRecords : (isLocalDemoMode ? LOCAL_LOADS : []));
      setDrivers(driverRecords?.length ? driverRecords : (isLocalDemoMode ? LOCAL_DRIVERS : []));
    } catch (error) {
      console.warn("[DispatchBidReview] fetch failed", error?.message || error);
      setBids(isLocalDemoMode ? LOCAL_BIDS : []);
      setLoads(isLocalDemoMode ? LOCAL_LOADS : []);
      setDrivers(isLocalDemoMode ? LOCAL_DRIVERS : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const visibleBids = bids.filter((bid) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "open") return REVIEWABLE_STATUSES.includes(bid.status || "pending");
    return bid.status === statusFilter;
  });

  const updateBidStatus = async (bid, status) => {
    setActioning(`${bid.id}-${status}`);
    setNotice("");
    try {
      await base44.entities.DriverLoadBid.update(bid.id, {
        status,
        reviewed_at: new Date().toISOString(),
      });
      setNotice(`Bid marked ${status.replaceAll("_", " ")}.`);
      await fetchData();
    } catch (error) {
      console.error(error);
      setNotice("Bid update failed. Check DriverLoadBid entity setup.");
    } finally {
      setActioning(null);
    }
  };

  const acceptBid = async (bid) => {
    const externalLoad = loadById.get(bid.external_load_id);
    const driver = driverById.get(bid.driver_id);
    if (!externalLoad) {
      setNotice("ExternalLoad record not found.");
      return;
    }

    setActioning(`${bid.id}-accept`);
    setNotice("");
    try {
      const createdLoad = await base44.entities.Load.create({
        load_number: `EXT-${String(externalLoad.external_load_id || externalLoad.id).slice(-6).toUpperCase()}`,
        status: "assigned",
        driver_id: bid.driver_id,
        origin_city: externalLoad.pickup_city,
        origin_state: externalLoad.pickup_state,
        origin_zip: externalLoad.pickup_zip,
        destination_city: externalLoad.delivery_city,
        destination_state: externalLoad.delivery_state,
        destination_zip: externalLoad.delivery_zip,
        equipment_type: getLoadEquipment(externalLoad),
        commodity: externalLoad.commodity,
        weight: externalLoad.weight,
        miles: externalLoad.miles_total,
        rate: externalLoad.rate_available,
        total_revenue: externalLoad.rate_available,
        broker_id: externalLoad.broker_customer_id,
        notes: `Accepted from ${externalLoad.source_provider || "external marketplace"} bid review.`,
      });

      await safeInvoke("updateLoadStatus", {
        load_id: createdLoad.id,
        status: "assigned",
        driver_id: bid.driver_id,
      });

      await base44.entities.DriverLoadBid.update(bid.id, {
        status: "accepted_by_dispatch",
        accepted_load_id: createdLoad.id,
        reviewed_at: new Date().toISOString(),
      });

      await base44.entities.ExternalLoad.update(externalLoad.id, {
        normalized_status: "imported",
        imported_load_id: createdLoad.id,
        assigned_driver_id: bid.driver_id,
        updated_at: new Date().toISOString(),
      });

      await safeCreate("TimelineEvent", {
        entity_type: "Load",
        entity_id: createdLoad.id,
        event_type: "bid_accepted",
        title: "Driver bid accepted",
        description: `${driver?.full_name || "Driver"} accepted for ${externalLoad.external_load_id || externalLoad.id}.`,
      });

      await safeCreate("Notification", {
        user_id: bid.driver_id,
        title: "Load assigned",
        message: `Dispatch assigned a load from ${externalLoad.pickup_city} to ${externalLoad.delivery_city}.`,
        type: "load_assignment",
        is_read: false,
      });

      setNotice("Bid accepted and internal load created.");
      await fetchData();
    } catch (error) {
      console.error(error);
      setNotice("Accept failed. Check Load, ExternalLoad, and DriverLoadBid setup.");
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white font-heading">
            <MessageSquare className="h-6 w-6 text-green-400" /> Bid Review
          </h1>
          <p className="mt-1 text-sm text-slate-400">Review driver responses before assigning marketplace loads.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="glass-card rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500"><span>Open</span><Clock className="h-4 w-4 text-amber-400" /></div>
          <div className="mt-2 text-2xl font-bold text-white">{bids.filter((bid) => REVIEWABLE_STATUSES.includes(bid.status || "pending")).length}</div>
        </div>
        <div className="glass-card rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500"><span>Accepted</span><CheckCircle className="h-4 w-4 text-green-400" /></div>
          <div className="mt-2 text-2xl font-bold text-white">{bids.filter((bid) => bid.status === "accepted_by_dispatch").length}</div>
        </div>
        <div className="glass-card rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500"><span>Rejected</span><XCircle className="h-4 w-4 text-red-400" /></div>
          <div className="mt-2 text-2xl font-bold text-white">{bids.filter((bid) => bid.status === "rejected_by_dispatch").length}</div>
        </div>
        <div className="glass-card rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500"><span>External Loads</span><Truck className="h-4 w-4 text-blue-400" /></div>
          <div className="mt-2 text-2xl font-bold text-white">{loads.length}</div>
        </div>
      </div>

      {notice && <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">{notice}</div>}

      <div className="glass-card rounded-xl border border-white/5 p-3 flex flex-wrap gap-2">
        {["open", "interested", "bid_submitted", "counter_offer", "accepted_by_dispatch", "rejected_by_dispatch", "all"].map((status) => (
          <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide ${statusFilter === status ? "bg-green-500 text-black" : "bg-white/5 text-slate-400 hover:text-white"}`}>
            {status.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-32 rounded-xl" />)}</div>
      ) : visibleBids.length === 0 ? (
        <div className="glass-card rounded-xl border border-white/5 p-10 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="font-medium text-slate-300">No bids in this filter</p>
          <p className="mt-1 text-sm text-slate-500">Send marketplace loads to auction, then driver responses will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleBids.map((bid) => {
            const externalLoad = loadById.get(bid.external_load_id) || {};
            const driver = driverById.get(bid.driver_id) || {};
            return (
              <div key={bid.id} className="glass-card rounded-xl border border-white/5 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">{externalLoad.pickup_city || "Pickup"}, {externalLoad.pickup_state || "—"}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-sm font-bold text-white">{externalLoad.delivery_city || "Delivery"}, {externalLoad.delivery_state || "—"}</span>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusClass(bid.status || "pending")}`}>{(bid.status || "pending").replaceAll("_", " ")}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{getLoadEquipment(externalLoad) || "Equipment"}</span>
                      <span>{externalLoad.miles_total || "—"} mi</span>
                      <span>{externalLoad.weight ? `${Number(externalLoad.weight).toLocaleString()} lbs` : "Weight —"}</span>
                      <span>{externalLoad.commodity || "Commodity —"}</span>
                    </div>
                  </div>

                  <div className="min-w-[220px] rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <div className="text-sm font-semibold text-white">{driver.full_name || driver.name || "Driver"}</div>
                    <div className="mt-1 text-xs text-slate-500">{driver.vehicle_type || "Equipment"} · {driver.home_city || driver.city || "—"}, {driver.home_state || driver.state || "—"}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-300"><ShieldCheck className="h-3.5 w-3.5" /> Match {bid.match_score || "—"}</div>
                    {bid.driver_notes && <p className="mt-2 text-xs text-slate-400">{bid.driver_notes}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <button onClick={() => acceptBid(bid)} disabled={Boolean(actioning)} className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-black disabled:opacity-60">
                      {actioning === `${bid.id}-accept` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Accept
                    </button>
                    <button onClick={() => updateBidStatus(bid, "counter_offer")} disabled={Boolean(actioning)} className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300 disabled:opacity-60">
                      Counter
                    </button>
                    <button onClick={() => updateBidStatus(bid, "rejected_by_dispatch")} disabled={Boolean(actioning)} className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-60">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
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
