import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Check, X, Clock, MapPin, Package, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import { createLoadWithWorkflow, logDispatcherEvent } from "@/lib/dispatcherWorkflow";

const SAMPLE_QUOTES = [
  { status: "pending", requester_name: "Shipper 1", requester_email: "shipper1@example.com", requester_phone: "555-1000", company_name: "Company 1", origin_city: "Denver", origin_state: "CO", origin_zip: "80000", destination_city: "Los Angeles", destination_state: "CA", destination_zip: "90000", pickup_date: new Date(Date.now() + 86400000).toISOString(), delivery_date: new Date(Date.now() + 4 * 86400000).toISOString(), equipment_type: "Dry Van", commodity: "General Cargo", weight: 18000, pieces: 12, is_hazmat: false, estimated_miles: 1015, quoted_rate: 2400 },
  { status: "quoted", requester_name: "Shipper 2", requester_email: "shipper2@example.com", requester_phone: "555-1001", company_name: "Company 2", origin_city: "Dallas", origin_state: "TX", origin_zip: "75201", destination_city: "New York", destination_state: "NY", destination_zip: "10001", pickup_date: new Date(Date.now() + 2 * 86400000).toISOString(), delivery_date: new Date(Date.now() + 5 * 86400000).toISOString(), equipment_type: "Reefer", commodity: "Temperature controlled freight", weight: 26000, pieces: 18, is_hazmat: false, estimated_miles: 1548, quoted_rate: 3900 },
  { status: "approved", requester_name: "Shipper 3", requester_email: "shipper3@example.com", requester_phone: "555-1002", company_name: "Company 3", origin_city: "Atlanta", origin_state: "GA", origin_zip: "30301", destination_city: "Houston", destination_state: "TX", destination_zip: "77001", pickup_date: new Date(Date.now() + 3 * 86400000).toISOString(), delivery_date: new Date(Date.now() + 6 * 86400000).toISOString(), equipment_type: "Flatbed", commodity: "Machinery", weight: 32000, pieces: 4, is_hazmat: false, estimated_miles: 793, quoted_rate: 2600 },
];

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [workingId, setWorkingId] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchQuotes();
    let unsub = () => undefined;
    try {
      unsub = base44.entities.QuoteRequest.subscribe?.(() => fetchQuotes()) || unsub;
    } catch (err) {
      console.warn("[Quotes] subscribe fallback:", err?.message || err);
    }
    return () => typeof unsub === "function" && unsub();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    setError("");
    try {
      const records = await base44.entities.QuoteRequest.list("-created_date", 100);
      setQuotes(records || []);
      return records || [];
    } catch (err) {
      console.error("[Quotes] fetch failed:", err);
      setError(err.message || "Quote Request API is not configured.");
      setQuotes([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const seedSampleQuotes = async () => {
    setSeeding(true);
    setNotice("");
    setError("");
    try {
      const created = [];
      for (const sample of SAMPLE_QUOTES) {
        const record = await base44.entities.QuoteRequest.create({
          ...sample,
          source: "dispatcher_dev_seed",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        created.push(record);
      }
      await logDispatcherEvent("QUOTE_TEST_RECORDS_CREATED", {
        entity_type: "QuoteRequest",
        title: "Quote test records created",
        description: `${created.length} quote request records created for dispatcher QA.`,
        quote_count: created.length,
      });
      setQuotes(prev => [...created, ...prev]);
      setNotice(`${created.length} quote requests created and counters refreshed.`);
      await fetchQuotes();
    } catch (err) {
      console.error("[Quotes] seed failed:", err);
      setError(err.message || "Create Test Quotes failed. Check QuoteRequest entity/API.");
    } finally {
      setSeeding(false);
    }
  };

  const updateQuoteStatus = async (quote, status) => {
    setWorkingId(quote.id);
    setNotice("");
    setError("");
    try {
      await base44.entities.QuoteRequest.update(quote.id, { status, updated_at: new Date().toISOString() });
      await logDispatcherEvent("QUOTE_STATUS_UPDATED", {
        entity_type: "QuoteRequest",
        entity_id: quote.id,
        title: `Quote ${status}`,
        description: `${quote.company_name || quote.requester_name || "Quote"} changed to ${status}.`,
      });
      setNotice(`Quote moved to ${status}.`);
      await fetchQuotes();
    } catch (err) {
      console.error("[Quotes] update failed:", err);
      setError(err.message || "Quote status update failed.");
    } finally {
      setWorkingId(null);
    }
  };

  const convertQuoteToLoad = async (quote) => {
    setWorkingId(quote.id);
    setNotice("");
    setError("");
    try {
      const miles = quote.estimated_miles || quote.miles || quote.miles_total || 0;
      const rate = quote.quoted_rate || quote.rate || quote.estimated_rate || 0;
      const load = await createLoadWithWorkflow({
        customer_id: quote.customer_id,
        client_id: quote.customer_id,
        load_number: `Q-${String(quote.id || Date.now()).slice(-8).toUpperCase()}`,
        source_type: "quote_request",
        quote_request_id: quote.id,
        status: "available",
        origin_city: quote.origin_city,
        origin_state: quote.origin_state,
        origin_zip: quote.origin_zip,
        destination_city: quote.destination_city,
        destination_state: quote.destination_state,
        destination_zip: quote.destination_zip,
        pickup_date: quote.pickup_date,
        delivery_date: quote.delivery_date,
        pickup_datetime_start: quote.pickup_date,
        delivery_datetime_end: quote.delivery_date,
        equipment_type: quote.equipment_type,
        commodity: quote.commodity,
        weight: quote.weight,
        miles,
        miles_total: miles,
        rate,
        total_revenue: rate,
        rate_per_mile: miles > 0 && rate > 0 ? Number((rate / miles).toFixed(2)) : undefined,
        is_hazmat: quote.is_hazmat,
        notes: `Converted from quote request for ${quote.company_name || quote.requester_name || "customer"}.`,
      });

      await base44.entities.QuoteRequest.update(quote.id, {
        status: "approved",
        converted_load_id: load.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await logDispatcherEvent("QUOTE_CONVERTED_TO_LOAD", {
        entity_type: "QuoteRequest",
        entity_id: quote.id,
        load_id: load.id,
        title: "Quote converted to load",
        description: `${quote.origin_city}, ${quote.origin_state} → ${quote.destination_city}, ${quote.destination_state}`,
      });
      setNotice(`Quote approved and load ${load.load_number || load.id} created.`);
      await fetchQuotes();
    } catch (err) {
      console.error("[Quotes] convert failed:", err);
      setError(err.message || "Quote conversion failed.");
    } finally {
      setWorkingId(null);
    }
  };

  const filtered = quotes.filter(q => filter === "all" ? true : q.status === filter);

  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === "pending").length,
    quoted: quotes.filter(q => q.status === "quoted").length,
    approved: quotes.filter(q => q.status === "approved").length,
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Quote Requests</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage incoming shipping quote requests</p>
      </div>

      {notice && <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">{notice}</div>}
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {quotes.length === 0 && !loading && (
        <div className="glass-card rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-amber-400 font-semibold text-sm">No quote requests yet</p>
              <p className="text-slate-400 text-xs mt-1">Use this QA action only to verify QuoteRequest persistence, counters, and dispatcher conversion.</p>
            </div>
            <button
              onClick={seedSampleQuotes}
              disabled={seeding}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              {seeding ? "Creating…" : "Create Test Quotes"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Requests</div><div className="text-2xl font-bold text-white">{stats.total}</div><div className="text-slate-500 text-xs mt-1">all time</div></div>
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-2">Pending</div><div className="text-2xl font-bold text-amber-400">{stats.pending}</div><div className="text-slate-500 text-xs mt-1">awaiting quote</div></div>
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-2">Quoted</div><div className="text-2xl font-bold text-blue-400">{stats.quoted}</div><div className="text-slate-500 text-xs mt-1">sent to client</div></div>
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="text-slate-400 text-xs font-semibold uppercase mb-2">Approved</div><div className="text-2xl font-bold text-green-400">{stats.approved}</div><div className="text-slate-500 text-xs mt-1">converted to loads</div></div>
      </div>

      <div className="flex gap-2">
        {[
          { key: "pending", label: "Pending", count: stats.pending },
          { key: "quoted", label: "Quoted", count: stats.quoted },
          { key: "approved", label: "Approved", count: stats.approved },
          { key: "all", label: "All", count: stats.total },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.key ? "bg-orange-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}>
            {f.label} {f.count > 0 && `(${f.count})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl border border-white/5 p-8 text-center"><FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No quotes in this category</p></div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
          {filtered.map(quote => {
            const isExpanded = expandedId === quote.id;
            const busy = workingId === quote.id;
            return (
              <div key={quote.id}>
                <button onClick={() => setExpandedId(isExpanded ? null : quote.id)} className="w-full p-5 text-left hover:bg-white/2 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2"><span className="text-white font-semibold">{quote.company_name || quote.requester_name}</span><StatusBadge status={quote.status} /></div>
                      <div className="flex items-center gap-4 text-slate-400 text-sm flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{quote.origin_city}, {quote.origin_state} → {quote.destination_city}, {quote.destination_state}</span>
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" />{quote.equipment_type}</span>
                        {quote.pickup_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(quote.pickup_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    {busy ? <Loader2 className="w-4 h-4 text-orange-400 animate-spin" /> : <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-white/5 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Detail label="Contact"><div className="text-white text-sm font-medium">{quote.requester_name}</div><div className="text-slate-400 text-xs">{quote.requester_email}</div><div className="text-slate-400 text-xs">{quote.requester_phone}</div></Detail>
                      <Detail label="Cargo"><div className="text-white">{quote.weight ? `${Number(quote.weight).toLocaleString()} lbs` : "—"} {quote.pieces ? `• ${quote.pieces} pieces` : ""}</div><div className="text-slate-400">{quote.commodity || "Not specified"}</div>{quote.is_hazmat && <div className="text-red-400 text-xs font-semibold">⚠ HAZMAT</div>}</Detail>
                      <Detail label="Pickup"><div className="text-white">{quote.origin_city}, {quote.origin_state} {quote.origin_zip}</div><div className="text-slate-400">{quote.pickup_date ? new Date(quote.pickup_date).toLocaleDateString() : "—"}</div></Detail>
                      <Detail label="Delivery"><div className="text-white">{quote.destination_city}, {quote.destination_state} {quote.destination_zip}</div><div className="text-slate-400">{quote.delivery_date ? new Date(quote.delivery_date).toLocaleDateString() : "—"}</div></Detail>
                    </div>

                    {quote.special_requirements && <Detail label="Special Requirements"><div className="text-slate-300 text-sm">{quote.special_requirements}</div></Detail>}

                    <div className="flex gap-2 pt-2 border-t border-white/5 flex-wrap">
                      {quote.status === "pending" && (
                        <>
                          <button disabled={busy} className="flex-1 min-w-[140px] px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-60" onClick={() => updateQuoteStatus(quote, "quoted")}><Check className="w-4 h-4 inline mr-2" />Send Quote</button>
                          <button disabled={busy} className="flex-1 min-w-[140px] px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-60" onClick={() => updateQuoteStatus(quote, "rejected")}><X className="w-4 h-4 inline mr-2" />Reject</button>
                        </>
                      )}
                      {quote.status === "quoted" && <button disabled={busy} className="flex-1 min-w-[160px] px-4 py-2 rounded-lg bg-green-500 text-slate-950 text-sm font-semibold hover:bg-green-400 transition-colors disabled:opacity-60" onClick={() => convertQuoteToLoad(quote)}>{busy ? <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> : <Check className="w-4 h-4 inline mr-2" />}Approve & Create Load</button>}
                      {quote.status === "approved" && quote.converted_load_id && <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">Converted load ID: {quote.converted_load_id}</div>}
                    </div>
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

function Detail({ label, children }) {
  return (
    <div>
      <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">{label}</div>
      <div className="space-y-0.5 text-sm">{children}</div>
    </div>
  );
}
