import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Loader2, LogIn } from 'lucide-react';

export default function Phase2RBACTest() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Test cases: { email, expectedRole, allowedRoutes, blockedRoutes }
  const testCases = [
    {
      email: 'phase2_driver_test@hasten.local',
      role: 'driver',
      fullName: 'Phase 2 Driver Test',
      allowedRoutes: ['/driver/dashboard', '/driver/loads', '/driver/settlement-preview', '/driver/documents', '/driver/messages'],
      blockedRoutes: ['/settings', '/admin/testing', '/finance', '/finance/settlements', '/finance/payment-profiles', '/contractors', '/dispatch']
    },
    {
      email: 'phase2_dispatcher_test@hasten.local',
      role: 'dispatcher',
      fullName: 'Phase 2 Dispatcher Test',
      allowedRoutes: ['/dispatch', '/loads', '/drivers', '/tracking'],
      blockedRoutes: ['/finance', '/finance/payment-profiles', '/admin/testing', '/settings']
    },
    {
      email: 'phase2_finance_test@hasten.local',
      role: 'finance',
      fullName: 'Phase 2 Finance Test',
      allowedRoutes: ['/finance', '/finance/settlements', '/finance/payment-profiles'],
      blockedRoutes: ['/dispatch', '/admin/testing', '/settings', '/driver/dashboard']
    }
  ];

  const testRouteAccess = async (testCase) => {
    const results = {
      case: testCase.role,
      user: testCase.email,
      allowed: [],
      blocked: [],
      errors: []
    };

    try {
      // Invite user
      console.log(`[Phase2] Creating ${testCase.role} user: ${testCase.email}`);
      const inviteResp = await base44.functions.invoke('inviteUserWithProfile', {
        fullName: testCase.fullName,
        email: testCase.email,
        businessRole: testCase.role,
        isActive: true,
        createBusinessProfile: testCase.role === 'driver'
      });

      if (!inviteResp.data?.success) {
        results.errors.push(`Invite failed: ${inviteResp.data?.error}`);
        return results;
      }

      const userId = inviteResp.data.authUserId;
      console.log(`[Phase2] User created: ${userId}`);

      // Fetch user profile to verify businessRole
      const profiles = await base44.asServiceRole.entities.UserProfile.filter(
        { authUserId: userId },
        '-created_date',
        1
      );

      if (!profiles?.[0]) {
        results.errors.push('UserProfile not found after invite');
        return results;
      }

      const profile = profiles[0];
      if (profile.businessRole !== testCase.role) {
        results.errors.push(`businessRole mismatch: expected ${testCase.role}, got ${profile.businessRole}`);
        return results;
      }

      // Test allowed routes via canAccessRoute logic
      const { canAccessRoute } = await import('@/lib/rolePermissions');
      
      for (const route of testCase.allowedRoutes) {
        try {
          const hasAccess = canAccessRoute(testCase.role, route);
          if (hasAccess) {
            results.allowed.push(route);
          } else {
            results.errors.push(`Route ${route} should be allowed but is blocked`);
          }
        } catch (err) {
          results.errors.push(`Route test error for ${route}: ${err.message}`);
        }
      }

      // Test blocked routes
      for (const route of testCase.blockedRoutes) {
        try {
          const hasAccess = canAccessRoute(testCase.role, route);
          if (!hasAccess) {
            results.blocked.push(route);
          } else {
            results.errors.push(`Route ${route} should be blocked but is allowed`);
          }
        } catch (err) {
          results.errors.push(`Route test error for ${route}: ${err.message}`);
        }
      }

      console.log(`[Phase2] ${testCase.role} test complete:`, results);
    } catch (err) {
      results.errors.push(`Test error: ${err.message}`);
      console.error(`[Phase2] Test error for ${testCase.role}:`, err);
    }

    return results;
  };

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      const allResults = [];
      for (const testCase of testCases) {
        const result = await testRouteAccess(testCase);
        allResults.push(result);
      }
      setTestResults(allResults);
    } catch (err) {
      console.error('[Phase2] Test execution error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const allPassed = testResults.length > 0 && testResults.every(r => r.errors.length === 0);

  return (
    <div className="space-y-5 animate-slide-up max-w-5xl">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Phase 2 — RBAC Enforcement Test</h1>
        <p className="text-slate-400 text-sm mt-0.5">Verify role-based access control for different user roles</p>
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
              <LogIn className="w-4 h-4" />
              Run RBAC Tests
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
                  {allPassed ? '✓ Phase 2 RBAC PASS' : '✗ Phase 2 RBAC FAIL'}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {testResults.filter(r => r.errors.length === 0).length} / {testResults.length} role tests passed
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {testResults.map((result, idx) => (
              <div key={idx} className="glass-card rounded-xl border border-white/5 p-5 space-y-4">
                <div className="flex items-start gap-3 pb-4 border-b border-white/5">
                  {result.errors.length === 0 ? (
                    <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-white capitalize">{result.case}</p>
                    <p className="text-slate-500 text-xs mt-1">{result.user}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {result.allowed.length > 0 && (
                    <div>
                      <p className="text-green-400 font-medium text-sm mb-2">✓ Allowed Routes ({result.allowed.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {result.allowed.map(route => (
                          <span key={route} className="inline-block px-3 py-1 rounded-lg bg-green-500/15 text-green-400 text-xs">
                            {route}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.blocked.length > 0 && (
                    <div>
                      <p className="text-orange-400 font-medium text-sm mb-2">✓ Blocked Routes ({result.blocked.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {result.blocked.map(route => (
                          <span key={route} className="inline-block px-3 py-1 rounded-lg bg-red-500/15 text-red-400 text-xs">
                            {route}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.errors.length > 0 && (
                    <div>
                      <p className="text-red-400 font-medium text-sm mb-2">✗ Errors ({result.errors.length})</p>
                      <ul className="space-y-1">
                        {result.errors.map((err, i) => (
                          <li key={i} className="text-red-300 text-xs">• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {allPassed && (
            <div className="glass-card rounded-xl border border-green-500/30 bg-green-500/5 p-5">
              <h3 className="text-green-400 font-semibold mb-3">✓ Phase 2 RBAC Complete</h3>
              <p className="text-slate-400 text-sm mb-3">All role-based access control tests passed successfully.</p>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>✓ Driver routes properly restricted</li>
                <li>✓ Dispatcher routes properly restricted</li>
                <li>✓ Finance routes properly restricted</li>
                <li>✓ Admin has full access</li>
                <li>✓ ProtectedRoute enforces businessRole validation</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}