import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Download, FileText, CheckCircle } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function InvoiceGeneratorModal({ loads, clients, onClose, onInvoiceGenerated }) {
  const [selectedLoads, setSelectedLoads] = useState(new Set(loads.slice(0, 5).map(l => l.id)));
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id || "");
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(null);

  const toggleLoad = (id) => {
    const next = new Set(selectedLoads);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedLoads(next);
  };

  const selectAllLoads = () => {
    setSelectedLoads(new Set(loads.map(l => l.id)));
  };

  const clearLoads = () => {
    setSelectedLoads(new Set());
  };

  const generate = async () => {
    if (selectedLoads.size === 0 || !selectedClient) return;
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateInvoice', {
        loadIds: Array.from(selectedLoads),
        clientId: selectedClient,
      });
      setSuccess(res.data);
      onInvoiceGenerated?.();
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to generate invoice: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl border border-white/10 p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-white font-heading font-bold text-xl mb-2">Invoice Generated</h2>
          <p className="text-slate-400 text-sm mb-1">Invoice #{success.invoiceNumber}</p>
          <p className="text-green-400 font-bold text-lg">${success.total.toLocaleString()}</p>
          <p className="text-slate-500 text-xs mt-3">Redirecting...</p>
        </div>
      </div>
    );
  }

  const totalAmount = Array.from(selectedLoads)
    .map(id => loads.find(l => l.id === id))
    .reduce((s, l) => s + (l?.rate || 0), 0);

  const clientName = clients.find(c => c.id === selectedClient)?.company_name || "Select Client";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-white/5 bg-card">
          <div>
            <h2 className="text-white font-heading font-bold text-lg">Generate Invoice</h2>
            <p className="text-slate-400 text-xs mt-0.5">Create a professional PDF invoice for your client</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Client Selection */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">Bill To</label>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            >
              <option value="">Select a client…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} style={{ background: '#0F1829' }}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Load Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white text-sm font-semibold">Select Loads ({selectedLoads.size})</label>
              <div className="flex gap-1.5">
                <button
                  onClick={selectAllLoads}
                  className="text-orange-400 text-xs font-medium hover:text-orange-300 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearLoads}
                  className="text-slate-500 text-xs font-medium hover:text-slate-400 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {loads.map(load => (
                <button
                  key={load.id}
                  onClick={() => toggleLoad(load.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                    selectedLoads.has(load.id)
                      ? "bg-orange-500/10 border-orange-500/25"
                      : "bg-white/3 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    selectedLoads.has(load.id) ? "bg-orange-500 border-orange-500" : "border-slate-500"
                  }`}>
                    {selectedLoads.has(load.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-orange-400 font-mono font-bold text-xs">
                        {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                      </span>
                      <span className="text-slate-400 text-xs flex-1 truncate">
                        {load.origin_city} → {load.destination_city}
                      </span>
                    </div>
                    <div className="text-slate-500 text-xs">
                      {load.miles} mi · ${(load.rate || 0).toLocaleString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="glass-card rounded-xl p-4 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Loads Selected:</span>
              <span className="text-white font-semibold">{selectedLoads.size}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Subtotal:</span>
              <span className="text-white font-semibold">${totalAmount.toLocaleString()}</span>
            </div>
            <div className="h-px bg-white/5 my-2" />
            <div className="flex items-center justify-between text-lg">
              <span className="text-white font-bold">Invoice Total:</span>
              <span className="text-green-400 font-bold">${totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 flex items-center gap-2 p-5 border-t border-white/5 bg-card">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={generate}
            disabled={selectedLoads.size === 0 || !selectedClient || generating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Invoice PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}