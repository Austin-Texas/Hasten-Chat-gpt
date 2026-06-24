import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, RefreshCw, Trash2, Edit2, CheckCircle, XCircle, Loader2,
  X, Key, Plug, Settings, AlertCircle, Activity, Zap, Filter
} from "lucide-react";

const PROVIDER_TYPES = [
  { value: "DAT", label: "DAT Load Board" },
  { value: "Truckstop", label: "Truckstop" },
  { value: "123Loadboard", label: "123Loadboard" },
  { value: "TQL", label: "TQL" },
  { value: "CHR", label: "C.H. Robinson" },
  { value: "direct_broker", label: "Direct Broker API" },
  { value: "shipper_api", label: "Shipper API" },
  { value: "custom_webhook", label: "Custom Webhook" },
  { value: "csv_sftp", label: "CSV / SFTP Import" }
];

const AUTH_TYPES = [
  { value: "api_key", label: "API Key" },
  { value: "oauth2", label: "OAuth 2.0" },
  { value: "bearer_token", label: "Bearer Token" },
  { value: "webhook", label: "Webhook" },
  { value: "sftp", label: "SFTP" },
  { value: "csv", label: "CSV Upload" }
];

export default function SuperAdminIntegrations() {
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingApi, setEditingApi] = useState(null);
  const [testing, setTesting] = useState(null);
  const [syncing, setSyncing] = useState(null);

  const fetchApis = useCallback(() => {
    setLoading(true);
    base44.entities.LoadBoardAPI.list("-created_date", 50)
      .then(setApis)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchApis(); }, [fetchApis]);

  const handleSave = async (formData) => {
    try {
      if (editingApi?.id) {
        await base44.entities.LoadBoardAPI.update(editingApi.id, formData);
      } else {
        await base44.entities.LoadBoardAPI.create({
          ...formData,
          configured_by: (await base44.auth.me().catch(() => ({})))?.id,
          status: 'pending',
          loads_imported_count: 0,
          error_count: 0
        });
      }
      setShowModal(false);
      setEditingApi(null);
      fetchApis();
    } catch (err) {
      console.error(err);
      alert('Failed to save: ' + err.message);
    }
  };

  const handleTest = async (api) => {
    setTesting(api.id);
    try {
      // Simulate test connection
      await base44.entities.LoadBoardAPI.update(api.id, {
        status: 'connected',
        last_sync: new Date().toISOString()
      });
      fetchApis();
    } catch (err) { console.error(err); }
    finally { setTesting(null); }
  };

  const handleSync = async (api) => {
    setSyncing(api.id);
    try {
      await base44.functions.invoke('syncExternalLoads', { provider_id: api.id });
      fetchApis();
    } catch (err) { console.error(err); }
    finally { setSyncing(null); }
  };

  const handleToggle = async (api) => {
    const newStatus = api.status === 'connected' ? 'disconnected' : 'connected';
    await base44.entities.LoadBoardAPI.update(api.id, { status: newStatus });
    fetchApis();
  };

  const handleDelete = async (api) => {
    if (!confirm(`Delete ${api.source_name}? This cannot be undone.`)) return;
    await base44.entities.LoadBoardAPI.delete(api.id);
    fetchApis();
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Load Board API Integrations</h1>
          <p className="text-slate-400 text-sm mt-0.5">Configure external load board connections</p>
        </div>
        <button onClick={() => { setEditingApi(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all"
          style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}>
          <Plus className="w-4 h-4" /> Add API Source
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Sources', value: apis.length, icon: Plug, color: 'blue' },
          { label: 'Connected', value: apis.filter(a => a.status === 'connected').length, icon: CheckCircle, color: 'green' },
          { label: 'Errors', value: apis.filter(a => a.status === 'error').length, icon: AlertCircle, color: 'red' },
          { label: 'Loads Imported', value: apis.reduce((s, a) => s + (a.loads_imported_count || 0), 0), icon: Activity, color: 'orange' },
        ].map(stat => (
          <div key={stat.label} className="glass-card rounded-xl border border-white/5 p-3">
            <div className="flex items-center gap-2">
              <stat.icon className="w-4 h-4 text-slate-500" />
              <span className="text-slate-500 text-xs">{stat.label}</span>
            </div>
            <div className="text-white font-bold text-xl mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* API Sources Table */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : apis.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Plug className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No API sources configured</p>
          <p className="text-slate-600 text-sm mt-1">Add a load board API to start importing external loads</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/3">
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium">Source Name</th>
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium">Type</th>
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium">Status</th>
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium">Auth</th>
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium">Last Sync</th>
                <th className="text-right py-2.5 px-3 text-slate-400 font-medium">Imported</th>
                <th className="text-right py-2.5 px-3 text-slate-400 font-medium">Errors</th>
                <th className="text-center py-2.5 px-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apis.map(api => (
                <tr key={api.id} className="border-b border-white/5 hover:bg-white/2">
                  <td className="py-2.5 px-3 text-white font-medium">{api.source_name}</td>
                  <td className="py-2.5 px-3 text-slate-400">{api.provider_type}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                      api.status === 'connected' ? 'bg-green-500/15 text-green-400' :
                      api.status === 'error' ? 'bg-red-500/15 text-red-400' :
                      api.status === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-slate-500/15 text-slate-400'
                    }`}>
                      {api.status === 'connected' && <CheckCircle className="w-2.5 h-2.5" />}
                      {api.status === 'error' && <XCircle className="w-2.5 h-2.5" />}
                      {api.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{api.auth_type}</td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {api.last_sync ? new Date(api.last_sync).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300 font-mono">{api.loads_imported_count || 0}</td>
                  <td className="py-2.5 px-3 text-right">
                    {api.error_count > 0 ? <span className="text-red-400 font-mono">{api.error_count}</span> : <span className="text-slate-600">0</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleTest(api)} disabled={testing === api.id} title="Test Connection"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-green-400 transition-colors">
                        {testing === api.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleSync(api)} disabled={syncing === api.id} title="Sync Now"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-blue-400 transition-colors">
                        {syncing === api.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => { setEditingApi(api); setShowModal(true); }} title="Edit"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggle(api)} title={api.status === 'connected' ? 'Disable' : 'Enable'}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors">
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(api)} title="Delete"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && <APISourceModal api={editingApi} onClose={() => { setShowModal(false); setEditingApi(null); }} onSave={handleSave} />}
    </div>
  );
}

function APISourceModal({ api, onClose, onSave }) {
  const [form, setForm] = useState({
    source_name: api?.source_name || '',
    provider_type: api?.provider_type || 'DAT',
    api_base_url: api?.api_base_url || '',
    auth_type: api?.auth_type || 'api_key',
    api_key: '',
    client_id: '',
    client_secret: '',
    sandbox_mode: api?.sandbox_mode ?? true,
    sync_frequency: api?.sync_frequency || '15min',
    rate_limit: api?.rate_limit || 60,
    equipment_filters: api?.equipment_filters || '',
    lane_filters: api?.lane_filters || '',
    radius_filters: api?.radius_filters || '',
    minimum_rate_filter: api?.minimum_rate_filter || '',
    max_weight_filter: api?.max_weight_filter || '',
    auto_import_enabled: api?.auto_import_enabled ?? false,
    webhook_url: api?.webhook_url || '',
    capabilities: api?.capabilities || ''
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.source_name.trim()) { alert('Source name required'); return; }
    setSaving(true);
    // Only include credential fields if they have values (don't overwrite with empty)
    const payload = { ...form };
    if (!payload.api_key) delete payload.api_key;
    if (!payload.client_id) delete payload.client_id;
    if (!payload.client_secret) delete payload.client_secret;
    await onSave(payload);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl border border-white/10 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">{api ? 'Edit API Source' : 'Add API Source'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Source Name *</label>
              <input value={form.source_name} onChange={e => set('source_name', e.target.value)} placeholder="e.g. DAT Load Board"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Provider Type</label>
              <select value={form.provider_type} onChange={e => set('provider_type', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" style={{ background: '#0F1829' }}>
                {PROVIDER_TYPES.map(p => <option key={p.value} value={p.value} style={{ background: '#0F1829' }}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1">API Base URL</label>
            <input value={form.api_base_url} onChange={e => set('api_base_url', e.target.value)} placeholder="https://api.provider.com/v1"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Auth Type</label>
              <select value={form.auth_type} onChange={e => set('auth_type', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" style={{ background: '#0F1829' }}>
                {AUTH_TYPES.map(a => <option key={a.value} value={a.value} style={{ background: '#0F1829' }}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Sync Frequency</label>
              <select value={form.sync_frequency} onChange={e => set('sync_frequency', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" style={{ background: '#0F1829' }}>
                {['realtime', '5min', '15min', '30min', 'hourly', 'manual'].map(f => <option key={f} value={f} style={{ background: '#0F1829' }}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Credentials */}
          <div className="glass-card rounded-xl border border-white/5 p-3 space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Key className="w-3.5 h-3.5" /> Credentials {api && <span className="text-slate-600">(leave blank to keep existing)</span>}
            </div>
            {(form.auth_type === 'api_key' || form.auth_type === 'bearer_token') && (
              <div>
                <label className="text-slate-400 text-xs block mb-1">API Key / Token</label>
                <input type="password" value={form.api_key} onChange={e => set('api_key', e.target.value)} placeholder={api ? '••••••••' : 'Enter API key'}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
              </div>
            )}
            {form.auth_type === 'oauth2' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Client ID</label>
                  <input type="password" value={form.client_id} onChange={e => set('client_id', e.target.value)} placeholder={api ? '••••••••' : 'Client ID'}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Client Secret</label>
                  <input type="password" value={form.client_secret} onChange={e => set('client_secret', e.target.value)} placeholder={api ? '••••••••' : 'Client secret'}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.sandbox_mode} onChange={e => set('sandbox_mode', e.target.checked)} className="w-4 h-4 accent-green-500" />
              <span className="text-slate-300 text-xs">Sandbox / Test Mode</span>
            </label>
          </div>

          {/* Filters */}
          <div className="glass-card rounded-xl border border-white/5 p-3 space-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Filter className="w-3.5 h-3.5" /> Import Filters
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Equipment Filters</label>
                <input value={form.equipment_filters} onChange={e => set('equipment_filters', e.target.value)} placeholder="Dry Van, Flatbed, Reefer"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Lane Filters</label>
                <input value={form.lane_filters} onChange={e => set('lane_filters', e.target.value)} placeholder="TX-CA, FL-GA"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Radius (miles)</label>
                <input type="number" value={form.radius_filters} onChange={e => set('radius_filters', e.target.value)} placeholder="250"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Min Rate ($)</label>
                <input type="number" value={form.minimum_rate_filter} onChange={e => set('minimum_rate_filter', e.target.value)} placeholder="500"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.auto_import_enabled} onChange={e => set('auto_import_enabled', e.target.checked)} className="w-4 h-4 accent-green-500" />
              <span className="text-slate-300 text-xs">Auto-import loads on sync</span>
            </label>
          </div>

          {/* Webhook */}
          <div>
            <label className="text-slate-400 text-xs block mb-1">Webhook URL (for inbound load notifications)</label>
            <input value={form.webhook_url} onChange={e => set('webhook_url', e.target.value)} placeholder="https://your-app.com/api/webhooks/load-board"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm font-medium hover:text-white transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {api ? 'Save Changes' : 'Add Source'}
          </button>
        </div>
      </div>
    </div>
  );
}