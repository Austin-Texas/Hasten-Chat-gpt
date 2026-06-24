import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Loader2, AlertCircle, Check, Plus } from "lucide-react";

const DEFAULT_DETENTION_HOURS = 2; // Free time before charges apply
const DETENTION_RATE_PER_HOUR = 50; // $ per hour after free time

export default function DetentionTracker() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detentionData, setDetentionData] = useState([]);
  const [selectedRate, setSelectedRate] = useState(DETENTION_RATE_PER_HOUR);
  const [freeHours, setFreeHours] = useState(DEFAULT_DETENTION_HOURS);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(new Set());

  useEffect(() => {
    base44.entities.Load.list("-updated_date", 300)
      .then(lds => {
        setLoads(lds);
        calculateDetention(lds);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const calculateDetention = (loadList) => {
    const detentionList = loadList
      .filter(load => {
        const atFacility = ["arrived_pickup", "loaded", "arrived_delivery"].includes(load.status);
        const hasTimestamps = load.actual_pickup && (load.loaded || load.actual_delivery);
        return atFacility || hasTimestamps;
      })
      .map(load => {
        let facilityStartTime = null;
        let facilityEndTime = null;
        let facilityType = "";

        // Pickup detention
        if (load.actual_pickup) {
          facilityStartTime = new Date(load.actual_pickup);
          if (load.loaded) {
            facilityEndTime = new Date(load.loaded);
            facilityType = "pickup";
          } else if (load.status === "arrived_pickup") {
            facilityEndTime = new Date();
            facilityType = "pickup";
          }
        }

        // Delivery detention
        if (load.actual_delivery) {
          facilityStartTime = new Date(load.actual_delivery);
          facilityEndTime = new Date();
          facilityType = "delivery";
        } else if (load.status === "arrived_delivery" && load.actual_delivery) {
          facilityStartTime = new Date(load.actual_delivery);
          facilityEndTime = new Date();
          facilityType = "delivery";
        }

        if (!facilityStartTime || !facilityEndTime) {
          return null;
        }

        const detentionMs = facilityEndTime - facilityStartTime;
        const detentionHours = Math.round((detentionMs / (1000 * 60 * 60)) * 100) / 100;
        const chargeableHours = Math.max(0, detentionHours - freeHours);
        const detentionFee = Math.round(chargeableHours * selectedRate * 100) / 100;

        return {
          loadId: load.id,
          loadNumber: load.load_number,
          status: load.status,
          origin: `${load.origin_city}, ${load.origin_state}`,
          destination: `${load.destination_city}, ${load.destination_state}`,
          clientId: load.client_id,
          invoiceId: load.invoice_id,
          facilityType,
          arrivalTime: facilityStartTime,
          releaseTime: facilityEndTime,
          detentionHours,
          chargeableHours,
          detentionFee,
          status: detentionFee > 0 ? "pending" : "none",
        };
      })
      .filter(d => d !== null)
      .sort((a, b) => b.detentionFee - a.detentionFee);

    setDetentionData(detentionList);
  };

  const stats = {
    totalDetentions: detentionData.filter(d => d.detentionFee > 0).length,
    totalFees: detentionData.reduce((s, d) => s + d.detentionFee, 0),
    highestFee: detentionData.length > 0 ? Math.max(...detentionData.map(d => d.detentionFee)) : 0,
  };

  const applyChargeToInvoice = async (detention) => {
    if (!detention.invoiceId || applied.has(detention.loadId)) return;

    setApplying(true);
    try {
      // Fetch the invoice
      const invoice = await base44.asServiceRole.entities.Invoice.filter({ id: detention.invoiceId }, "", 1);
      
      if (invoice.length > 0) {
        const inv = invoice[0];
        const updatedDetention = (inv.detention || 0) + detention.detentionFee;
        const updatedTotal = (inv.total_amount || 0) + detention.detentionFee;

        // Update invoice with detention charge
        await base44.asServiceRole.entities.Invoice.update(detention.invoiceId, {
          detention: updatedDetention,
          total_amount: updatedTotal,
        });

        setApplied(prev => new Set(prev).add(detention.loadId));
      }
    } catch (err) {
      console.error("Failed to apply detention charge:", err);
      alert("Error applying charge: " + err.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Loads with Detention</div>
          <div className="text-2xl font-bold text-white">{stats.totalDetentions}</div>
          <div className="text-slate-500 text-xs mt-1">chargeable hours</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Fees</div>
          <div className="text-2xl font-bold text-orange-400">${stats.totalFees.toLocaleString()}</div>
          <div className="text-slate-500 text-xs mt-1">potential revenue</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Highest Charge</div>
          <div className="text-2xl font-bold text-amber-400">${stats.highestFee.toLocaleString()}</div>
          <div className="text-slate-500 text-xs mt-1">single load</div>
        </div>
      </div>

      {/* Settings */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Detention Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Free Hours Before Charges</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={freeHours}
              onChange={(e) => {
                const newHours = parseFloat(e.target.value) || 0;
                setFreeHours(newHours);
                calculateDetention(loads);
              }}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/40"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase mb-2">Rate ($/hour)</label>
            <input
              type="number"
              min="0"
              step="5"
              value={selectedRate}
              onChange={(e) => {
                const newRate = parseFloat(e.target.value) || 0;
                setSelectedRate(newRate);
                calculateDetention(loads);
              }}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/40"
            />
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-400">
          Example: 2 hour free time + 3 hours detention = 1 chargeable hour × ${selectedRate}/hr = ${(1 * selectedRate).toLocaleString()}
        </div>
      </div>

      {/* Detention Table */}
      {loading ? (
        <div className="glass-card rounded-xl p-8 flex items-center justify-center text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Analyzing loads...
        </div>
      ) : detentionData.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-slate-500">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No detention data available</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Load</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Route</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Arrival</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Duration</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Chargeable</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Fee</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {detentionData.map(detention => (
                  <tr key={detention.loadId} className={`hover:bg-white/2 transition-colors ${detention.detentionFee > 0 ? "" : "opacity-60"}`}>
                    <td className="px-5 py-3">
                      <span className="text-orange-400 font-mono text-xs font-bold">{detention.loadNumber || `#LD${detention.loadId.slice(-6)}`}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-slate-300 text-xs">
                        <span className="block">{detention.origin}</span>
                        <span className="block text-slate-500">→ {detention.destination}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${detention.facilityType === "pickup" ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"}`}>
                        {detention.facilityType === "pickup" ? "PICKUP" : "DELIVERY"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-400 text-xs">
                      {detention.arrivalTime.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-300 text-sm">
                      {detention.detentionHours}h
                    </td>
                    <td className="px-5 py-3 text-right">
                      {detention.chargeableHours > 0 ? (
                        <span className="text-amber-400 font-semibold">{detention.chargeableHours}h</span>
                      ) : (
                        <span className="text-slate-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {detention.detentionFee > 0 ? (
                        <span className="text-orange-400 font-bold">${detention.detentionFee.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-500">$0</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {detention.detentionFee > 0 && !applied.has(detention.loadId) && detention.invoiceId ? (
                        <button
                          onClick={() => applyChargeToInvoice(detention)}
                          disabled={applying}
                          className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50 transition-colors text-xs font-semibold"
                        >
                          <Plus className="w-3 h-3" />
                          Apply
                        </button>
                      ) : applied.has(detention.loadId) ? (
                        <div className="flex items-center justify-center gap-1 text-green-400 text-xs font-semibold">
                          <Check className="w-3 h-3" />
                          Applied
                        </div>
                      ) : detention.detentionFee === 0 ? (
                        <span className="text-slate-500 text-xs">No charge</span>
                      ) : (
                        <span className="text-slate-500 text-xs">No invoice</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="px-5 py-4 bg-orange-500/5 border-t border-orange-500/20">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Detention Hours</div>
                <div className="text-white font-bold">{detentionData.reduce((s, d) => s + d.chargeableHours, 0).toFixed(2)}h</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Potential Revenue</div>
                <div className="text-orange-400 font-bold">${stats.totalFees.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Applied</div>
                <div className="text-green-400 font-bold">{applied.size} / {stats.totalDetentions}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="glass-card-orange rounded-xl p-4 border border-orange-500/20 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-orange-100">
          <p className="font-semibold">Detention charges are automatically calculated</p>
          <p className="text-orange-100/70 mt-1">Based on load status timestamps. Click "Apply" to add charges to pending invoices. These charges are for facility delays and should be billed to the client.</p>
        </div>
      </div>
    </div>
  );
}