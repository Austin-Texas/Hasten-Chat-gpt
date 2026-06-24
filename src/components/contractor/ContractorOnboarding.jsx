import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

const CHECKLIST_ITEMS = [
  { key: 'profile_complete', label: 'Profile Complete' },
  { key: 'w9_uploaded', label: 'W-9 Uploaded' },
  { key: 'ach_authorization_uploaded', label: 'ACH Authorization' },
  { key: 'agreement_signed', label: 'Agreement Signed' },
  { key: 'cdl_uploaded', label: 'CDL Uploaded' },
  { key: 'medical_card_uploaded', label: 'Medical Card' },
  { key: 'insurance_uploaded', label: 'Insurance' },
  { key: 'payment_profile_complete', label: 'Payment Profile' },
  { key: 'settlement_rule_assigned', label: 'Settlement Rule' }
];

export default function ContractorOnboarding({ contractor, checklist, onStatusChange }) {
  const completedItems = CHECKLIST_ITEMS.filter(item => checklist?.[item.key]).length;
  const totalItems = CHECKLIST_ITEMS.length;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Onboarding Checklist</h3>
        <div className="text-right">
          <div className="text-orange-400 font-bold text-lg">{progressPercent}%</div>
          <div className="text-slate-600 text-xs">{completedItems} of {totalItems}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {CHECKLIST_ITEMS.map(item => {
          const isComplete = checklist?.[item.key];
          return (
            <div key={item.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/3 transition-colors">
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-slate-600 flex-shrink-0" />
              )}
              <span className={isComplete ? 'text-white' : 'text-slate-500'}>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Status */}
      {checklist?.overall_progress === 100 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 mt-4">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-green-300 text-sm">
            <div className="font-semibold mb-0.5">Onboarding Complete!</div>
            <div className="text-xs">This contractor is ready to accept loads.</div>
          </div>
        </div>
      )}

      {checklist?.overall_progress < 100 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-4">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-amber-300 text-sm">
            <div className="font-semibold mb-0.5">Onboarding in Progress</div>
            <div className="text-xs">Complete remaining items to activate contractor.</div>
          </div>
        </div>
      )}
    </div>
  );
}