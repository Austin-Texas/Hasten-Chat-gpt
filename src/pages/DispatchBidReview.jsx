import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Clock, Loader2, MessageSquare, RefreshCw, ShieldCheck, Truck, XCircle, X } from "lucide-react";
import { getLoadEquipment } from "@/lib/equipmentMatching";

const REVIEWABLE_STATUSES = ["pending", "interested", "bid_submitted", "counter_offer"];
const FILTERS = ["open", "interested", "bid_submitted", "counter_offer", "accepted_by_dispatch", "rejected_by_dispatch", "all"];

function statusClass(status) {
  if (status === "accepted_by_dispatch") return "bg-green-500/15 text-green-300 border-green-500/25";
  if (status === "rejected_by_dispatch" || status === "declined") return "bg-red-500/10 text-red-300 border-red-500/20";
  if (status === "bid_submitted") return "bg-blue-500/10 text-blue-300 border-blue-500/20";
  if (status === "counter_offer") return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  return "bg-green-500/10 text-green-300 border-green-500/20";
}

function loadIsLocked(load = {}) {
  return Boolean(load.imported_load_id || load.assigned_driver_id || load.normalized_status === "imported");
}

export default function DispatchBidReview() {
  const [bids, setBids] = useState([]);
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [statusFilter, setStatusFilter] = useState("open");
  const [notice, setNotice] = useState("");
  const [counterBid, setCounterBid] = useState(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");

  const loadById = useMemo(() => new Map(loads.map((load) => [load.id, load])), [loads]);
  const driverById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bidRecords, loadRecords, driverRecords] = await Promise.all([
        base44.entities.DriverLoadBid.list("-submitted_at", 200),
        base44.entities.ExternalLoad.list("-imported_at", 200),
        base44.entities.Driver.list("-created_date", 200),
      ]);
      setBids(bidRecords || []);
      setLoads(loadRecords || []);
      setDrivers(driverRecords || []);
    } catch (error) {
      console.warn("[DispatchBidReview] fetch failed", error?.message || error);
      setBids([]);
      setLoads([]);
      setDrivers([]);
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
      await base44.entities.DriverLoadBid.update(bid.id, { status, reviewed_at: new Date().toISOString() });
      setNotice(`Bid marked ${status.replaceAll("_", " ")}.`);
      await fetchData();
    } catch (error) {
      console.error(error);
      setNotice("Bid update failed. Check DriverLoadBid entity setup.");
    } finally {
      setActioning(null);
    }
  };

  const openCounterModal = (bid) => {
    setCounterBid(bid);
    setCounterAmount(String(bid.dispatcher_counter_amount || bid.driver_bid_amount || ""));
    setCounterNote(bid.dispatcher_notes || "");
    setNotice("");
  };

  const submitCounterOffer = async () => {
    if (!counterBid) return;
    setActioning(`${counterBid.id}-counter`);
    setNotice("");
    try {
      await base44.entities.DriverLoadBid.update(counterBid.id, {
        status: "counter_offer",
        dispatcher_counter_amount: counterAmount ? Number(counterAmount) : null,
        dispatcher_notes: counterNote,
        counter_sent_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      });
      setNotice("Counter offer sent to driver for review.");
      setCounterBid(null);
      setCounterAmount("");
      setCounterNote("");
      await fetchData();
    } catch (error) {
      console.error(error);
      setNotice("Counter offer failed. Check DriverLoadBid fields.");
    } finally {
      setActioning(null);
    }
  };

  const acceptBid = async (bid) => {
    const externalLoad = loadById.get(bid.external_load_id);
    if (!externalLoad) {
      setNotice("ExternalLoad record not found.");
      return;
    }
    if (loadIsLocked(externalLoad)) {
      setNotice("Accept blocked: this external load is already imported or assigned.");
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

      try {
        await base44.functions.invoke("updateLoadStatus", { load_id: createdLoad.id, status: "assigned", driver_id: bid.driver_id });
      } catch (error) {
        console.warn("[DispatchBidReview] updateLoadStatus skipped", error?.message || error);
      }

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

      setNotice("Bid accepted and internal assigned load created.");
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
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white font-heading"><MessageSquare className="h-6 w-6 text-green-400" /> Bid Review</h1>
          <p className="mt-1 text-sm text-slate-400">Review driver responses before assigning marketplace loads.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric title="Open" value={bids.filter((bid) => REVIEWABLE_STATUSES.includes(bid.status || "pending")).length} icon={<Clock className="h-4 w-4 text-amber-400" />} />
        <Metric title="Accepted" value={bids.filter((bid) => bid.status === "accepted_by_dispatch").length} icon={<CheckCircle className="h-4 w-4 text-green-400" />} />
        <Metric title="Rejected" value={bids.filter((bid) => bid.status === "rejected_by_dispatch").length} icon={<XCircle className="h-4 w-4 text-red-400" />} />
        <Metric title="External Loads" value={loads.length} icon={<Truck className="h-4 w-4 text-blue-400" />} />
      </div>

      {notice && <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">{notice}</div>}

      <div className="glass-card rounded-xl border border-white/5 p-3 flex flex-wrap gap-2">
        {FILTERS.map((status) => (
          <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide ${statusFilter === status ? "bg-green-500 text-black" : "bg-white/5 text-slate-400 hover:text-white"}`}>{status.replaceAll("_", " ")}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-32 rounded-xl" />)}</div>
      ) : visibleBids.length === 0 ? (
        <div className="glass-card rounded-xl border border-white/5 p-10 text-center"><MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-600" /><p className="font-medium text-slate-300">No bids in this filter</p><p className="mt-1 text-sm text-slate-500">Send marketplace loads to auction, then driver responses will appear here.</p></div>
      ) : (
        <div className="space-y-3">
          {visibleBids.map((bid) => {
            const externalLoad = loadById.get(bid.external_load_id) || {};
            const driver = driverById.get(bid.driver_id) || {};
            const locked = loadIsLocked(externalLoad);
            return (
              <div key={bid.id} className="glass-card rounded-xl border border-white/5 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">{externalLoad.pickup_city || "Pickup"}, {externalLoad.pickup_state || "—"}</span><span className="text-slate-600">→</span><span className="text-sm font-bold text-white">{externalLoad.delivery_city || "Delivery"}, {externalLoad.delivery_state || "—"}</span>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusClass(bid.status || "pending")}`}>{(bid.status || "pending").replaceAll("_", " ")}</span>
                      {locked && <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase text-amber-300">Locked</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500"><span className="flex items-center gap-1"><Truck className="h-3 w-3" />{getLoadEquipment(externalLoad) || "Equipment"}</span><span>{externalLoad.miles_total || "—"} mi</span><span>{externalLoad.weight ? `${Number(externalLoad.weight).toLocaleString()} lbs` : "Weight —"}</span><span>{externalLoad.commodity || "Commodity —"}</span></div>
                    {bid.dispatcher_counter_amount && <div className="mt-2 text-xs text-amber-300">Counter: ${Number(bid.dispatcher_counter_amount).toLocaleString()} {bid.dispatcher_notes ? `· ${bid.dispatcher_notes}` : ""}</div>}
                  </div>
                  <div className="min-w-[220px] rounded-xl border border-white/5 bg-white/[0.03] p-3"><div className="text-sm font-semibold text-white">{driver.full_name || driver.name || "Driver"}</div><div className="mt-1 text-xs text-slate-500">{driver.vehicle_type || "Equipment"} · {driver.home_city || driver.city || "—"}, {driver.home_state || driver.state || "—"}</div><div className="mt-2 flex items-center gap-2 text-xs text-green-300"><ShieldCheck className="h-3.5 w-3.5" /> Match {bid.match_score || "—"}</div>{bid.driver_notes && <p className="mt-2 text-xs text-slate-400">{bid.driver_notes}</p>}</div>
                  <div className="flex flex-wrap gap-2 xl:justify-end"><button onClick={() => acceptBid(bid)} disabled={Boolean(actioning) || locked} className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-black disabled:opacity-50">{actioning === `${bid.id}-accept` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} {locked ? "Locked" : "Accept"}</button><button onClick={() => openCounterModal(bid)} disabled={Boolean(actioning) || locked} className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300 disabled:opacity-50">Counter</button><button onClick={() => updateBidStatus(bid, "rejected_by_dispatch")} disabled={Boolean(actioning)} className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Reject</button></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {counterBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setCounterBid(null)}>
          <div className="glass-card w-full max-w-lg rounded-2xl border border-white/10 p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-bold text-white">Send Counter Offer</h3><p className="text-sm text-slate-400">Adjust offer amount and add dispatcher note.</p></div><button onClick={() => setCounterBid(null)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div>
            <div className="space-y-3"><label className="block text-sm text-slate-300">Counter Amount</label><input type="number" value={counterAmount} onChange={(event) => setCounterAmount(event.target.value)} placeholder="Example: 950" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-600 focus:border-green-500/40 focus:outline-none" /><label className="block text-sm text-slate-300">Dispatcher Note</label><textarea value={counterNote} onChange={(event) => setCounterNote(event.target.value)} rows={4} placeholder="Example: Can approve if pickup before 2 PM." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-600 focus:border-green-500/40 focus:outline-none" /></div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setCounterBid(null)} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">Cancel</button><button onClick={submitCounterOffer} disabled={Boolean(actioning)} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-60">{actioning === `${counterBid.id}-counter` ? "Sending…" : "Send Counter"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ title, value, icon }) {
  return <div className="glass-card rounded-xl border border-white/5 p-4"><div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500"><span>{title}</span>{icon}</div><div className="mt-2 text-2xl font-bold text-white">{value}</div></div>;
}
