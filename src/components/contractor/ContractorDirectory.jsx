import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import StatusBadge from '@/components/hasten/StatusBadge';

const STATUS_COLORS = {
  prospect: 'bg-slate-500/15 text-slate-400',
  onboarding: 'bg-amber-500/15 text-amber-400',
  active: 'bg-green-500/15 text-green-400',
  suspended: 'bg-red-500/15 text-red-400',
  inactive: 'bg-slate-600/15 text-slate-500',
  terminated: 'bg-red-600/15 text-red-500'
};

const COMPLIANCE_COLORS = {
  compliant: 'text-green-400',
  at_risk: 'text-amber-400',
  non_compliant: 'text-red-400'
};

export default function ContractorDirectory({ onSelect }) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      const data = await base44.asServiceRole.entities.ContractorProfile.list('-created_date', 500);
      console.log('Contractors loaded:', data.length);
      setContractors(data);
    } catch (err) {
      console.error('Error loading contractors:', err);
      setContractors([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = contractors.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.legal_business_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q);
    
    let matchDocs = true;
    if (docFilter === 'missing_docs') {
      matchDocs = (!c.w9_status || c.w9_status === 'pending') || 
                  (!c.ach_authorization_status || c.ach_authorization_status === 'pending');
    } else if (docFilter === 'pending_signature') {
      matchDocs = !c.agreement_signed;
    }
    
    return matchStatus && matchSearch && matchDocs;
  });

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Contractor Directory</h1>
          <p className="text-slate-400 text-sm mt-0.5">{contractors.length} total contractors</p>
        </div>
        <button 
          onClick={() => {
            if (onSelect) {
              onSelect({ isNewContractor: true });
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors">
          <Plus className="w-4 h-4" /> New Contractor
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
          {['all', 'prospect', 'onboarding', 'active', 'suspended'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border capitalize ${
                statusFilter === s
                  ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <select
          value={docFilter}
          onChange={(e) => setDocFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs font-medium focus:outline-none focus:border-orange-500/40 hover:text-white transition-colors"
        >
          <option value="all">All Documents</option>
          <option value="missing_docs">Missing Documents</option>
          <option value="pending_signature">Pending Signature</option>
        </select>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name, business, or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
        />
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No contractors found</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
          {filtered.map(contractor => (
            <div 
              key={contractor.id} 
              className="p-5 hover:bg-white/2 transition-colors cursor-pointer"
              onClick={() => onSelect && onSelect(contractor)}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">
                      {contractor.first_name} {contractor.last_name}
                    </h3>
                    <StatusBadge status={contractor.status} />
                  </div>
                  <p className="text-slate-500 text-xs mt-1">{contractor.legal_business_name}</p>
                </div>

                <div className="text-right">
                  <div className={`text-xs font-semibold flex items-center gap-1 ${COMPLIANCE_COLORS[contractor.compliance_status]}`}>
                    {contractor.compliance_status === 'compliant' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {contractor.compliance_status}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 text-xs text-slate-500">
                <span>{contractor.email}</span>
                <span>{contractor.phone}</span>
                {contractor.start_date && <span>Started: {new Date(contractor.start_date).toLocaleDateString()}</span>}
              </div>

              {/* Onboarding Progress */}
              <div className="mt-3 flex gap-2">
                {contractor.w9_status === 'uploaded' && <span className="px-2 py-1 rounded bg-green-500/15 text-green-400 text-xs">W-9</span>}
                {contractor.ach_authorization_status === 'uploaded' && <span className="px-2 py-1 rounded bg-green-500/15 text-green-400 text-xs">ACH</span>}
                {contractor.insurance_certificate_status === 'uploaded' && <span className="px-2 py-1 rounded bg-green-500/15 text-green-400 text-xs">Insurance</span>}
                {contractor.onboarding_complete && <span className="px-2 py-1 rounded bg-blue-500/15 text-blue-400 text-xs font-semibold">100% Complete</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}