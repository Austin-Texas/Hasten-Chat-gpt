import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  MoreVertical, Edit2, UserCog, Power, RotateCcw, Eye, Archive, Trash2,
  Loader2, AlertCircle
} from 'lucide-react';

export default function UserActionMenu({ user, onUserUpdated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.businessRole);

  const ROLE_OPTIONS = [
    'admin', 'system_manager', 'dispatcher', 'fleet_manager',
    'finance', 'safety_compliance', 'driver', 'client', 'broker'
  ];

  const handleAction = async (action, data = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('manageUserAction', {
        action,
        userId: user.id,
        targetUserId: user.id,
        data
      });

      if (!response.data?.success && response.data?.error) {
        setError(response.data.message || response.data.error);
        return;
      }

      // Success — update parent and close menu
      onUserUpdated?.();
      setOpen(false);
      alert(response.data?.message || `Action completed`);
    } catch (err) {
      setError(err.message || 'Action failed');
      console.error('[UserActionMenu]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (selectedRole === user.businessRole) {
      setEditingRole(false);
      return;
    }
    await handleAction('change_business_role', { newRole: selectedRole });
    setEditingRole(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        title="User actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-48 rounded-lg bg-card border border-white/10 shadow-xl overflow-hidden">
            {/* Error message */}
            {error && (
              <div className="bg-red-500/15 border-b border-red-500/30 p-2 flex gap-2 text-xs text-red-300">
                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Business Role */}
            {editingRole ? (
              <div className="p-3 border-b border-white/5 space-y-2">
                <label className="text-xs text-slate-400 block">Business Role</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/40"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleRoleChange}
                    disabled={loading}
                    className="flex-1 px-2 py-1 rounded text-xs bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingRole(false)}
                    className="flex-1 px-2 py-1 rounded text-xs bg-white/5 text-slate-400 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingRole(true)}
                className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/10 flex items-center gap-2 transition-colors border-b border-white/5"
              >
                <UserCog className="w-3 h-3" />
                Change Role
                <span className="ml-auto text-slate-500 text-[10px]">{user.businessRole}</span>
              </button>
            )}

            {/* Activate/Deactivate */}
            <button
              onClick={() => handleAction('toggle_active', { isActive: !user.active })}
              disabled={loading}
              className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/10 flex items-center gap-2 transition-colors border-b border-white/5 disabled:opacity-50"
            >
              <Power className="w-3 h-3" />
              {user.active ? 'Deactivate' : 'Reactivate'}
            </button>

            {/* View Profile */}
            {(user.linkedDriverId || user.linkedContractorId) && (
              <button
                className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/10 flex items-center gap-2 transition-colors border-b border-white/5"
              >
                <Eye className="w-3 h-3" />
                View Profile
                <span className="ml-auto text-slate-500 text-[10px]">
                  {user.linked_profile?.type || 'Link'}
                </span>
              </button>
            )}

            {/* Resend Invite */}
            <button
              onClick={() => handleAction('resend_invite')}
              disabled={loading}
              className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/10 flex items-center gap-2 transition-colors border-b border-white/5 disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              Resend Invite
            </button>

            {/* Archive */}
            <button
              onClick={() => {
                if (confirm('Archive this user? History will be preserved.')) {
                  handleAction('archive');
                }
              }}
              disabled={loading}
              className="w-full px-3 py-2 text-left text-xs text-amber-300 hover:bg-amber-500/10 flex items-center gap-2 transition-colors border-b border-white/5 disabled:opacity-50"
            >
              <Archive className="w-3 h-3" />
              Archive User
            </button>

            {/* Delete */}
            <button
              onClick={() => {
                if (confirm('Delete this user? This action may be blocked if user has linked records.')) {
                  handleAction('delete');
                }
              }}
              disabled={loading}
              className="w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              Delete User
            </button>
          </div>
        </>
      )}
    </div>
  );
}