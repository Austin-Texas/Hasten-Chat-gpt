import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, FileText, Download, Filter, Eye } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import InvoiceDetailModal from "@/components/client/InvoiceDetailModal";

export default function ClientInvoices({ client }) {
  const [invoices, setInvoices] = useState([]);
  const [loads, setLoads] = useState({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    if (!client?.id) return;

    const fetchData = async () => {
      try {
        // Fetch invoices for this client
        const clientInvoices = await base44.entities.Invoice.filter(
          { client_id: client.id },
          "-created_date",
          100
        );

        // Fetch associated loads
        const loadIds = [...new Set(clientInvoices.map(inv => inv.load_id).filter(Boolean))];
        const loadData = {};
        for (const loadId of loadIds) {
          try {
            const load = await base44.entities.Load.get(loadId);
            if (load) loadData[loadId] = load;
          } catch (err) {
            // Load not found
          }
        }

        setInvoices(clientInvoices);
        setLoads(loadData);
      } catch (err) {
        console.error("Error fetching invoices:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const unsub = base44.entities.Invoice.subscribe(() => fetchData());
    return () => unsub();
  }, [client?.id]);

  const filteredInvoices = invoices.filter(inv => {
    if (filter === "all") return true;
    return inv.status === filter;
  });

  const stats = {
    total: invoices.length,
    pending: invoices.filter(inv => inv.status === "draft" || inv.status === "sent").length,
    paid: invoices.filter(inv => inv.status === "paid").length,
    overdue: invoices.filter(inv => inv.status === "overdue").length,
    totalAmount: invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Invoices</h1>
        <p className="text-slate-400 text-sm mt-0.5">View and manage your shipment invoices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Amount</div>
          <div className="text-2xl font-bold text-green-400">${(stats.totalAmount / 1000).toFixed(1)}k</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Paid</div>
          <div className="text-2xl font-bold text-green-400">{stats.paid}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Pending</div>
          <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Overdue</div>
          <div className="text-2xl font-bold text-red-400">{stats.overdue}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">
        {["all", "sent", "paid", "overdue"].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-150 ${
              filter === status ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No invoices found</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid grid-cols-6 gap-4 px-6 py-3 border-b border-white/5 bg-white/2 text-xs text-slate-500 uppercase tracking-wider">
              <span>Invoice #</span>
              <span>Load</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Due Date</span>
              <span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-white/5">
              {filteredInvoices.map(inv => {
                const load = loads[inv.load_id];
                return (
                  <div key={inv.id} className="p-6 hover:bg-white/2 transition-colors">
                    <div className="flex flex-col lg:grid lg:grid-cols-6 gap-4 lg:items-center">
                      <div>
                        <div className="lg:hidden text-slate-500 text-xs uppercase mb-1">Invoice #</div>
                        <span className="text-white font-mono font-bold">{inv.invoice_number}</span>
                      </div>
                      <div>
                        <div className="lg:hidden text-slate-500 text-xs uppercase mb-1">Load</div>
                        <span className="text-slate-300 text-sm">{load?.load_number || "—"}</span>
                      </div>
                      <div>
                        <div className="lg:hidden text-slate-500 text-xs uppercase mb-1">Amount</div>
                        <span className={`text-sm font-bold ${inv.status === "paid" ? "text-green-400" : "text-white"}`}>
                          ${(inv.total_amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <div className="lg:hidden text-slate-500 text-xs uppercase mb-1">Status</div>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div>
                        <div className="lg:hidden text-slate-500 text-xs uppercase mb-1">Due Date</div>
                        <span className="text-slate-400 text-sm">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                        </span>
                      </div>
                      <div className="lg:text-right flex items-center gap-2 justify-end">
                        <button onClick={() => setSelectedInvoice(inv)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/25 text-orange-400 hover:bg-orange-500/25 transition-colors text-xs font-medium">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">View</span>
                        </button>
                        {inv.pdf_url && (
                          <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors text-xs">
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">PDF</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          load={loads[selectedInvoice.load_id]}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}