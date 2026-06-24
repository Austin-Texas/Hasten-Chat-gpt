import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, AlertCircle, CheckCircle, Wrench, Calendar, Gauge, Radio, Truck, User, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const daysLeft = Math.floor((d - now) / (1000 * 60 * 60 * 24));
  return daysLeft >= 0 && daysLeft <= 30;
}

function getDaysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const daysLeft = Math.floor((d - now) / (1000 * 60 * 60 * 24));
  return daysLeft >= 0 ? daysLeft : null;
}

export default function TruckDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [truck, setTruck] = useState(null);
  const [driver, setDriver] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [loads, setLoads] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [gpsHistory, setGpsHistory] = useState([]);
  const [manifest, setManifest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    Promise.all([
      base44.entities.Truck.get(id),
      base44.entities.MaintenanceRecord.filter({ truck_id: id }, "-created_date", 50).catch(() => []),
      base44.entities.Load.filter({ truck_id: id }, "-created_date", 20).catch(() => []),
      base44.entities.Expense.filter({ truck_id: id }, "-created_date", 50).catch(() => []),
      base44.entities.GPSTrackPoint.filter({ truck_id: id }, "-created_date", 20).catch(() => []),
      base44.entities.Manifest.filter({ load_id: { $exists: true } }, "-created_date", 100).catch(() => []),
    ]).then(([trk, maint, lds, exp, gps, mnf]) => {
      setTruck(trk);
      setMaintenance(maint);
      setLoads(lds);
      setExpenses(exp);
      setGpsHistory(gps);
      // Filter manifest to only events related to this truck's loads
      const truckLoadIds = lds.map(l => l.id) || [];
      setManifest(mnf.filter(m => truckLoadIds.includes(m.load_id)));
      if (trk.driver_id) {
        return base44.entities.Driver.get(trk.driver_id).then(d => setDriver(d));
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="skeleton h-64 rounded-xl animate-pulse" />;
  }

  if (!truck) {
    return <div className="text-center py-12"><p className="text-slate-400">Truck not found</p></div>;
  }

  const regExpired = isExpired(truck.registration_expiry);
  const regExpiring = isExpiringSoon(truck.registration_expiry);
  const insExpired = isExpired(truck.insurance_expiry);
  const insExpiring = isExpiringSoon(truck.insurance_expiry);
  const inspExpired = isExpired(truck.annual_inspection_expiry);
  const inspExpiring = isExpiringSoon(truck.annual_inspection_expiry);

  const regDays = getDaysUntilExpiry(truck.registration_expiry);
  const insDays = getDaysUntilExpiry(truck.insurance_expiry);
  const inspDays = getDaysUntilExpiry(truck.annual_inspection_expiry);

  const completedLoads = loads.filter(l => l.status === "completed").length;
  const activeLoads = loads.filter(l => ["assigned", "in_transit"].includes(l.status)).length;
  const totalMiles = loads.reduce((s, l) => s + (l.miles || 0), 0);

  const nextServiceMiles = truck.next_service_miles ? Math.max(0, truck.next_service_miles - (truck.odometer || 0)) : null;

  // Financial calculations
  const approvedExpenses = expenses.filter(e => e.status === "approved").reduce((s, e) => s + (e.amount || 0), 0);
  const maintenanceCost = expenses.filter(e => ["maintenance", "parts", "labor", "tires"].includes(e.category) && e.status === "approved").reduce((s, e) => s + (e.amount || 0), 0);
  const fuelCost = expenses.filter(e => e.category === "fuel" && e.status === "approved").reduce((s, e) => s + (e.amount || 0), 0);
  const costPerMile = totalMiles > 0 ? (approvedExpenses / totalMiles).toFixed(2) : 0;
  const totalRevenue = loads.filter(l => l.status === "completed").reduce((s, l) => s + ((l.rate || 0) + (l.fuel_surcharge || 0) + (l.accessorial_charges || 0)), 0);
  const profitPerMile = totalMiles > 0 ? ((totalRevenue - approvedExpenses) / totalMiles).toFixed(2) : 0;

  // Current active load
  const currentLoad = loads.find(l => ["assigned", "accepted", "en_route", "arrived_pickup", "loaded", "arrived_delivery"].includes(l.status));

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/fleet")} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-white font-heading font-bold text-2xl">Unit #{truck.unit_number}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={truck.status || "idle"} />
              {truck.status === "active" && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {(regExpired || insExpired || inspExpired) && (
        <div className="glass-card rounded-xl border border-red-500/25 bg-red-500/10 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-red-300 font-semibold text-sm">Compliance Expired</div>
            <div className="text-red-200 text-xs mt-1 space-y-0.5">
              {regExpired && <div>• Registration expired on {new Date(truck.registration_expiry).toLocaleDateString()}</div>}
              {insExpired && <div>• Insurance expired on {new Date(truck.insurance_expiry).toLocaleDateString()}</div>}
              {inspExpired && <div>• Inspection expired on {new Date(truck.annual_inspection_expiry).toLocaleDateString()}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Warning Alerts */}
      {(regExpiring || insExpiring || inspExpiring) && !regExpired && !insExpired && !inspExpired && (
        <div className="glass-card rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-amber-300 font-semibold text-sm">Compliance Expiring Soon</div>
            <div className="text-amber-200 text-xs mt-1 space-y-0.5">
              {regExpiring && <div>• Registration expires in {regDays} days ({new Date(truck.registration_expiry).toLocaleDateString()})</div>}
              {insExpiring && <div>• Insurance expires in {insDays} days ({new Date(truck.insurance_expiry).toLocaleDateString()})</div>}
              {inspExpiring && <div>• Inspection expires in {inspDays} days ({new Date(truck.annual_inspection_expiry).toLocaleDateString()})</div>}
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Vehicle Profile</h2>
          <div className="space-y-3">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Make & Model</div>
              <div className="text-white font-semibold text-sm">{truck.year} {truck.make} {truck.model}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">VIN</div>
              <div className="text-white font-mono text-sm">{truck.vin || "—"}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Color</div>
              <div className="text-white text-sm">{truck.color || "—"}</div>
            </div>
            <div className="pt-2 border-t border-white/5">
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">License Plate</div>
              <div className="text-white font-mono font-bold text-sm">{truck.license_plate}</div>
              <div className="text-slate-400 text-xs">{truck.license_plate_state}</div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Fuel & Maintenance</h2>
          <div className="space-y-3">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Fuel Type</div>
              <div className="text-white font-semibold text-sm capitalize">{truck.fuel_type || "—"}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Fuel Capacity</div>
              <div className="text-white text-sm">{truck.fuel_capacity ? `${truck.fuel_capacity} gal` : "—"}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">MPG</div>
              <div className="text-white text-sm">{truck.mpg ? `${truck.mpg} mpg` : "—"}</div>
            </div>
            {nextServiceMiles !== null && (
              <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-orange-400" />
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider">Service Due</div>
                  <div className={`text-sm font-semibold ${nextServiceMiles <= 500 ? "text-amber-400" : "text-green-400"}`}>
                    {nextServiceMiles.toLocaleString()} mi
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Odometer & Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Odometer</div>
              <div className="text-white font-bold text-2xl mt-1">{truck.odometer ? truck.odometer.toLocaleString() : "—"}</div>
              <div className="text-slate-500 text-xs mt-0.5">miles</div>
            </div>
            <Gauge className="w-8 h-8 text-blue-400 opacity-20" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Engine Hours</div>
              <div className="text-white font-bold text-2xl mt-1">{truck.engine_hours ? truck.engine_hours.toLocaleString() : "—"}</div>
              <div className="text-slate-500 text-xs mt-0.5">hours</div>
            </div>
            <Radio className="w-8 h-8 text-slate-400 opacity-20" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Last Service</div>
              <div className="text-white font-semibold text-sm mt-1">{truck.last_service_date ? new Date(truck.last_service_date).toLocaleDateString() : "—"}</div>
              {truck.last_service_odometer && <div className="text-slate-400 text-xs mt-0.5">{truck.last_service_odometer.toLocaleString()} mi</div>}
            </div>
            <Wrench className="w-8 h-8 text-amber-400 opacity-20" />
          </div>
        </div>
      </div>

      {/* Compliance Dashboard */}
      <div className="glass-card rounded-xl border border-white/5 p-5">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Compliance Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Registration */}
          <div className={`rounded-lg p-4 border ${
            regExpired ? "bg-red-500/10 border-red-500/25" : regExpiring ? "bg-amber-500/10 border-amber-500/25" : "bg-green-500/10 border-green-500/25"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold text-sm">Registration</span>
              {regExpired ? <AlertCircle className="w-4 h-4 text-red-400" /> : regExpiring ? <AlertCircle className="w-4 h-4 text-amber-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
            </div>
            <div className={`text-xs font-medium ${regExpired ? "text-red-300" : regExpiring ? "text-amber-300" : "text-green-300"}`}>
              {truck.registration_expiry ? new Date(truck.registration_expiry).toLocaleDateString() : "—"}
            </div>
            {regDays !== null && <div className={`text-xs mt-1 ${regExpired ? "text-red-200" : regExpiring ? "text-amber-200" : "text-green-200"}`}>
              {regDays === 0 ? "Expires today" : regDays === 1 ? "Expires tomorrow" : `${regDays} days left`}
            </div>}
          </div>

          {/* Insurance */}
          <div className={`rounded-lg p-4 border ${
            insExpired ? "bg-red-500/10 border-red-500/25" : insExpiring ? "bg-amber-500/10 border-amber-500/25" : "bg-green-500/10 border-green-500/25"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold text-sm">Insurance</span>
              {insExpired ? <AlertCircle className="w-4 h-4 text-red-400" /> : insExpiring ? <AlertCircle className="w-4 h-4 text-amber-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
            </div>
            <div className={`text-xs font-medium ${insExpired ? "text-red-300" : insExpiring ? "text-amber-300" : "text-green-300"}`}>
              {truck.insurance_expiry ? new Date(truck.insurance_expiry).toLocaleDateString() : "—"}
            </div>
            {insDays !== null && <div className={`text-xs mt-1 ${insExpired ? "text-red-200" : insExpiring ? "text-amber-200" : "text-green-200"}`}>
              {insDays === 0 ? "Expires today" : insDays === 1 ? "Expires tomorrow" : `${insDays} days left`}
            </div>}
          </div>

          {/* Inspection */}
          <div className={`rounded-lg p-4 border ${
            inspExpired ? "bg-red-500/10 border-red-500/25" : inspExpiring ? "bg-amber-500/10 border-amber-500/25" : "bg-green-500/10 border-green-500/25"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold text-sm">Inspection</span>
              {inspExpired ? <AlertCircle className="w-4 h-4 text-red-400" /> : inspExpiring ? <AlertCircle className="w-4 h-4 text-amber-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
            </div>
            <div className={`text-xs font-medium ${inspExpired ? "text-red-300" : inspExpiring ? "text-amber-300" : "text-green-300"}`}>
              {truck.annual_inspection_expiry ? new Date(truck.annual_inspection_expiry).toLocaleDateString() : "—"}
            </div>
            {inspDays !== null && <div className={`text-xs mt-1 ${inspExpired ? "text-red-200" : inspExpiring ? "text-amber-200" : "text-green-200"}`}>
              {inspDays === 0 ? "Expires today" : inspDays === 1 ? "Expires tomorrow" : `${inspDays} days left`}
            </div>}
          </div>
        </div>
      </div>

      {/* ELD Info & Assigned Driver */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {truck.eld_device_id && (
          <div className="glass-card rounded-xl border border-white/5 p-5">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">ELD Device</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Radio className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-white font-mono text-sm">{truck.eld_device_id}</div>
                <div className="text-slate-500 text-xs">Enabled for IFTA tracking</div>
              </div>
            </div>
          </div>
        )}

        {driver && (
          <div className="glass-card rounded-xl border border-white/5 p-5">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Assigned Driver</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-400 font-bold text-sm">
                    {(driver.first_name || "?").charAt(0)}{(driver.last_name || "").charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="text-white font-medium text-sm">{driver.first_name} {driver.last_name}</div>
                  <div className="text-slate-500 text-xs">{driver.license_class ? `CDL-${driver.license_class}` : "—"}</div>
                </div>
              </div>
              <button
                onClick={() => navigate(`/drivers/${driver.id}`)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Load Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Total Loads</div>
              <div className="text-white font-bold text-2xl mt-1">{loads.length}</div>
            </div>
            <Truck className="w-8 h-8 text-orange-400 opacity-20" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Completed</div>
              <div className="text-green-400 font-bold text-2xl mt-1">{completedLoads}</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400 opacity-20" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Total Miles</div>
              <div className="text-blue-400 font-bold text-2xl mt-1">{(totalMiles / 1000).toFixed(0)}k</div>
            </div>
            <Gauge className="w-8 h-8 text-blue-400 opacity-20" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit overflow-x-auto">
        {["overview", "maintenance", "financial", "documents", "tracking", "timeline"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-150 whitespace-nowrap ${
              tab === t ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "overview" ? "Overview" : t === "financial" ? "Financial" : t === "documents" ? "Docs" : t === "tracking" ? "GPS" : t === "timeline" ? "Timeline" : t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* Load Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider">Total Loads</div>
                  <div className="text-white font-bold text-2xl mt-1">{loads.length}</div>
                </div>
                <Truck className="w-8 h-8 text-orange-400 opacity-20" />
              </div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider">Completed</div>
                  <div className="text-green-400 font-bold text-2xl mt-1">{completedLoads}</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400 opacity-20" />
              </div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider">Total Miles</div>
                  <div className="text-blue-400 font-bold text-2xl mt-1">{(totalMiles / 1000).toFixed(0)}k</div>
                </div>
                <Gauge className="w-8 h-8 text-blue-400 opacity-20" />
              </div>
            </div>
          </div>

          {currentLoad && (
            <div className="glass-card rounded-xl border border-orange-500/25 bg-orange-500/5 p-5">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">Current Load</h2>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-orange-400 font-mono text-sm">{currentLoad.load_number || `#LD${currentLoad.id?.slice(-6).toUpperCase()}`}</div>
                  <div className="text-slate-300 text-sm mt-1">{currentLoad.origin_city}, {currentLoad.origin_state} → {currentLoad.destination_city}, {currentLoad.destination_state}</div>
                </div>
                <StatusBadge status={currentLoad.status} />
              </div>
            </div>
          )}

          {maintenance.length > 0 && (
            <div className="glass-card rounded-xl border border-white/5 p-5">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">Recent Maintenance</h2>
              <div className="space-y-2">
                {maintenance.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center justify-between text-xs pb-2 border-b border-white/5 last:border-0">
                    <div>
                      <div className="text-white font-medium capitalize">{m.type.replace("_", " ")}</div>
                      <div className="text-slate-500">{m.completed_date ? new Date(m.completed_date).toLocaleDateString() : new Date(m.scheduled_date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={m.status} />
                      {m.total_cost && <div className="text-white font-bold text-xs mt-1">${m.total_cost}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "maintenance" && (
        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold mb-4">Maintenance History</h2>
          {maintenance.length === 0 ? (
            <p className="text-slate-500 text-sm">No maintenance records</p>
          ) : (
            <div className="space-y-2">
              {maintenance.map(m => (
                <div key={m.id} className="flex items-center justify-between text-xs pb-3 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-white font-medium capitalize">{m.type.replace("_", " ")}</div>
                    <div className="text-slate-500">{m.completed_date ? new Date(m.completed_date).toLocaleDateString() : new Date(m.scheduled_date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={m.status} />
                    {m.total_cost && <div className="text-white font-bold text-xs mt-1">${m.total_cost}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "financial" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-slate-400 text-xs uppercase mb-1">Approved Expenses</div>
              <div className="text-white font-bold text-xl">${approvedExpenses.toLocaleString()}</div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-slate-400 text-xs uppercase mb-1">Maintenance Cost</div>
              <div className="text-white font-bold text-xl">${maintenanceCost.toLocaleString()}</div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-slate-400 text-xs uppercase mb-1">Fuel Cost</div>
              <div className="text-white font-bold text-xl">${fuelCost.toLocaleString()}</div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-slate-400 text-xs uppercase mb-1">Total Revenue</div>
              <div className="text-green-400 font-bold text-xl">${totalRevenue.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-slate-400 text-xs uppercase mb-1">Cost per Mile</div>
              <div className="text-white font-bold text-2xl">${costPerMile}</div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="text-slate-400 text-xs uppercase mb-1">Profit per Mile</div>
              <div className={`font-bold text-2xl ${profitPerMile >= 0 ? "text-green-400" : "text-red-400"}`}>${profitPerMile}</div>
            </div>
          </div>

          {expenses.length > 0 && (
            <div className="glass-card rounded-xl border border-white/5 p-5">
              <h3 className="text-white font-semibold mb-3">Expense Breakdown</h3>
              <div className="space-y-2">
                {expenses.slice(0, 15).map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs pb-2 border-b border-white/5 last:border-0">
                    <div>
                      <div className="text-white capitalize">{e.category.replace("_", " ")}</div>
                      <div className="text-slate-500">{new Date(e.date).toLocaleDateString()} · {e.vendor || "—"}</div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={e.status} />
                      <div className="text-white font-bold text-xs mt-1">${e.amount}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold mb-4">Truck Documents</h2>
          <p className="text-slate-500 text-sm">Documents are managed via the Document Portal.</p>
          <a href="/documents" className="text-orange-400 text-sm hover:text-orange-300 mt-2 inline-block">Go to Document Portal →</a>
        </div>
      )}

      {tab === "tracking" && (
        <div className="space-y-4">
          {gpsHistory.length > 0 ? (
            <>
              <div className="glass-card rounded-xl p-4 border border-white/5">
                <div className="text-slate-400 text-xs uppercase mb-2">Latest Position</div>
                <div className="text-white font-mono text-sm">{gpsHistory[0].lat.toFixed(4)}, {gpsHistory[0].lng.toFixed(4)}</div>
                <div className="text-slate-500 text-xs mt-1">{new Date(gpsHistory[0].timestamp).toLocaleString()}</div>
                {gpsHistory[0].speed && <div className="text-slate-400 text-xs mt-1">Speed: {gpsHistory[0].speed} mph</div>}
              </div>

              <div className="glass-card rounded-xl border border-white/5 p-5">
                <h3 className="text-white font-semibold mb-3">Recent GPS Activity</h3>
                <div className="space-y-2">
                  {gpsHistory.slice(0, 10).map((g, i) => (
                    <div key={i} className="flex items-center justify-between text-xs pb-2 border-b border-white/5 last:border-0">
                      <div>
                        <div className="text-white">{g.lat.toFixed(4)}, {g.lng.toFixed(4)}</div>
                        <div className="text-slate-500">{new Date(g.timestamp).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        {g.speed && <div className="text-white font-medium">{g.speed} mph</div>}
                        {g.event_type && <div className="text-slate-400 capitalize text-xs">{g.event_type.replace("_", " ")}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm">No GPS data available</p>
          )}
        </div>
      )}

      {tab === "timeline" && (
        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold mb-4">Truck Timeline</h2>
          {manifest.length === 0 ? (
            <p className="text-slate-500 text-sm">No timeline events yet</p>
          ) : (
            <div className="space-y-3">
              {manifest.map(m => (
                <div key={m.id} className="flex gap-3 pb-3 border-b border-white/5 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-2" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm">{m.event_title}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{m.event_description}</div>
                    <div className="text-slate-600 text-xs mt-1">{new Date(m.event_timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}