import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Lock, Eye, Zap, BarChart3, Filter, Download } from 'lucide-react';
import KpiCard from '@/components/hasten/KpiCard';
import StatusBadge from '@/components/hasten/StatusBadge';

const ACTION_COLORS = {
  payroll_viewed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  payroll_edited: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  tax_profile_edited: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  document_approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  document_rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  compliance_override: 'bg-red-500/10 text-red-400 border-red-500/20',
  role_changed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  user_disabled: 'bg-red-500/10 text-red-400 border-red-500/20',
  user_enabled: 'bg-green-500/10 text-green-400 border-green-500/20',
  invoice_payment_status_changed: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  sensitive_data_accessed: 'bg-red-500/10 text-red-400 border-red-500/20',
  unauthorized_access_attempt: 'bg-red-500/15 text-red-300 border-red-500/30',
  backend_function_denied: 'bg-red-500/10 text-red-400 border-red-500/20',
  field_redacted: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  export_requested: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  report_generated: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
};

export default function SecurityDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterResult, setFilterResult] = useState('all');
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const logs = await base44.entities.AuditLog.list('-timestamp', 500);
      setLogs(logs);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesResult = filterResult === 'all' || log.result === filterResult;
    const matchesSearch = !searchUser || 
      log.user_id?.toLowerCase().includes(searchUser.toLowerCase()) ||
      log.target_user_id?.toLowerCase().includes(searchUser.toLowerCase());
    return matchesAction && matchesResult && matchesSearch;
  });

  const stats = {
    total_actions: logs.length,
    failed_attempts: logs.filter(l => l.result === 'failed').length,
    denied_access: logs.filter(l => l.result === 'denied').length,
    sensitive_data_accesses: logs.filter(l => l.action === 'sensitive_data_accessed').length,
    unauthorized_attempts: logs.filter(l => l.action === 'unauthorized_access_attempt').length
  };

  const getActionLabel = (action) => {
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Security Center</h1>
          <p className="text-slate-400 text-sm mt-0.5">Audit logs, access attempts, and sensitive data tracking</p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors"
        >
          <Zap className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Actions" value={stats.total_actions} icon={BarChart3} color="blue" />
        <KpiCard label="Failed Attempts" value={stats.failed_attempts} icon={AlertTriangle} color="amber" />
        <KpiCard label="Denied Access" value={stats.denied_access} icon={Lock} color="red" />
        <KpiCard label="Sensitive Access" value={stats.sensitive_data_accesses} icon={Eye} color="orange" />
        <KpiCard label="Unauthorized" value={stats.unauthorized_attempts} icon={AlertTriangle} color="red" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by user ID..."
            value={searchUser}
            onChange={e => setSearchUser(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500/50"
          />
        </div>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
          style={{ background: '#0F1829' }}
        >
          <option value="all" style={{ background: '#0F1829' }}>All Actions</option>
          <option value="payroll_viewed" style={{ background: '#0F1829' }}>Payroll Viewed</option>
          <option value="payroll_edited" style={{ background: '#0F1829' }}>Payroll Edited</option>
          <option value="tax_profile_edited" style={{ background: '#0F1829' }}>Tax Profile Edited</option>
          <option value="sensitive_data_accessed" style={{ background: '#0F1829' }}>Sensitive Data Accessed</option>
          <option value="unauthorized_access_attempt" style={{ background: '#0F1829' }}>Unauthorized Attempt</option>
        </select>
        <select
          value={filterResult}
          onChange={e => setFilterResult(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50"
          style={{ background: '#0F1829' }}
        >
          <option value="all" style={{ background: '#0F1829' }}>All Results</option>
          <option value="success" style={{ background: '#0F1829' }}>Success</option>
          <option value="failed" style={{ background: '#0F1829' }}>Failed</option>
          <option value="denied" style={{ background: '#0F1829' }}>Denied</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white font-heading font-semibold">Audit Log</h2>
          <span className="text-slate-500 text-xs">{filteredLogs.length} records</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No audit logs found</div>
        ) : (
          <div className="divide-y divide-white/5 overflow-x-auto">
            <div className="grid grid-cols-7 gap-4 px-5 py-2.5 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider font-semibold bg-white/2 sticky top-0">
              <span>Time</span>
              <span>User</span>
              <span>Role</span>
              <span>Action</span>
              <span>Entity</span>
              <span>Result</span>
              <span className="text-right">Details</span>
            </div>

            {filteredLogs.map(log => (
              <div key={log.id} className="grid grid-cols-7 gap-4 px-5 py-3.5 items-start hover:bg-white/2 transition-colors group text-sm">
                <div className="text-slate-400 text-xs">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
                <div className="text-white font-medium truncate">{log.user_id}</div>
                <div>
                  <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-slate-300">
                    {log.user_role}
                  </span>
                </div>
                <div>
                  <span className={`px-2 py-0.5 rounded text-xs border ${ACTION_COLORS[log.action] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                    {getActionLabel(log.action)}
                  </span>
                </div>
                <div className="text-slate-400 text-xs truncate">
                  {log.entity_type ? `${log.entity_type} ${log.entity_id?.slice(0, 8)}...` : '—'}
                </div>
                <div>
                  <StatusBadge status={log.result === 'denied' ? 'pending' : log.result === 'failed' ? 'expired' : 'compliant'} />
                </div>
                <div className="text-right text-slate-500 text-xs">
                  {log.reason_denied && (
                    <div className="text-red-400">Denied: {log.reason_denied}</div>
                  )}
                  {log.sensitive_fields_accessed?.length > 0 && (
                    <div className="text-orange-400">Sensitive: {log.sensitive_fields_accessed.join(', ')}</div>
                  )}
                  {log.action_details && (
                    <div className="text-slate-400">{log.action_details}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}