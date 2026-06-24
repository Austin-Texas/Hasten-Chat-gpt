import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { DEFAULT_VISIBILITY } from '@/lib/visibilityConfig';

const ROLE_DESCRIPTIONS = {
  admin: '👤 Full system access. Sees everything: ops, finance, compliance, users, settings.',
  system_manager: '🔧 Operations manager. Sees dispatch, loads, drivers, finance, compliance—no settings access.',
  dispatcher: '📦 Load assignment. Sees dispatch, loads, drivers, tracking, messages. No finance/admin data.',
  fleet_manager: '🚛 Fleet operations. Sees fleet, maintenance, compliance, drivers, tracking. No dispatch/finance.',
  finance: '💰 Finance only. Sees payroll, invoices, expenses, clients. No operations/dispatch.',
  driver: '🚙 Driver app only. Sees assigned loads, map, earnings, documents, messages. No admin/fleet data.',
  client: '📋 Client portal. Sees own shipments, invoices, documents, messages. No other clients.',
  broker: '🤝 Broker portal. Sees assigned loads, invoices, quotes, messages. No internal pricing.'
};

export default function RoleVisibilityMatrix() {
  const [expanded, setExpanded] = useState(null);

  const roles = Object.keys(DEFAULT_VISIBILITY);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-semibold">Role-Based Data Visibility</h2>
          <p className="text-slate-400 text-xs mt-1">What each role can see in their daily workflow</p>
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {roles.map(role => {
          const config = DEFAULT_VISIBILITY[role];
          const portalType = Object.keys(config)[0];
          const sections = config[portalType] || [];
          const visibleCount = sections.filter(s => s.visible).length;

          return (
            <div key={role} className="glass-card rounded-xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <button
                  onClick={() => setExpanded(expanded === role ? null : role)}
                  className="w-full flex items-start justify-between hover:opacity-80 transition-opacity"
                >
                  <div className="flex-1 text-left">
                    <h3 className="text-white font-semibold capitalize">{role.replace('_', ' ')}</h3>
                    <p className="text-slate-400 text-xs mt-1">{ROLE_DESCRIPTIONS[role]}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <Eye className="w-3 h-3 text-orange-400" />
                      <span>{visibleCount} modules visible</span>
                    </div>
                  </div>
                  <div className={`text-slate-400 transition-transform ${expanded === role ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </button>
              </div>

              {expanded === role && (
                <div className="space-y-3 p-4">
                  {/* Visible Modules */}
                  <div>
                    <h4 className="text-white font-medium text-xs uppercase tracking-wider mb-2 text-slate-400">
                      Visible Modules
                    </h4>
                    <div className="space-y-1">
                      {sections
                        .filter(s => s.visible)
                        .map(section => (
                          <div key={section.section} className="flex items-center gap-2 text-xs">
                            <Eye className="w-3 h-3 text-green-400" />
                            <span className="text-slate-300">{section.label || section.section}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Hidden Modules */}
                  {sections.some(s => !s.visible) && (
                    <div>
                      <h4 className="text-white font-medium text-xs uppercase tracking-wider mb-2 text-slate-400">
                        Hidden Modules
                      </h4>
                      <div className="space-y-1">
                        {sections
                          .filter(s => !s.visible)
                          .map(section => (
                            <div key={section.section} className="flex items-center gap-2 text-xs">
                              <EyeOff className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-500">{section.label || section.section}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Data-Level Visibility */}
                  {config.data_visibility && (
                    <div className="pt-3 border-t border-white/5">
                      <h4 className="text-white font-medium text-xs uppercase tracking-wider mb-2 text-slate-400">
                        Data Access
                      </h4>
                      <div className="space-y-1 text-xs">
                        {Object.entries(config.data_visibility).map(([entity, visibility]) => {
                          const isFull = visibility.all_fields || visibility === true;
                          const isHidden = visibility.visible === false;
                          const isScopedOrPartial = visibility.own_only || visibility.assigned_loads_only || visibility.own_loads_only || visibility.own_invoices_only || visibility.but_not;

                          let icon, label, color;
                          if (isHidden) {
                            icon = <EyeOff className="w-3 h-3" />;
                            label = `${entity}: Hidden`;
                            color = 'text-slate-500';
                          } else if (isScopedOrPartial) {
                            icon = <Eye className="w-3 h-3" />;
                            label = `${entity}: Scoped access`;
                            color = 'text-amber-400';
                          } else if (isFull) {
                            icon = <Eye className="w-3 h-3" />;
                            label = `${entity}: Full access`;
                            color = 'text-green-400';
                          }

                          return (
                            <div key={entity} className={`flex items-center gap-2 ${color}`}>
                              {icon}
                              <span>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Dashboard Cards */}
                  {config.dashboard_cards && (
                    <div className="pt-3 border-t border-white/5">
                      <h4 className="text-white font-medium text-xs uppercase tracking-wider mb-2 text-slate-400">
                        Dashboard KPIs
                      </h4>
                      <div className="text-xs text-slate-400">
                        {config.dashboard_cards.length} cards visible
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Table */}
      <div className="glass-card rounded-xl border border-white/5 p-4 mt-6">
        <h3 className="text-white font-semibold text-sm mb-3">Quick Reference</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 px-2 text-slate-400">Role</th>
                <th className="text-center py-2 px-2 text-slate-400">Dispatch</th>
                <th className="text-center py-2 px-2 text-slate-400">Finance</th>
                <th className="text-center py-2 px-2 text-slate-400">Compliance</th>
                <th className="text-center py-2 px-2 text-slate-400">Drivers</th>
                <th className="text-center py-2 px-2 text-slate-400">Admin</th>
              </tr>
            </thead>
            <tbody>
              {[
                { role: 'Admin', dispatch: '✓', finance: '✓', compliance: '✓', drivers: '✓', admin: '✓' },
                { role: 'System Manager', dispatch: '✓', finance: '✓', compliance: '✓', drivers: '✓', admin: '✗' },
                { role: 'Dispatcher', dispatch: '✓', finance: '✗', compliance: '△', drivers: '✓', admin: '✗' },
                { role: 'Fleet Manager', dispatch: '△', finance: '✗', compliance: '✓', drivers: '✓', admin: '✗' },
                { role: 'Finance', dispatch: '✗', finance: '✓', compliance: '△', drivers: '△', admin: '✗' },
                { role: 'Driver', dispatch: '✗', finance: '△', compliance: '△', drivers: '◯', admin: '✗' },
                { role: 'Client', dispatch: '✗', finance: '△', compliance: '✗', drivers: '✗', admin: '✗' },
                { role: 'Broker', dispatch: '△', finance: '△', compliance: '✗', drivers: '✗', admin: '✗' }
              ].map(row => (
                <tr key={row.role} className="border-b border-white/5 hover:bg-white/2">
                  <td className="py-2 px-2 text-white font-medium">{row.role}</td>
                  <td className="text-center py-2 px-2 text-slate-400">{row.dispatch}</td>
                  <td className="text-center py-2 px-2 text-slate-400">{row.finance}</td>
                  <td className="text-center py-2 px-2 text-slate-400">{row.compliance}</td>
                  <td className="text-center py-2 px-2 text-slate-400">{row.drivers}</td>
                  <td className="text-center py-2 px-2 text-slate-400">{row.admin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">Legend: ✓ Full access · △ Partial/scoped · ◯ Own data only · ✗ No access</p>
      </div>
    </div>
  );
}