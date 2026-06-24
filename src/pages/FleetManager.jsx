import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { AlertTriangle, Truck, CheckCircle, Clock, Wrench, AlertCircle, DollarSign, Activity, TrendingUp, Filter, MapPin } from 'lucide-react';
import KpiCard from '@/components/hasten/KpiCard';
import StatusBadge from '@/components/hasten/StatusBadge';

export default function FleetManager() {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [complianceStatus, setComplianceStatus] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    Promise.all([
      base44.entities.Truck.list('-created_date', 100),
      base44.entities.Driver.list('-created_date', 100),
      base44.entities.MaintenanceRecord.list('-created_date', 200).catch(() => []),
      base44.entities.ComplianceStatus.list('-created_date', 200).catch(() => []),
      base44.entities.Load.list('-created_date', 200).catch(() => [])
    ]).then(([t, d, m, c, l]) => {
      setTrucks(t);
      setDrivers(d);
      setMaintenance(m);
      setComplianceStatus(c);
      setLoads(l);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // ─── CALCULATIONS ────────────────────────────────────────
  const stats = {
    total_trucks: trucks.length,
    active_trucks: trucks.filter(t => t.status === 'active').length,
    idle_trucks: trucks.filter(t => t.status === 'idle').length,
    maintenance_trucks: trucks.filter(t => t.status === 'maintenance').length,
    out_of_service: trucks.filter(t => t.status === 'out_of_service').length,
    compliant_trucks: complianceStatus.filter(c => c.entity_type === 'truck' && c.status === 'compliant').length,
    compliance_warning: complianceStatus.filter(c => c.entity_type === 'truck' && c.status === 'warning').length,
    compliance_blocked: complianceStatus.filter(c => c.entity_type === 'truck' && c.status === 'blocked').length,
  };

  // Maintenance analytics
  const overdue_maintenance = maintenance.filter(m => m.status === 'scheduled' && new Date(m.scheduled_date) <= new Date());
  const upcoming_maintenance = maintenance.filter(m => m.status === 'scheduled' && new Date(m.scheduled_date) > new Date());
  const maintenance_cost_month = maintenance
    .filter(m => {
      const mDate = new Date(m.scheduled_date);
      const now = new Date();
      return mDate.getMonth() === now.getMonth() && mDate.getFullYear() === now.getFullYear();
    })
    .reduce((s, m) => s + (m.total_cost || 0), 0);

  // Insurance/registration expiring
  const expiring_or_expired = trucks.filter(t => {
    const today = new Date();
    const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const regExp = t.registration_expiry && new Date(t.registration_expiry) <= thirtyDays;
    const insExp = t.insurance_expiry && new Date(t.insurance_expiry) <= thirtyDays;
    return regExp || insExp;
  });

  // Compliance-blocked trucks (can't be assigned loads)
  const blocked_trucks = trucks.filter(t => {
    const compliance = complianceStatus.find(c => c.entity_type === 'truck' && c.entity_id === t.id);
    return compliance && compliance.status === 'blocked';
  });

  // Utilization (active trucks with assigned loads)
  const utilization = stats.active_trucks > 0 
    ? Math.round((trucks.filter(t => t.status === 'active' && loads.some(l => l.truck_id === t.id && l.status !== 'completed')).length / stats.active_trucks) * 100) 
    : 0;

  // Fleet expenses (sum of all maintenance costs)
  const total_fleet_expenses = maintenance.reduce((s, m) => s + (m.total_cost || 0), 0);

  const filtered_trucks = filterStatus === 'all' ? trucks : trucks.filter(t => t.status === filterStatus);

  // Critical alerts
  const alerts = [
    ...blocked_trucks.map(t => ({ type: 'compliance_blocked', truck: t, severity: 'critical' })),
    ...expiring_or_expired.map(t => ({ type: 'doc_expiring', truck: t, severity: 'high' })),
    ...trucks.filter(t => {
      const alert = maintenance.find(m => m.truck_id === t.id && m.status === 'scheduled' && new Date(m.scheduled_date) <= new Date());
      return alert;
    }).map(t => ({ type: 'maintenance_overdue', truck: t, severity: 'high' })),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Fleet Manager Command Center</h1>
          <p className="text-slate-400 text-sm mt-0.5">Unified fleet operations, maintenance, compliance & tracking</p>
        </div>
        <Link to="/fleet"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors">
          <Truck className="w-4 h-4" />
          Fleet Details
        </Link>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Trucks" value={stats.total_trucks} icon={Truck} color="blue" />
        <KpiCard label="Active" value={stats.active_trucks} icon={CheckCircle} color="green" />
        <KpiCard label="Maintenance" value={stats.maintenance_trucks} icon={Wrench} color="orange" />
        <KpiCard label="Out of Service" value={stats.out_of_service} icon={AlertTriangle} color="red" />
      </div>

      {/* Compliance & Utilization */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Compliant Trucks" value={stats.compliant_trucks} icon={CheckCircle} color="green" />
        <KpiCard label="Compliance Blocked" value={stats.compliance_blocked} icon={AlertTriangle} color="red" />
        <KpiCard label="Fleet Utilization" value={`${utilization}%`} icon={Activity} color="cyan" />
        <KpiCard label="Total Fleet Expenses" value={`$${(total_fleet_expenses / 1000).toFixed(1)}k`} icon={DollarSign} color="amber" />
      </div>

      {/* Critical Alerts Panel */}
      {alerts.length > 0 && (
        <div className="glass-card rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-bold">Critical Fleet Alerts ({alerts.length})</span>
          </div>
          {alerts.slice(0, 5).map((alert, idx) => (
            <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-red-500/10">
              <div className="flex-1 min-w-0">
                {alert.type === 'compliance_blocked' && (
                  <div>
                    <div className="text-red-300 text-sm font-medium">Unit #{alert.truck.unit_number}: Compliance Blocked</div>
                    <div className="text-red-200/70 text-xs">Cannot assign loads until compliance issues resolved</div>
                  </div>
                )}
                {alert.type === 'doc_expiring' && (
                  <div>
                    <div className="text-amber-300 text-sm font-medium">Unit #{alert.truck.unit_number}: Insurance/Registration Expiring</div>
                    <div className="text-amber-200/70 text-xs">Expires within 30 days</div>
                  </div>
                )}
                {alert.type === 'maintenance_overdue' && (
                  <div>
                    <div className="text-orange-300 text-sm font-medium">Unit #{alert.truck.unit_number}: Maintenance Overdue</div>
                    <div className="text-orange-200/70 text-xs">Schedule service immediately</div>
                  </div>
                )}
              </div>
              <Link to={`/fleet/${alert.truck.id}`}
                className="px-3 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0">
                View
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Maintenance Command Center */}
      <div className="glass-card rounded-xl border border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-heading font-semibold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-400" />
            Maintenance Command Center
          </h2>
          <Link to="/maintenance" className="text-orange-400 hover:text-orange-300 text-xs font-medium">View All →</Link>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <div className="text-slate-400 text-xs uppercase tracking-wider">Overdue</div>
            <div className="text-white font-bold text-xl mt-1">{overdue_maintenance.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <div className="text-slate-400 text-xs uppercase tracking-wider">Upcoming</div>
            <div className="text-white font-bold text-xl mt-1">{upcoming_maintenance.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <div className="text-slate-400 text-xs uppercase tracking-wider">This Month</div>
            <div className="text-orange-400 font-bold text-xl mt-1">${(maintenance_cost_month / 1000).toFixed(1)}k</div>
          </div>
        </div>
        {overdue_maintenance.length > 0 && (
          <div className="space-y-2">
            {overdue_maintenance.slice(0, 3).map(m => {
              const truck = trucks.find(t => t.id === m.truck_id);
              return (
                <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div>
                    <div className="text-white text-sm font-medium">{truck ? `Unit #${truck.unit_number}` : 'Unknown'}: {m.type}</div>
                    <div className="text-slate-400 text-xs">Due {new Date(m.scheduled_date).toLocaleDateString()}</div>
                  </div>
                  <span className="text-red-400 font-bold text-sm">OVERDUE</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compliance Command Center */}
      <div className="glass-card rounded-xl border border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-heading font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Compliance Command Center
          </h2>
          <Link to="/compliance" className="text-orange-400 hover:text-orange-300 text-xs font-medium">Full Report →</Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="text-slate-400 text-xs uppercase tracking-wider">Compliant</div>
            <div className="text-green-400 font-bold text-xl mt-1">{stats.compliant_trucks}</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-slate-400 text-xs uppercase tracking-wider">Warnings</div>
            <div className="text-amber-400 font-bold text-xl mt-1">{stats.compliance_warning}</div>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-slate-400 text-xs uppercase tracking-wider">Blocked</div>
            <div className="text-red-400 font-bold text-xl mt-1">{stats.compliance_blocked}</div>
          </div>
        </div>
      </div>

      {/* Truck Health Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-heading font-semibold">Truck Health Overview</h2>
          <div className="flex gap-2">
            {['all', 'active', 'idle', 'maintenance', 'out_of_service'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filterStatus === s
                    ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}>
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered_trucks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No trucks in this status</p>
            </div>
          ) : (
            filtered_trucks.map(truck => {
              const comp = complianceStatus.find(c => c.entity_type === 'truck' && c.entity_id === truck.id);
              const maint = maintenance.filter(m => m.truck_id === truck.id && m.status === 'scheduled');
              const load = loads.find(l => l.truck_id === truck.id && l.status !== 'completed');
              const driver = drivers.find(d => d.truck_id === truck.id);
              const nextService = truck.next_service_miles ? Math.max(0, truck.next_service_miles - (truck.odometer || 0)) : null;

              return (
                <Link key={truck.id} to={`/fleet/${truck.id}`}
                  className="glass-card rounded-xl border border-white/5 p-4 hover:border-orange-500/20 transition-all duration-200 group">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-white font-bold font-mono text-lg">#{truck.unit_number}</div>
                      <div className="text-slate-400 text-xs">{truck.year} {truck.make} {truck.model}</div>
                    </div>
                    <StatusBadge status={truck.status} />
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 mb-3 text-xs">
                    {driver && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Activity className="w-3 h-3 text-slate-500" />
                        <span>{driver.first_name} {driver.last_name}</span>
                      </div>
                    )}
                    {load && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{load.origin_city} → {load.destination_city}</span>
                      </div>
                    )}
                    {truck.current_city && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin className="w-3 h-3 text-slate-600" />
                        <span>{truck.current_city}, {truck.current_state}</span>
                      </div>
                    )}
                  </div>

                  {/* Compliance & Maintenance */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`p-2 rounded text-xs ${
                      comp?.status === 'blocked' ? 'bg-red-500/15 border border-red-500/20 text-red-300' :
                      comp?.status === 'warning' ? 'bg-amber-500/15 border border-amber-500/20 text-amber-300' :
                      'bg-green-500/15 border border-green-500/20 text-green-300'
                    }`}>
                      {comp?.status === 'blocked' ? '⚠️ Blocked' : comp?.status === 'warning' ? '⚠️ Warning' : '✓ Compliant'}
                    </div>
                    <div className={`p-2 rounded text-xs ${
                      maint.some(m => new Date(m.scheduled_date) <= new Date()) 
                        ? 'bg-red-500/15 border border-red-500/20 text-red-300' 
                        : nextService !== null && nextService <= 500
                          ? 'bg-amber-500/15 border border-amber-500/20 text-amber-300'
                          : 'bg-slate-500/15 border border-slate-500/20 text-slate-300'
                    }`}>
                      {maint.some(m => new Date(m.scheduled_date) <= new Date()) 
                        ? 'Overdue' 
                        : nextService !== null && nextService <= 500
                          ? `${nextService}mi`
                          : 'OK'}
                    </div>
                  </div>

                  {/* Last GPS */}
                  {truck.last_location_update && (
                    <div className="text-slate-500 text-xs border-t border-white/5 pt-2">
                      Last update: {new Date(truck.last_location_update).toLocaleTimeString()}
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/fleet" className="glass-card rounded-xl border border-white/5 p-4 hover:border-orange-500/20 transition-all text-center">
          <Truck className="w-6 h-6 text-orange-400 mx-auto mb-2" />
          <div className="text-white text-sm font-semibold">Fleet</div>
          <div className="text-slate-500 text-xs">Management</div>
        </Link>
        <Link to="/maintenance" className="glass-card rounded-xl border border-white/5 p-4 hover:border-orange-500/20 transition-all text-center">
          <Wrench className="w-6 h-6 text-amber-400 mx-auto mb-2" />
          <div className="text-white text-sm font-semibold">Maintenance</div>
          <div className="text-slate-500 text-xs">Schedule</div>
        </Link>
        <Link to="/compliance" className="glass-card rounded-xl border border-white/5 p-4 hover:border-orange-500/20 transition-all text-center">
          <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <div className="text-white text-sm font-semibold">Compliance</div>
          <div className="text-slate-500 text-xs">Status</div>
        </Link>
        <Link to="/tracking" className="glass-card rounded-xl border border-white/5 p-4 hover:border-orange-500/20 transition-all text-center">
          <MapPin className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
          <div className="text-white text-sm font-semibold">Tracking</div>
          <div className="text-slate-500 text-xs">Live Map</div>
        </Link>
      </div>
    </div>
  );
}