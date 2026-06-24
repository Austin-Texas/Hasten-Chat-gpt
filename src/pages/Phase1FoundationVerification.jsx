import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Loader2, Plus } from 'lucide-react';

export default function Phase1FoundationVerification() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testUserId, setTestUserId] = useState(null);

  const tests = [
    {
      id: 'auth_user_created',
      label: 'Auth user created with correct role',
      fn: async (userId) => {
        const user = await base44.asServiceRole.entities.User.get(userId);
        if (!user) throw new Error('User not found');
        if (user.role !== 'user' && user.role !== 'admin') throw new Error(`Wrong auth role: ${user.role}`);
        return { pass: true, data: { role: user.role } };
      }
    },
    {
      id: 'business_role_set',
      label: 'businessRole field is set correctly',
      fn: async (userId) => {
        const user = await base44.asServiceRole.entities.User.get(userId);
        if (!user.businessRole) throw new Error('businessRole not set');
        if (!['admin', 'system_manager', 'dispatcher', 'fleet_manager', 'finance', 'safety_compliance', 'driver', 'client', 'broker'].includes(user.businessRole)) {
          throw new Error(`Invalid businessRole: ${user.businessRole}`);
        }
        return { pass: true, data: { businessRole: user.businessRole } };
      }
    },
    {
      id: 'userprofile_created',
      label: 'UserProfile created and linked',
      fn: async (userId) => {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter(
          { authUserId: userId },
          '-created_date',
          1
        );
        if (!profiles || profiles.length === 0) throw new Error('UserProfile not found');
        const profile = profiles[0];
        if (profile.authUserId !== userId) throw new Error('authUserId mismatch');
        return { pass: true, data: { profileId: profile.id, businessRole: profile.businessRole } };
      }
    },
    {
      id: 'driver_profile_created',
      label: 'Driver profile created (for driver role)',
      fn: async (userId) => {
        const user = await base44.asServiceRole.entities.User.get(userId);
        if (user.businessRole !== 'driver') return { pass: true, data: { skipped: 'Not a driver' } };

        const drivers = await base44.asServiceRole.entities.Driver.filter(
          { user_id: userId },
          '-created_date',
          1
        );
        if (!drivers || drivers.length === 0) throw new Error('Driver not found');
        return { pass: true, data: { driverId: drivers[0].id } };
      }
    },
    {
      id: 'contractor_profile_created',
      label: 'ContractorProfile created (for owner-operator drivers)',
      fn: async (userId) => {
        const user = await base44.asServiceRole.entities.User.get(userId);
        if (user.businessRole !== 'driver') return { pass: true, data: { skipped: 'Not a driver' } };

        const drivers = await base44.asServiceRole.entities.Driver.filter(
          { user_id: userId },
          '-created_date',
          1
        );
        if (!drivers?.[0]?.id) return { pass: false, data: { error: 'Driver not found' } };

        const contractors = await base44.asServiceRole.entities.ContractorProfile.filter(
          { driver_id: drivers[0].id },
          '-created_date',
          1
        );
        if (!contractors || contractors.length === 0) throw new Error('ContractorProfile not found');
        return { pass: true, data: { contractorId: contractors[0].id } };
      }
    },
    {
      id: 'contractor_checklist',
      label: 'ContractorChecklist created',
      fn: async (userId) => {
        const user = await base44.asServiceRole.entities.User.get(userId);
        if (user.businessRole !== 'driver') return { pass: true, data: { skipped: 'Not a driver' } };

        const contractors = await base44.asServiceRole.entities.ContractorProfile.filter(
          { user_id: userId },
          '-created_date',
          1
        );
        if (!contractors?.[0]?.id) return { pass: false, data: { error: 'ContractorProfile not found' } };

        const checklists = await base44.asServiceRole.entities.ContractorChecklist.filter(
          { contractor_profile_id: contractors[0].id },
          '-created_date',
          1
        );
        if (!checklists || checklists.length === 0) throw new Error('ContractorChecklist not found');
        return { pass: true, data: { checklistId: checklists[0].id } };
      }
    },
    {
      id: 'payment_profile',
      label: 'ContractorPaymentProfile created',
      fn: async (userId) => {
        const user = await base44.asServiceRole.entities.User.get(userId);
        if (user.businessRole !== 'driver') return { pass: true, data: { skipped: 'Not a driver' } };

        const drivers = await base44.asServiceRole.entities.Driver.filter(
          { user_id: userId },
          '-created_date',
          1
        );
        if (!drivers?.[0]?.id) return { pass: false, data: { error: 'Driver not found' } };

        const paymentProfiles = await base44.asServiceRole.entities.ContractorPaymentProfile.filter(
          { driver_id: drivers[0].id },
          '-created_date',
          1
        );
        if (!paymentProfiles || paymentProfiles.length === 0) throw new Error('ContractorPaymentProfile not found');
        return { pass: true, data: { profileId: paymentProfiles[0].id } };
      }
    },
    {
      id: 'contractor_documents',
      label: 'Required ContractorDocument records created',
      fn: async (userId) => {
        const user = await base44.asServiceRole.entities.User.get(userId);
        if (user.businessRole !== 'driver') return { pass: true, data: { skipped: 'Not a driver' } };

        const contractors = await base44.asServiceRole.entities.ContractorProfile.filter(
          { user_id: userId },
          '-created_date',
          1
        );
        if (!contractors?.[0]?.id) return { pass: false, data: { error: 'ContractorProfile not found' } };

        const docs = await base44.asServiceRole.entities.ContractorDocument.filter(
          { contractor_profile_id: contractors[0].id },
          '-created_date',
          10
        );
        if (!docs || docs.length < 6) throw new Error(`Only ${docs?.length || 0} documents found, expected 6+`);
        return { pass: true, data: { count: docs.length } };
      }
    },
    {
      id: 'userprofile_linked',
      label: 'UserProfile linkedDriverId/linkedContractorId are populated',
      fn: async (userId) => {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter(
          { authUserId: userId },
          '-created_date',
          1
        );
        if (!profiles?.[0]) return { pass: false, data: { error: 'UserProfile not found' } };

        const profile = profiles[0];
        const user = await base44.asServiceRole.entities.User.get(userId);

        if (user.businessRole === 'driver') {
          if (!profile.linkedDriverId) throw new Error('linkedDriverId not set');
          if (!profile.linkedContractorId) throw new Error('linkedContractorId not set');
        }

        return { pass: true, data: { linkedDriverId: profile.linkedDriverId, linkedContractorId: profile.linkedContractorId } };
      }
    }
  ];

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // Invite a test driver user
      const testEmail = `phase1_test_${Date.now()}@hasten.local`;
      console.log('[Phase1] Inviting test driver:', testEmail);

      const inviteResp = await base44.functions.invoke('inviteUserWithProfile', {
        fullName: 'Phase 1 Test Driver',
        email: testEmail,
        businessRole: 'driver',
        isActive: true,
        createBusinessProfile: true,
        sendInviteEmail: false
      });

      if (!inviteResp.data?.success) {
        alert(`Invite failed: ${inviteResp.data?.error}`);
        setLoading(false);
        return;
      }

      const userId = inviteResp.data.authUserId;
      setTestUserId(userId);
      console.log('[Phase1] Test user created:', userId);

      // Run tests
      const results = [];
      for (const test of tests) {
        try {
          const result = await test.fn(userId);
          results.push({
            id: test.id,
            label: test.label,
            pass: result.pass ?? true,
            data: result.data,
            error: null
          });
          console.log(`[Phase1] ${test.label}: PASS`);
        } catch (err) {
          results.push({
            id: test.id,
            label: test.label,
            pass: false,
            data: null,
            error: err.message
          });
          console.error(`[Phase1] ${test.label}: FAIL -`, err.message);
        }
      }

      setTestResults(results);
    } catch (err) {
      console.error('[Phase1] Test error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const allPassed = testResults.length > 0 && testResults.every(r => r.pass);

  return (
    <div className="space-y-5 animate-slide-up max-w-4xl">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Phase 1 — Foundation Verification</h1>
        <p className="text-slate-400 text-sm mt-0.5">Test user/profile/role linking and business profile creation</p>
      </div>

      <div className="glass-card rounded-xl border border-white/5 p-5">
        <button
          onClick={runTests}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Run Phase 1 Tests
            </>
          )}
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-4">
          <div className={`glass-card rounded-xl border-2 p-5 ${
            allPassed 
              ? 'border-green-500/30 bg-green-500/5' 
              : 'border-red-500/30 bg-red-500/5'
          }`}>
            <div className="flex items-center gap-3">
              {allPassed ? (
                <Check className="w-6 h-6 text-green-400" />
              ) : (
                <X className="w-6 h-6 text-red-400" />
              )}
              <div>
                <p className={`font-semibold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>
                  {allPassed ? '✓ Phase 1 PASS' : '✗ Phase 1 FAIL'}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {testResults.filter(r => r.pass).length} / {testResults.length} tests passed
                </p>
              </div>
            </div>
            {testUserId && (
              <p className="text-slate-500 text-xs mt-3">Test User ID: <code className="bg-white/10 px-2 py-1 rounded">{testUserId}</code></p>
            )}
          </div>

          <div className="space-y-3">
            {testResults.map(result => (
              <div key={result.id} className="glass-card rounded-xl border border-white/5 p-4">
                <div className="flex items-start gap-3">
                  {result.pass ? (
                    <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${result.pass ? 'text-white' : 'text-red-400'}`}>
                      {result.label}
                    </p>
                    {result.error && (
                      <p className="text-red-400 text-xs mt-2">Error: {result.error}</p>
                    )}
                    {result.data && (
                      <div className="text-slate-500 text-xs mt-2 space-y-1">
                        {Object.entries(result.data).map(([key, val]) => (
                          <div key={key}>
                            <span className="text-slate-400">{key}:</span> {JSON.stringify(val)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {allPassed && (
            <div className="glass-card rounded-xl border border-green-500/30 bg-green-500/5 p-5">
              <h3 className="text-green-400 font-semibold mb-3">✓ Phase 1 Complete</h3>
              <p className="text-slate-400 text-sm mb-3">All foundation tests passed. The system is ready to proceed to Phase 2.</p>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>✓ Auth users link to UserProfile correctly</li>
                <li>✓ businessRole is properly set and enforced</li>
                <li>✓ Driver profiles are auto-created with contractor hierarchy</li>
                <li>✓ Payment profiles are initialized</li>
                <li>✓ All required document placeholders exist</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}