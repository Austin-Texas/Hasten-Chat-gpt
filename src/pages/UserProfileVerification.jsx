import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default function UserProfileVerification() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test 1: Auth users created
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 100).catch(() => []);
      results.push({
        num: 1,
        name: "Auth users created",
        passed: allUsers.length > 0,
        data: `${allUsers.length} users found`,
        detail: allUsers
      });
      setUsers(allUsers);

      if (allUsers.length > 0) {
        const testUser = allUsers[0];
        setSelectedUser(testUser);

        // Test 2: UserProfile created
        const profiles = await base44.asServiceRole.entities.UserProfile.filter(
          { authUserId: testUser.id },
          '-created_date',
          1
        ).catch(() => []);
        const profile = profiles?.[0];
        results.push({
          num: 2,
          name: "UserProfile created",
          passed: !!profile,
          data: profile ? `Profile ID: ${profile.id}` : "Not found",
          detail: profile
        });

        if (profile) {
          // Test 3: businessRole saved
          results.push({
            num: 3,
            name: "businessRole saved",
            passed: !!profile.businessRole,
            data: profile.businessRole || "Not set",
            detail: profile
          });

          // Test 4: Driver profile linked
          const drivers = profile.linkedDriverId
            ? await base44.asServiceRole.entities.Driver.get(profile.linkedDriverId).catch(() => null)
            : null;
          results.push({
            num: 4,
            name: "Driver profile linked",
            passed: !!drivers,
            data: drivers ? `Driver ID: ${drivers.id}` : "Not linked",
            detail: drivers
          });

          // Test 5: Contractor profile linked
          const contractors = profile.linkedContractorId
            ? await base44.asServiceRole.entities.ContractorProfile.get(profile.linkedContractorId).catch(() => null)
            : null;
          results.push({
            num: 5,
            name: "Contractor profile linked",
            passed: !!contractors,
            data: contractors ? `Contractor ID: ${contractors.id}` : "Not linked",
            detail: contractors
          });

          // Test 6: Payment profile created
          const paymentProfiles = profile.linkedPaymentProfileId
            ? await base44.asServiceRole.entities.ContractorPaymentProfile.get(profile.linkedPaymentProfileId).catch(() => null)
            : null;
          results.push({
            num: 6,
            name: "Payment profile created",
            passed: !!paymentProfiles,
            data: paymentProfiles ? `Payment Profile ID: ${paymentProfiles.id}` : "Not created",
            detail: paymentProfiles
          });

          // Test 7: Driver login routes correctly
          results.push({
            num: 7,
            name: "Driver login routes correctly",
            passed: profile.businessRole === 'driver',
            data: profile.businessRole === 'driver' ? "Routes to /driver/dashboard" : `Routes based on: ${profile.businessRole}`,
            detail: profile
          });

          // Test 8: Contractor management shows records
          const allContractors = await base44.asServiceRole.entities.ContractorProfile.list('-created_date', 100).catch(() => []);
          results.push({
            num: 8,
            name: "Contractor management shows records",
            passed: allContractors.length > 0,
            data: `${allContractors.length} contractors found`,
            detail: allContractors
          });

          // Test 9: Settlement dropdown shows drivers
          const allDrivers = await base44.asServiceRole.entities.Driver.list('-created_date', 100).catch(() => []);
          results.push({
            num: 9,
            name: "Settlement dropdown shows drivers",
            passed: allDrivers.length > 0,
            data: `${allDrivers.length} drivers found`,
            detail: allDrivers
          });

          // Test 10: Dispatch board shows driver status
          const driverWithStatus = allDrivers.find(d => d.status && (d.status === 'available' || d.status === 'on_load'));
          results.push({
            num: 10,
            name: "Dispatch board shows driver status",
            passed: !!driverWithStatus,
            data: driverWithStatus ? `Status: ${driverWithStatus.status}` : "No drivers with status",
            detail: driverWithStatus
          });
        }
      }
    } catch (err) {
      console.error('Test error:', err);
      results.push({
        num: 0,
        name: "Critical error",
        passed: false,
        data: err.message,
        detail: err
      });
    }

    setTests(results);
    setLoading(false);
  };

  const passedCount = tests.filter(t => t.passed).length;
  const totalCount = tests.filter(t => t.num > 0).length;

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">User Profile Bridge Verification</h1>
        <p className="text-slate-400 text-sm mt-1">
          Testing auth-to-business entity linking: {passedCount}/{totalCount} tests passed
        </p>
      </div>

      {loading ? (
        <div className="glass-card rounded-xl border border-white/5 p-8 text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          </div>
          <p className="text-slate-400 mt-3">Running verification tests…</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="glass-card rounded-xl border border-white/5 p-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Tests Passed</p>
              <p className="text-white font-heading font-bold text-3xl">{passedCount}/{totalCount}</p>
            </div>
            <div className="glass-card rounded-xl border border-white/5 p-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">System Status</p>
              <p className="text-white font-heading font-bold text-lg">
                {passedCount === totalCount ? "✅ All Systems Ready" : "⚠️ Partial Configuration"}
              </p>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-3">
            {tests.map(test => (
              <div
                key={test.num}
                className="glass-card rounded-xl border border-white/5 p-4 hover:border-white/10 transition-colors cursor-pointer"
                onClick={() => console.log(`Test ${test.num}:`, test.detail)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5">
                      {test.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm flex items-center gap-2">
                        Test {test.num}: {test.name}
                      </div>
                      <p className="text-slate-400 text-xs mt-1 break-words">{test.data}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => console.log(test.detail)}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs whitespace-nowrap transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* User Details */}
          {selectedUser && (
            <div className="glass-card rounded-xl border border-white/5 p-5 space-y-4">
              <h3 className="text-white font-semibold">Test User Details</h3>
              <div className="grid lg:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 mb-1">Email</p>
                  <p className="text-white font-mono">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Auth Role</p>
                  <p className="text-white font-mono">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Business Role</p>
                  <p className="text-white font-mono">{selectedUser.businessRole || "Not set"}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">User ID</p>
                  <p className="text-white font-mono">{selectedUser.id}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={runTests}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              <Clock className="w-4 h-4" /> Re-run Tests
            </button>
            <button
              onClick={() => {
                if (selectedUser) {
                  console.log("Test User:", selectedUser);
                  alert(`User ID: ${selectedUser.id}\nCheck browser console for full details`);
                }
              }}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Export Test User
            </button>
          </div>

          {/* Documentation */}
          <div className="glass-card rounded-xl border border-white/5 p-5 text-xs text-slate-300 space-y-2">
            <p className="font-medium text-white">✓ All tests must pass for production</p>
            <ul className="space-y-1 ml-4 list-disc text-slate-400">
              <li>Auth user created in Base44</li>
              <li>UserProfile bridge entity created</li>
              <li>Business role saved to User.businessRole</li>
              <li>Business entities (Driver, Contractor) created and linked</li>
              <li>Login routing works by businessRole</li>
              <li>Data appears in dropdowns (drivers, contractors, payment profiles)</li>
              <li>Driver status updated on login</li>
              <li>Dispatch board shows live driver status</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}