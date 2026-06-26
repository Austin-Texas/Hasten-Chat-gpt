import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { DRIVER_SCAN_CONFIG } from "@/lib/hastenMasterSpec";
import { ScanLine, ChevronLeft, Package, Sparkles, CheckCircle2 } from "lucide-react";
import DocumentOCRProcessor from "@/components/driver/DocumentOCRProcessor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ACTIVE_SCAN_STATUSES = [
  "assigned",
  "accepted",
  "en_route",
  "arrived_pickup",
  "loaded",
  "in_transit",
  "arrived_delivery",
  "delivered",
];

function getDriverLookupIds(user, driverRecord) {
  return [...new Set([user?.id, user?.linkedDriverId, driverRecord?.id, driverRecord?.user_id].filter(Boolean))];
}

function formatLoadRoute(load) {
  const origin = [load.origin_city || load.pickup_city, load.origin_state || load.pickup_state].filter(Boolean).join(", ");
  const destination = [load.destination_city || load.delivery_city, load.destination_state || load.delivery_state].filter(Boolean).join(", ");
  return `${origin || "Pickup"} → ${destination || "Delivery"}`;
}

export default function DriverScan({ user }) {
  const [loads, setLoads] = useState([]);
  const [selectedLoadId, setSelectedLoadId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchLoads = async () => {
      setLoading(true);
      try {
        let driverRecord = null;
        if (user?.id) {
          const drivers = await base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1).catch(() => []);
          driverRecord = drivers?.[0] || null;
        }

        const lookupIds = getDriverLookupIds(user, driverRecord);
        const allLoads = await base44.entities.Load.list("-created_date", 100);
        const driverLoads = (allLoads || []).filter((load) =>
          lookupIds.includes(load.driver_id) && ACTIVE_SCAN_STATUSES.includes(load.status)
        );

        if (mounted) {
          setLoads(driverLoads);
          setSelectedLoadId((current) => driverLoads.find((load) => load.id === current)?.id || driverLoads[0]?.id || "");
        }
      } catch (error) {
        console.error("Driver scan load fetch failed", error);
        if (mounted) setLoads([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLoads();
    return () => { mounted = false; };
  }, [user?.id, user?.linkedDriverId]);

  const selectedLoad = loads.find((load) => load.id === selectedLoadId);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Link to="/driver/dashboard" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-green-400">Driver</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-white">
            <ScanLine className="h-6 w-6 text-green-400" />
            {DRIVER_SCAN_CONFIG.title}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{DRIVER_SCAN_CONFIG.subtitle}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-300" />
          <div>
            <h2 className="font-bold text-white">AI extraction fields</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {DRIVER_SCAN_CONFIG.extractionFields.map((field) => (
                <div key={field} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-200">
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-green-400" />
                  {field}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
        </div>
      ) : loads.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Package className="mx-auto mb-2 h-10 w-10 text-slate-600" />
          <p className="text-sm text-slate-400">No active loads to scan documents for.</p>
          <Link to="/driver/loads" className="mt-3 inline-block text-sm text-green-400 hover:underline">
            View available loads →
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              Select Load
            </label>
            <Select value={selectedLoadId} onValueChange={setSelectedLoadId}>
              <SelectTrigger className="border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="Choose a load to attach BOL, POD, or receipt..." />
              </SelectTrigger>
              <SelectContent>
                {loads.map((load) => (
                  <SelectItem key={load.id} value={load.id}>
                    {load.load_number || `#${load.id.slice(-6)}`} — {formatLoadRoute(load)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLoad ? (
            <DocumentOCRProcessor load={selectedLoad} />
          ) : (
            <div className="glass-card rounded-2xl p-8 text-center">
              <ScanLine className="mx-auto mb-2 h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">Select a load above to start scanning documents.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
