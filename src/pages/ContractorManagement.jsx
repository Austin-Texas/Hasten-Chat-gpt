import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, FileText, Settings } from 'lucide-react';
import ContractorDirectory from '@/components/contractor/ContractorDirectory';
import ContractorOnboarding from '@/components/contractor/ContractorOnboarding';

export default function ContractorManagement() {
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [checklist, setChecklist] = useState(null);

  const handleSelectContractor = async (contractor) => {
    setSelectedContractor(contractor);
    try {
      const checklists = await base44.asServiceRole.entities.ContractorChecklist.filter(
        { contractor_profile_id: contractor.id },
        '-created_date',
        1
      );
      if (checklists[0]) {
        setChecklist(checklists[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-400" />
            Contractor Management
          </h1>
          <p className="text-slate-400 text-xs mt-1">Manage owner-operator contractors and onboarding</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/5 w-fit text-xs">
        {[
          { key: 'directory', label: 'Directory', icon: Users },
          { key: 'documents', label: 'Documents', icon: FileText },
          { key: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded text-xs font-medium transition-all duration-150 ${
              activeTab === tab.key
                ? 'bg-orange-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'directory' && <ContractorDirectory onSelect={handleSelectContractor} />}

      {/* Contractor Detail */}
      {selectedContractor && checklist && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">
              {selectedContractor.first_name} {selectedContractor.last_name}
            </h2>
            <button
              onClick={() => setSelectedContractor(null)}
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              ✕
            </button>
          </div>

          <ContractorOnboarding
            contractor={selectedContractor}
            checklist={checklist}
          />
        </div>
      )}

      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="glass-card rounded-xl border border-white/5 p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm">Contractor Settings</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-white text-xs font-semibold block mb-1.5">Default Settlement Rule</label>
              <input type="text" placeholder="e.g., 80/20 Split" disabled
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs disabled:opacity-50" />
            </div>

            <div>
              <label className="text-white text-xs font-semibold block mb-1.5">Onboarding Checklist</label>
              <ul className="space-y-1 text-xs text-slate-400">
                <li>✓ Profile Complete</li>
                <li>✓ W-9 Uploaded</li>
                <li>✓ ACH Authorization</li>
                <li>✓ Agreement Signed</li>
              </ul>
            </div>

            <div>
              <label className="text-white text-xs font-semibold block mb-1.5">Required Documents</label>
              <ul className="space-y-1 text-xs text-slate-400">
                <li>• W-9 Form</li>
                <li>• Contractor Agreement</li>
                <li>• ACH Authorization</li>
                <li>• CDL</li>
                <li>• Medical Card</li>
                <li>• Insurance Certificate</li>
              </ul>
            </div>

            <div>
              <label className="text-white text-xs font-semibold block mb-1.5">Compliance Alerts</label>
              <p className="text-slate-500 text-xs">Daily expiry checks at 8:00 AM EST</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}