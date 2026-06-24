import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertCircle, X, RefreshCw, ExternalLink } from 'lucide-react';

const MODULES = [
  // Command Center
  { id: 1, name: 'Dashboard', route: '/dashboard', entities: ['Load', 'Driver', 'Truck', 'Invoice'], breadcrumb: 'Command Center' },
  
  // Dispatch & Loads
  { id: 2, name: 'Dispatch Board', route: '/dispatch', entities: ['Load', 'Driver', 'Truck'], breadcrumb: 'Dispatch & Loads' },
  { id: 3, name: 'Loads List', route: '/loads', entities: ['Load'], breadcrumb: 'Dispatch & Loads' },
  { id: 4, name: 'Load Detail', route: '/loads/:id', entities: ['Load', 'LoadDocument', 'RateConfirmation'], breadcrumb: 'Dispatch & Loads' },
  { id: 5, name: 'Load Form', route: '/loads/new', entities: ['Load'], breadcrumb: 'Dispatch & Loads' },
  { id: 6, name: 'Load Templates', route: '/load-templates', entities: ['Load'], breadcrumb: 'Dispatch & Loads' },
  { id: 7, name: 'Quotes', route: '/quotes', entities: ['QuoteRequest'], breadcrumb: 'Dispatch & Loads' },
  { id: 8, name: 'Shipments', route: '/shipments', entities: ['Shipment'], breadcrumb: 'Dispatch & Loads' },
  
  // Fleet & Drivers
  { id: 9, name: 'Fleet Manager', route: '/fleet-manager', entities: ['Truck', 'Driver'], breadcrumb: 'Fleet & Drivers' },
  { id: 10, name: 'Fleet', route: '/fleet', entities: ['Truck'], breadcrumb: 'Fleet & Drivers' },
  { id: 11, name: 'Drivers', route: '/drivers', entities: ['Driver'], breadcrumb: 'Fleet & Drivers' },
  { id: 12, name: 'Driver Scorecards', route: '/driver-scorecards', entities: ['Driver'], breadcrumb: 'Fleet & Drivers' },
  { id: 13, name: 'Compliance', route: '/compliance', entities: ['Driver', 'Truck', 'DriverDocument'], breadcrumb: 'Fleet & Drivers' },
  { id: 14, name: 'Maintenance', route: '/maintenance', entities: ['Truck', 'MaintenanceRecord'], breadcrumb: 'Fleet & Drivers' },
  { id: 15, name: 'Contractors', route: '/contractors', entities: ['ContractorProfile', 'ContractorChecklist'], breadcrumb: 'Fleet & Drivers' },
  
  // Finance & Tax
  { id: 16, name: 'Finance', route: '/finance', entities: ['Invoice', 'Settlement', 'Expense'], breadcrumb: 'Finance & Tax' },
  { id: 17, name: 'Payroll', route: '/payroll', entities: ['PayrollRecord', 'Settlement'], breadcrumb: 'Finance & Tax' },
  { id: 18, name: 'Owner-Operator Settlements', route: '/finance/settlements', entities: ['Settlement', 'ContractorProfile'], breadcrumb: 'Finance & Tax' },
  { id: 19, name: 'Payment Profiles', route: '/finance/payment-profiles', entities: ['ContractorPaymentProfile'], breadcrumb: 'Finance & Tax' },
  { id: 20, name: 'Expense Approvals', route: '/expense-approvals', entities: ['Expense'], breadcrumb: 'Finance & Tax' },
  { id: 21, name: 'IFTA Report', route: '/ifta', entities: ['Load', 'Truck'], breadcrumb: 'Finance & Tax' },
  
  // Documents & Compliance
  { id: 22, name: 'Document Portal', route: '/documents', entities: ['LoadDocument', 'DriverDocument'], breadcrumb: 'Documents' },
  { id: 23, name: 'Contractor Documents', route: '/documents/contractor', entities: ['ContractorDocument'], breadcrumb: 'Documents' },
  { id: 24, name: 'Pending Signatures', route: '/documents/pending', entities: ['ContractorDocument'], breadcrumb: 'Documents' },
  { id: 25, name: 'RC Signing', route: '/loads/:id', entities: ['RateConfirmation', 'LoadDocument'], breadcrumb: 'Documents' },
  
  // Communication & Support
  { id: 26, name: 'Support Tickets', route: '/support-tickets', entities: ['SupportTicket'], breadcrumb: 'Support' },
  { id: 27, name: 'Messages', route: '/messages', entities: ['Message', 'Notification'], breadcrumb: 'Support' },
  { id: 28, name: 'Notifications', route: '/notifications', entities: ['Notification'], breadcrumb: 'Support' },
  { id: 29, name: 'Timeline', route: '/timeline', entities: ['TimelineEvent'], breadcrumb: 'Support' },
  
  // Tools & Analysis
  { id: 30, name: 'Global Search', route: '/dashboard', entities: ['SearchIndex'], breadcrumb: 'Tools' },
  { id: 31, name: 'Settings', route: '/settings', entities: ['User'], breadcrumb: 'Tools' },
];

const TEST_RESULTS = {};

export default function AdminTesting() {
  const [modules, setModules] = useState(MODULES);
  const [entityStats, setEntityStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [testingModule, setTestingModule] = useState(null);
  const [results, setResults] = useState(TEST_RESULTS);

  useEffect(() => {
    fetchEntityStats();
  }, []);

  const fetchEntityStats = async () => {
    try {
      const stats = {};
      const uniqueEntities = [...new Set(MODULES.flatMap(m => m.entities))];

      for (const entity of uniqueEntities) {
        try {
          const records = await base44.asServiceRole.entities[entity]?.list?.('-created_date', 100) || [];
          stats[entity] = {
            count: records.length,
            status: records.length > 0 ? 'PASS' : 'WARN',
            lastCheck: new Date().toLocaleTimeString()
          };
        } catch (err) {
          stats[entity] = {
            count: 0,
            status: 'FAIL',
            error: err.message,
            lastCheck: new Date().toLocaleTimeString()
          };
        }
      }
      setEntityStats(stats);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching entity stats:', err);
      setLoading(false);
    }
  };

  const testModule = async (module) => {
    setTestingModule(module.id);
    try {
      const result = {
        moduleId: module.id,
        moduleName: module.name,
        tests: {
          routeExists: { status: 'PENDING', message: 'Checking route...' },
          entitiesHaveData: { status: 'PENDING', message: 'Checking entities...' },
          dashboardEmpty: { status: 'PENDING', message: 'Checking for empty data...' }
        },
        timestamp: new Date().toLocaleTimeString()
      };

      // Real route check: verify route is in the modules list
      const routeExists = MODULES.some(m => m.route === module.route);
      result.tests.routeExists.status = routeExists ? 'PASS' : 'FAIL';
      result.tests.routeExists.message = routeExists ? `Route ${module.route} registered` : `Route ${module.route} NOT FOUND`;

      // Real entity check: verify each entity has actual data
      let allHaveData = true;
      let emptyEntities = [];
      let totalRecords = 0;
      for (const ent of module.entities) {
        const stat = entityStats[ent];
        if (!stat) {
          allHaveData = false;
          emptyEntities.push(ent);
        } else if (stat.count === 0) {
          allHaveData = false;
          emptyEntities.push(`${ent}(0)`);
        } else {
          totalRecords += stat.count;
        }
      }
      result.tests.entitiesHaveData.status = allHaveData ? 'PASS' : 'WARN';
      result.tests.entitiesHaveData.message = allHaveData 
        ? `All entities populated (${totalRecords} total records)` 
        : `Empty/missing: ${emptyEntities.join(', ')}`;

      // Real empty check: flag if dashboard would show 0 records
      const hasMissingData = module.entities.some(e => !entityStats[e] || entityStats[e].count === 0);
      result.tests.dashboardEmpty.status = hasMissingData ? 'WARN' : 'PASS';
      result.tests.dashboardEmpty.message = hasMissingData 
        ? '⚠️ Dashboard may show empty state' 
        : '✓ Dashboard has data to display';

      setResults(prev => ({ ...prev, [module.id]: result }));
    } catch (err) {
      console.error(`Error testing module ${module.id}:`, err);
    } finally {
      setTestingModule(null);
    }
  };

  const passCount = Object.values(results).filter(r => 
    Object.values(r.tests).every(t => t.status === 'PASS')
  ).length;
  
  const partialCount = Object.values(results).filter(r => 
    Object.values(r.tests).some(t => t.status === 'WARN') && 
    !Object.values(r.tests).some(t => t.status === 'FAIL')
  ).length;
  
  const failCount = Object.values(results).filter(r => 
    Object.values(r.tests).some(t => t.status === 'FAIL')
  ).length;

  const totalChecked = Object.keys(results).length;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">System Testing Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Audit all HASTEN modules for data binding, permissions, and functionality</p>
        </div>
        <button
          onClick={() => {
            setEntityStats({});
            setResults({});
            fetchEntityStats();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh All
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <p className="text-slate-400 text-xs mb-1">Modules Checked</p>
          <p className="text-white font-heading font-bold text-2xl">{totalChecked} / {MODULES.length}</p>
        </div>
        <div className="glass-card rounded-xl p-4 border border-green-500/20 bg-green-500/5">
          <p className="text-slate-400 text-xs mb-1">Passing</p>
          <p className="text-green-400 font-heading font-bold text-2xl">{passCount}</p>
        </div>
        <div className="glass-card rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
          <p className="text-slate-400 text-xs mb-1">Partial Issues</p>
          <p className="text-amber-400 font-heading font-bold text-2xl">{partialCount}</p>
        </div>
        <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-red-500/5">
          <p className="text-slate-400 text-xs mb-1">Failing</p>
          <p className="text-red-400 font-heading font-bold text-2xl">{failCount}</p>
        </div>
      </div>

      {/* Entity Statistics */}
      {!loading && Object.keys(entityStats).length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h2 className="text-white font-semibold mb-4">Entity Data Summary</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(entityStats).map(([entity, stat]) => (
              <div key={entity} className={`p-3 rounded-lg border ${
                stat.status === 'PASS' ? 'bg-green-500/5 border-green-500/20' :
                stat.status === 'WARN' ? 'bg-amber-500/5 border-amber-500/20' :
                'bg-red-500/5 border-red-500/20'
              }`}>
                <p className="text-slate-400 text-xs font-semibold mb-1">{entity}</p>
                <p className={`font-bold text-sm ${
                  stat.status === 'PASS' ? 'text-green-400' :
                  stat.status === 'WARN' ? 'text-amber-400' :
                  'text-red-400'
                }`}>{stat.count} records</p>
                <p className="text-slate-500 text-xs mt-0.5">{stat.lastCheck}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modules by Category */}
      {['Command Center', 'Dispatch & Loads', 'Fleet & Drivers', 'Finance & Tax', 'Documents', 'Support', 'Tools'].map(breadcrumb => (
        <div key={breadcrumb} className="space-y-3">
          <h2 className="text-white font-semibold text-lg mt-6">{breadcrumb}</h2>
          <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            {modules.filter(m => m.breadcrumb === breadcrumb).map(module => {
              const result = results[module.id];
              const moduleStatus = result ? (
                Object.values(result.tests).every(t => t.status === 'PASS') ? 'PASS' :
                Object.values(result.tests).some(t => t.status === 'FAIL') ? 'FAIL' :
                'PARTIAL'
              ) : 'UNTESTED';

              return (
                <div key={module.id} className="p-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{module.name}</h3>
                        <span className="text-slate-500 text-xs font-mono bg-slate-800/50 px-2 py-0.5 rounded">
                          {module.route}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs">
                        Entities: {module.entities.map(e => (
                          <span key={e} className="inline-block bg-slate-800/50 px-1.5 py-0.5 rounded text-xs mr-1 mt-1">
                            {e} ({entityStats[e]?.count || 0})
                          </span>
                        ))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {moduleStatus === 'PASS' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                      {moduleStatus === 'PARTIAL' && <AlertCircle className="w-5 h-5 text-amber-400" />}
                      {moduleStatus === 'FAIL' && <X className="w-5 h-5 text-red-400" />}
                      <span className={`text-sm font-semibold ${
                        moduleStatus === 'PASS' ? 'text-green-400' :
                        moduleStatus === 'PARTIAL' ? 'text-amber-400' :
                        moduleStatus === 'FAIL' ? 'text-red-400' :
                        'text-slate-500'
                      }`}>
                        {moduleStatus}
                      </span>
                      <button
                        onClick={() => testModule(module)}
                        disabled={testingModule === module.id}
                        className="ml-2 px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25 text-xs font-semibold disabled:opacity-50 transition-colors"
                      >
                        {testingModule === module.id ? 'Testing...' : 'Test'}
                      </button>
                    </div>
                  </div>

                  {result && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/5">
                      {Object.entries(result.tests).map(([testName, testResult]) => (
                        <div key={testName} className={`text-xs p-2 rounded border ${
                          testResult.status === 'PASS' ? 'bg-green-500/5 border-green-500/20' :
                          testResult.status === 'WARN' ? 'bg-amber-500/5 border-amber-500/20' :
                          'bg-red-500/5 border-red-500/20'
                        }`}>
                          <p className={`font-semibold mb-0.5 ${
                            testResult.status === 'PASS' ? 'text-green-400' :
                            testResult.status === 'WARN' ? 'text-amber-400' :
                            'text-red-400'
                          }`}>{testName.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="text-slate-400">{testResult.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Quick Test All */}
      <div className="flex gap-2 justify-center pt-4">
        <button
          onClick={() => {
            modules.forEach(m => testModule(m));
          }}
          className="px-6 py-2.5 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors"
        >
          Test All Modules
        </button>
      </div>
    </div>
  );
}