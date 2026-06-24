import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Check, Loader2, FileText } from "lucide-react";

export default function BulkInvoiceModal({ loads, clients, onClose, onInvoiceGenerated }) {
  const [selectedLoadIds, setSelectedLoadIds] = useState(new Set());
  const [selectedClientId, setSelectedClientId] = useState("");
  const [generating, setGenerating] = useState(false);

  const completedLoads = loads.filter(l => l.status === "completed");
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const selectedClient = selectedClientId ? clientMap[selectedClientId] : null;
  const selectedLoads = completedLoads.filter(l => selectedLoadIds.has(l.id));
  const totalAmount = selectedLoads.reduce((s, l) => s + (l.rate || 0) + (l.fuel_surcharge || 0) + (l.accessorial_charges || 0), 0);

  const toggleLoadSelect = (id) => {
    const newSet = new Set(selectedLoadIds);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedLoadIds(newSet);
  };

  const toggleAllLoads = () => {
    if (selectedLoadIds.size === completedLoads.length) {
      setSelectedLoadIds(new Set());
    } else {
      setSelectedLoadIds(new Set(completedLoads.map(l => l.id)));
    }
  };

  const handleGenerate = async () => {
    if (!selectedClient || selectedLoadIds.size === 0) return;
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateConsolidatedInvoice', {
        loadIds: Array.from(selectedLoadIds),
        clientId: selectedClientId,
      });
      if (res.data.success) {
        onInvoiceGenerated();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-heading font-semibold">Bulk Invoice</h2>
              <p className="text-slate-400 text-xs">Create a consolidated invoice from multiple loads</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Client Selection */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Select Client</label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              style={{ background: "#0F1829" }}
            >
              <option value="" style={{ background: "#0F1829" }}>Choose a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} style={{ background: "#0F1829" }}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Load Selection */}
          {selectedClient && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-white text-sm font-medium">Select Loads ({selectedLoadIds.size})</label>
                <button
                  onClick={toggleAllLoads}
                  className="text-orange-400 hover:text-orange-300 text-xs font-medium transition-colors"
                >
                  {selectedLoadIds.size === completedLoads.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-white/5 rounded-lg p-3">
                {completedLoads.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No completed loads available</p>
                ) : (
                  completedLoads.map(load => {
                    const isSelected = selectedLoadIds.has(load.id);
                    const loadAmount = (load.rate || 0) + (load.fuel_surcharge || 0) + (load.accessorial_charges || 0);
                    return (
                      <label
                        key={load.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${isSelected ? "border-orange-500/40 bg-orange-500/5" : "border-white/5 hover:bg-white/2"}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleLoadSelect(load.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-orange-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium">
                            {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                          </div>
                          <div className="text-slate-400 text-xs">
                            {load.origin_city} → {load.destination_city}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-white text-sm font-semibold">${loadAmount.toLocaleString()}</div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedLoadIds.size > 0 && (
            <div className="glass-card rounded-lg p-4 border border-orange-500/20 bg-orange-500/5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Loads</div>
                  <div className="text-white text-xl font-bold">{selectedLoadIds.size}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Amount</div>
                  <div className="text-green-400 text-xl font-bold">${totalAmount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Client</div>
                  <div className="text-white text-sm font-medium">{selectedClient?.company_name || "—"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-white/5 sticky bottom-0 bg-opacity-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!selectedClient || selectedLoadIds.size === 0 || generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Generate Consolidated Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}