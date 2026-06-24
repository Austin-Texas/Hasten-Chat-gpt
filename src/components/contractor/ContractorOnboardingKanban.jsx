import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import StatusBadge from '@/components/hasten/StatusBadge';

const KANBAN_STAGES = [
  { key: 'prospect', label: 'Prospect', icon: Clock, color: 'blue' },
  { key: 'onboarding', label: 'Onboarding', icon: Clock, color: 'amber' },
  { key: 'active', label: 'Active', icon: CheckCircle, color: 'green' },
  { key: 'suspended', label: 'Suspended', icon: AlertCircle, color: 'red' },
];

export default function ContractorOnboardingKanban() {
  const [contractors, setContractors] = useState([]);
  const [checklists, setChecklists] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all contractors regardless of status
      const allContractors = await base44.asServiceRole.entities.ContractorProfile.list('-created_date', 500);
      setContractors(allContractors);

      // Fetch checklists for each contractor
      const checklistMap = {};
      for (const contractor of allContractors) {
        try {
          const checklists = await base44.asServiceRole.entities.ContractorChecklist.filter(
            { contractor_profile_id: contractor.id },
            '-created_date',
            1
          );
          checklistMap[contractor.id] = checklists[0] || null;
        } catch (err) {
          console.error(`Error fetching checklist for ${contractor.id}:`, err);
        }
      }
      setChecklists(checklistMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const groupedContractors = KANBAN_STAGES.reduce((acc, stage) => {
    acc[stage.key] = contractors.filter(c => c.status === stage.key);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-white font-heading font-bold text-2xl flex items-center gap-2">
          <Users className="w-6 h-6 text-orange-400" />
          Onboarding Pipeline
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Track contractors through onboarding stages from prospect to active
        </p>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 overflow-x-auto pb-4">
        {KANBAN_STAGES.map(stage => {
          const stageContractors = groupedContractors[stage.key];
          const Icon = stage.icon;

          return (
            <div
              key={stage.key}
              className="flex-shrink-0 w-full lg:w-80"
            >
              {/* Stage Header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <Icon className={`w-5 h-5 text-${stage.color}-400`} />
                <h3 className="text-white font-semibold text-sm">{stage.label}</h3>
                <span className="ml-auto text-slate-500 text-xs font-medium bg-white/5 px-2 py-1 rounded">
                  {stageContractors.length}
                </span>
              </div>

              {/* Stage Cards */}
              <div className="space-y-3">
                {stageContractors.length === 0 ? (
                  <div className="text-center py-8 rounded-lg border border-dashed border-white/10">
                    <p className="text-slate-500 text-xs">No contractors</p>
                  </div>
                ) : (
                  stageContractors.map(contractor => {
                    const checklist = checklists[contractor.id];
                    const progress = checklist?.overall_progress || 0;

                    return (
                      <div
                        key={contractor.id}
                        className="glass-card rounded-lg p-4 border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-sm truncate">
                              {contractor.first_name} {contractor.last_name}
                            </h4>
                            <p className="text-slate-500 text-xs truncate">
                              {contractor.legal_business_name}
                            </p>
                          </div>
                          <StatusBadge status={contractor.status} className="text-xs flex-shrink-0" />
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-400 text-xs">Onboarding</span>
                            <span className="text-orange-400 text-xs font-semibold">{progress}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Checklist Preview */}
                        {checklist && (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              {checklist.w9_uploaded ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                              <span className="text-slate-400">W-9</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {checklist.agreement_signed ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                              <span className="text-slate-400">Agreement</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {checklist.ach_authorization_uploaded ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                              <span className="text-slate-400">ACH Auth</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
        {KANBAN_STAGES.map(stage => {
          const count = groupedContractors[stage.key].length;
          return (
            <div key={stage.key} className="glass-card rounded-lg p-4 border border-white/5">
              <div className="text-slate-500 text-xs font-semibold mb-1">{stage.label}</div>
              <div className="text-white font-heading font-bold text-2xl">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}