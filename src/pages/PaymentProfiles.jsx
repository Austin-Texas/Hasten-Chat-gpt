import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, Edit2, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import PaymentProfileForm from '@/components/settlement/PaymentProfileForm';

const PAYOUT_METHOD_LABELS = {
  manual_ach: 'Manual ACH',
  check: 'Check',
  wire: 'Wire Transfer',
  zelle: 'Zelle',
  direct_deposit: 'Direct Deposit',
  factoring_company: 'Factoring Company'
};

const maskNumber = (num, showLast = 4) => {
  if (!num) return '****';
  const str = String(num).padStart(4, '0'); // Ensure at least 4 digits
  return '*'.repeat(Math.max(1, str.length - showLast)) + str.slice(-showLast);
};

export default function PaymentProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  const [showMasked, setShowMasked] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Fetch all payment profiles
      const paymentProfiles = await base44.asServiceRole.entities.ContractorPaymentProfile.list('-created_date', 500);
      console.log('PaymentProfiles page: fetched', paymentProfiles.length, 'profiles');

      // Enrich with contractor info
      const enrichedProfiles = await Promise.all(
        paymentProfiles.map(async (profile) => {
          try {
            // Try to get contractor by driver_id
            const contractors = await base44.asServiceRole.entities.ContractorProfile.filter(
              { driver_id: profile.driver_id },
              '-created_date',
              1
            );
            if (contractors[0]) {
              return {
                ...profile,
                contractor: contractors[0],
                contractorName: `${contractors[0].first_name} ${contractors[0].last_name}`
              };
            }
          } catch (err) {
            console.error('Error fetching contractor:', err);
          }
          return { ...profile, contractorName: profile.driver_name || 'Unknown' };
        })
      );

      console.log('PaymentProfiles page: enriched profiles:', enrichedProfiles.length);
      setProfiles(enrichedProfiles);
    } catch (err) {
      console.error('Error fetching payment profiles:', err);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (formData) => {
    try {
      if (selectedProfile?.id) {
        // Update existing
        await base44.asServiceRole.entities.ContractorPaymentProfile.update(selectedProfile.id, formData);
      } else {
        // Create new
        await base44.asServiceRole.entities.ContractorPaymentProfile.create(formData);
      }
      await fetchData();
      setShowForm(false);
      setSelectedProfile(null);
    } catch (err) {
      console.error('Error saving payment profile:', err);
      alert('Failed to save payment profile');
    }
  };

  // Role-based access check
  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const canViewSensitive = user?.role === 'admin' || user?.role === 'finance';

  if (loading) {
    return (
      <div className="space-y-5 animate-slide-up">
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-orange-400" />
            Contractor Payment Profiles
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {profiles.length} profile{profiles.length !== 1 ? 's' : ''} | Manage bank and payout information
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setSelectedProfile(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            + New Profile
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">
                {selectedProfile ? 'Edit Payment Profile' : 'New Payment Profile'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <PaymentProfileForm
              profile={selectedProfile}
              onSave={handleSaveProfile}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Profiles List */}
      {profiles.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-xl border border-white/5">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No payment profiles found</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          {profiles.map((profile) => {
            const isMasked = showMasked[profile.id] !== true;
            return (
              <div key={profile.id} className="p-5 hover:bg-white/2 transition-colors">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{profile.contractorName}</h3>
                    <p className="text-slate-500 text-xs mt-0.5">{profile.legal_business_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/15 border border-blue-500/25 text-blue-400">
                      {PAYOUT_METHOD_LABELS[profile.payout_method] || profile.payout_method}
                    </span>
                    {profile.is_active && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/15 border border-green-500/25 text-green-400">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                  {/* Bank Info */}
                  <div>
                    <p className="text-slate-500 mb-1">Bank Information</p>
                    {canViewSensitive ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Bank:</span>
                          <span className="text-white">{profile.bank_name || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Routing:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-white font-mono">
                              {isMasked && profile.routing_number_last4 ? maskNumber(profile.routing_number_last4) : profile.routing_number_last4 || '—'}
                            </span>
                            {profile.routing_number_last4 && (
                              <button
                                onClick={() => setShowMasked(prev => ({ ...prev, [profile.id]: !prev[profile.id] }))}
                                className="p-0.5 hover:bg-white/10 rounded transition-colors"
                              >
                                {isMasked ? <Eye className="w-3 h-3 text-slate-500" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Account:</span>
                          <span className="text-white font-mono">
                            {isMasked && profile.account_number_last4 ? maskNumber(profile.account_number_last4) : profile.account_number_last4 || '—'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs">Bank details are restricted</p>
                    )}
                  </div>

                  {/* Documentation */}
                  <div>
                    <p className="text-slate-500 mb-1">Documentation</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">W-9:</span>
                        <div className="flex items-center gap-1">
                          {profile.w9_uploaded ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" />
                              <span className="text-green-400 text-xs">Uploaded</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-amber-400" />
                              <span className="text-amber-400 text-xs">Pending</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">ACH Auth:</span>
                        <div className="flex items-center gap-1">
                          {profile.ach_authorization_uploaded ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" />
                              <span className="text-green-400 text-xs">Uploaded</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-amber-400" />
                              <span className="text-amber-400 text-xs">Pending</span>
                            </>
                          )}
                        </div>
                      </div>
                      {profile.factoring_company_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Factoring:</span>
                          <span className="text-white text-xs">{profile.factoring_company_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {profile.notes && (
                  <div className="mb-3 p-2 rounded bg-slate-800/50 border border-slate-700">
                    <p className="text-slate-400 text-xs">{profile.notes}</p>
                  </div>
                )}

                {/* Actions */}
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedProfile(profile);
                        setShowForm(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}