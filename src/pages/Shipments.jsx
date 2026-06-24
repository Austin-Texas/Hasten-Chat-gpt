import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package, Plus, ChevronRight, Loader2, Filter, X } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import { Link } from "react-router-dom";

const SHIPMENT_STATUSES = [
  "quote_received", "quote_approved", "load_created", "dispatched", "in_transit", "delivered", "invoiced", "paid", "cancelled"
];

export default function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [loads, setLoads] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedLoads, setSelectedLoads] = useState(new Set());
  const [filters, setFilters] = useState({ status: "", client: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Shipment.list("-created_date", 200),
      base44.entities.Load.list("-created_date", 300),
      base44.entities.Client.list("-created_date", 100),
    ])
      .then(([ships, lds, cls]) => {
        setShipments(ships);
        setLoads(lds);
        setClients(cls);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const loadMap = Object.fromEntries(loads.map(l => [l.id, l]));

  // Enrich shipments with load counts and totals
  const enrichedShipments = shipments
    .map(ship => {
      const shipLoads = loads.filter(l => l.shipment_id === ship.id);
      const totalWeight = shipLoads.reduce((s, l) => s + (l.weight || 0), 0);
      const totalMiles = shipLoads.reduce((s, l) => s + (l.miles || 0), 0);
      const totalValue = shipLoads.reduce((s, l) => s + (l.rate || 0), 0);
      return {
        ...ship,
        shipLoads,
        loadCount: shipLoads.length,
        totalWeight,
        totalMiles,
        totalValue: Math.round(totalValue * 100) / 100,
        client: clientMap[ship.client_id],
      };
    })
    .filter(ship => {
      if (filters.status && ship.status !== filters.status) return false;
      if (filters.client && ship.client_id !== filters.client) return false;
      return true;
    })
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const availableLoads = loads.filter(l => !l.shipment_id && !selectedLoads.has(l.id));

  const handleCreateShipment = async () => {
    if (!selectedClient || selectedLoads.size === 0) {
      alert("Select a client and at least one load");
      return;
    }

    setCreating(true);
    try {
      const shipmentNumber = `SHP-${Date.now().toString().slice(-8)}`;
      const selectedLoadIds = Array.from(selectedLoads);
      const selectedLoadObjs = selectedLoadIds.map(id => loadMap[id]);
      
      const totalWeight = selectedLoadObjs.reduce((s, l) => s + (l.weight || 0), 0);
      const totalMiles = selectedLoadObjs.reduce((s, l) => s + (l.miles || 0), 0);
      const quotedRate = selectedLoadObjs.reduce((s, l) => s + (l.rate || 0), 0);

      // Create shipment
      const shipment = await base44.asServiceRole.entities.Shipment.create({
        shipment_number: shipmentNumber,
        status: "load_created",
        client_id: selectedClient,
        origin_address: selectedLoadObjs[0]?.origin_address || "",
        origin_city: selectedLoadObjs[0]?.origin_city || "",
        origin_state: selectedLoadObjs[0]?.origin_state || "",
        origin_zip: selectedLoadObjs[0]?.origin_zip || "",
        destination_address: selectedLoadObjs[selectedLoadObjs.length - 1]?.destination_address || "",
        destination_city: selectedLoadObjs[selectedLoadObjs.length - 1]?.destination_city || "",
        destination_state: selectedLoadObjs[selectedLoadObjs.length - 1]?.destination_state || "",
        destination_zip: selectedLoadObjs[selectedLoadObjs.length - 1]?.destination_zip || "",
        weight: totalWeight,
        miles: totalMiles,
        quoted_rate: quotedRate,
        equipment_type: selectedLoadObjs[0]?.equipment_type || "",
      });

      // Associate loads with shipment
      await Promise.all(
        selectedLoadIds.map(id => base44.asServiceRole.entities.Load.update(id, { shipment_id: shipment.id }))
      );

      // Refresh
      const updated = await base44.entities.Shipment.list("-created_date", 200);
      setShipments(updated);
      const updatedLoads = await base44.entities.Load.list("-created_date", 300);
      setLoads(updatedLoads);

      setSelectedClient("");
      setSelectedLoads(new Set());
      setShowNewModal(false);
    } catch (err) {
      console.error("Error creating shipment:", err);
      alert("Failed to create shipment");
    } finally {
      setCreating(false);
    }
  };

  const stats = {
    totalShipments: enrichedShipments.length,
    activeShipments: enrichedShipments.filter(s => !["delivered", "paid", "cancelled"].includes(s.status)).length,
    totalValue: enrichedShipments.reduce((s, ship) => s + ship.totalValue, 0),
    pendingLoads: loads.filter(l => !l.shipment_id).length,
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Shipments</h1>
          <p className="text-slate-400 text-sm mt-0.5">Multi-load consolidation for customers</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
        >
          <Plus className="w-4 h-4" /> New Shipment
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Shipments</div>
          <div className="text-2xl font-bold text-white">{stats.totalShipments}</div>
          <div className="text-slate-500 text-xs mt-1">{stats.activeShipments} active</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Shipment Value</div>
          <div className="text-2xl font-bold text-green-400">${stats.totalValue.toLocaleString()}</div>
          <div className="text-slate-500 text-xs mt-1">total revenue</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Unassigned Loads</div>
          <div className="text-2xl font-bold text-amber-400">{stats.pendingLoads}</div>
          <div className="text-slate-500 text-xs mt-1">awaiting consolidation</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Active Customers</div>
          <div className="text-2xl font-bold text-blue-400">
            {new Set(enrichedShipments.map(s => s.client_id)).size}
          </div>
          <div className="text-slate-500 text-xs mt-1">with shipments</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 flex gap-2 flex-wrap">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500/40"
            style={{ background: "#0F1829" }}
          >
            <option value="">All Statuses</option>
            {SHIPMENT_STATUSES.map(s => (
              <option key={s} value={s} style={{ background: "#0F1829" }}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={filters.client}
            onChange={(e) => setFilters({ ...filters, client: e.target.value })}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500/40"
            style={{ background: "#0F1829" }}
          >
            <option value="">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id} style={{ background: "#0F1829" }}>{c.company_name}</option>
            ))}
          </select>
        </div>
        {(filters.status || filters.client) && (
          <button
            onClick={() => setFilters({ status: "", client: "" })}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* New Shipment Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !creating && setShowNewModal(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative glass-card rounded-xl border border-white/10 max-w-2xl w-full max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-lg">Create New Shipment</h2>
                <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-slate-400 text-sm font-semibold mb-2">Select Customer</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/40"
                  style={{ background: "#0F1829" }}
                >
                  <option value="">Choose a customer...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id} style={{ background: "#0F1829" }}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-sm font-semibold mb-2">
                  Select Loads ({selectedLoads.size} selected)
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {availableLoads.map(load => (
                    <label key={load.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLoads.has(load.id)}
                        onChange={(e) => {
                          const next = new Set(selectedLoads);
                          e.target.checked ? next.add(load.id) : next.delete(load.id);
                          setSelectedLoads(next);
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium">{load.load_number || `#${load.id.slice(-6)}`}</div>
                        <div className="text-slate-500 text-xs">
                          {load.origin_city} → {load.destination_city}
                        </div>
                      </div>
                      <div className="text-green-400 text-xs font-bold">${(load.rate || 0).toLocaleString()}</div>
                    </label>
                  ))}
                </div>
                {availableLoads.length === 0 && (
                  <div className="text-center py-4 text-slate-500 text-sm">No unassigned loads</div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-white/5">
                <button
                  onClick={() => setShowNewModal(false)}
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateShipment}
                  disabled={creating || !selectedClient || selectedLoads.size === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium disabled:opacity-50 transition-all"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? "Creating..." : "Create Shipment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shipments List */}
      {loading ? (
        <div className="glass-card rounded-xl p-8 flex items-center justify-center text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading shipments...
        </div>
      ) : enrichedShipments.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-slate-500">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No shipments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrichedShipments.map(ship => (
            <Link
              key={ship.id}
              to={`/shipments/${ship.id}`}
              className="glass-card rounded-xl p-5 border border-white/5 hover:border-orange-500/20 hover:bg-orange-500/2 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-orange-400 font-mono font-bold">{ship.shipment_number}</span>
                    <StatusBadge status={ship.status} />
                  </div>
                  <div className="text-white font-semibold mb-2">{ship.client?.company_name || "Unknown Client"}</div>
                  <div className="text-slate-400 text-sm grid grid-cols-4 gap-4">
                    <div>
                      <span className="text-slate-500">Loads:</span> {ship.loadCount}
                    </div>
                    <div>
                      <span className="text-slate-500">Distance:</span> {ship.totalMiles.toLocaleString()} mi
                    </div>
                    <div>
                      <span className="text-slate-500">Weight:</span> {ship.totalWeight.toLocaleString()} lbs
                    </div>
                    <div>
                      <span className="text-slate-500">Value:</span> <span className="text-green-400 font-semibold">${ship.totalValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-orange-400 transition-colors flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}