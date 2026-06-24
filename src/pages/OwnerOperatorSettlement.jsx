import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Check, X, DollarSign, Download, CheckSquare, Filter, Search, Settings } from 'lucide-react';
import SettlementCalculator from '@/components/settlement/SettlementCalculator';
import StatusBadge from '@/components/hasten/StatusBadge';
import ContractorOnboardingKanban from '@/components/contractor/ContractorOnboardingKanban';
import HRAnalyticsDashboard from '@/components/hr/HRAnalyticsDashboard';
import SettlementBrandingPanel from '@/components/settlement/SettlementBrandingPanel';
import PayoutCalculationModal from '@/components/admin/PayoutCalculationModal';

export default function OwnerOperatorSettlement() {
  const [settlements, setSettlements] = useState([]);
  const [loads, setLoads] = useState([]);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [selectedForBulk, setSelectedForBulk] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('settlements');
  const [showBrandingPanel, setShowBrandingPanel] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutDriver, setPayoutDriver] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settlementsData, loadsData, driversData] = await Promise.all([
        base44.asServiceRole.entities.Settlement.list('-created_date', 500),
        base44.asServiceRole.entities.Load.list('-created_date', 200),
        base44.asServiceRole.entities.Driver.list('-created_date', 200)
      ]);
      console.log('Settlements fetched:', settlementsData.length);
      console.log('Loads fetched:', loadsData.length);
      setSettlements(settlementsData);
      setLoads(loadsData);
      setDrivers(driversData);
    } catch (err) {
      console.error('Error fetching settlement data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSettlement = async (calculationResult) => {
    try {
      const settlement = await base44.asServiceRole.entities.Settlement.create({
        load_id: selectedLoad.id,
        driver_id: selectedLoad.driver_id,
        broker_id: selectedLoad.broker_id,
        gross_load_amount: calculationResult.gross_load_amount,
        driver_percentage: 80,
        company_percentage: 20,
        factoring_fee_amount: calculationResult.factoring_fee_amount,
        company_fee_amount: calculationResult.company_fee_amount,
        driver_gross_share: calculationResult.driver_gross_share,
        fuel_advance: calculationResult.fuel_advance,
        insurance_deduction: calculationResult.insurance_deduction,
        other_deduction: calculationResult.other_deduction,
        bonus: calculationResult.bonus,
        driver_net_pay: calculationResult.driver_net_pay,
        hasten_net_revenue: calculationResult.hasten_net_revenue,
        payout_recipient: calculationResult.payout_recipient,
        status: 'draft',
        created_by: (await base44.auth.me()).id
      });

      setSettlements([...settlements, settlement]);
      setShowCalculator(false);
      setSelectedLoad(null);
    } catch (err) {
      console.error(err);
      alert('Failed to create settlement');
    }
  };

  const handleApproveSettlement = async (settlementId) => {
    try {
      const user = await base44.auth.me();
      await base44.functions.invoke('settlementApprovalWorkflow', {
        settlement_id: settlementId,
        action: 'approve',
        approved_by: user.id
      });

      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to approve settlement');
    }
  };

  const handleMarkPaid = async (settlementId) => {
    try {
      const user = await base44.auth.me();
      await base44.functions.invoke('settlementApprovalWorkflow', {
        settlement_id: settlementId,
        action: 'mark_paid',
        approved_by: user.id
      });

      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to mark settlement paid');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedForBulk.size === 0) return;
    try {
      const user = await base44.auth.me();
      for (const settlementId of selectedForBulk) {
        await base44.functions.invoke('settlementApprovalWorkflow', {
          settlement_id: settlementId,
          action: 'approve',
          approved_by: user.id
        });
      }
      setSelectedForBulk(new Set());
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to approve settlements');
    }
  };

  const handleDownloadPDF = async (settlementId) => {
    try {
      const response = await base44.functions.invoke('generateSettlementStatement', {
        settlement_id: settlementId
      });
      const htmlData = response.data;
      const blob = new Blob([htmlData], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlement-${settlementId}.html`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF');
    }
  };

  const filteredSettlements = settlements.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (searchTerm && !s.payout_recipient?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Settlement & Onboarding</h1>
          <p className="text-slate-400 text-sm mt-0.5">{settlements.length} settlements | Track onboarding pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={payoutDriver?.id || ''}
            onChange={(e) => {
              const driver = drivers.find(d => d.id === e.target.value);
              setPayoutDriver(driver || null);
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
          >
            <option value="">Select driver for payout...</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
            ))}
          </select>
          <button
            onClick={() => payoutDriver && setShowPayoutModal(true)}
            disabled={!payoutDriver}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-40"
          >
            <DollarSign className="w-4 h-4" /> Calculate Payout
          </button>
          <button
            onClick={() => setShowCalculator(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Settlement
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('settlements')}
          className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all ${
            activeTab === 'settlements' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Settlements
        </button>
        <button
          onClick={() => setActiveTab('onboarding')}
          className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all ${
            activeTab === 'onboarding' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Onboarding
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all ${
            activeTab === 'analytics' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setShowBrandingPanel(!showBrandingPanel)}
          className={`flex items-center gap-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            showBrandingPanel ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" /> PDF Branding
        </button>
      </div>

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl shadow-xl max-w-3xl w-full max-h-96 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Settlement Calculator</h2>
              <button
                onClick={() => setShowCalculator(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Select Load
              </label>
              {loads.length === 0 && (
                <div className="text-xs text-amber-400 mb-2 p-2 bg-amber-500/10 rounded">
                  No loads found. Create a load first.
                </div>
              )}
              <select
                value={selectedLoad?.id || ''}
                onChange={(e) => {
                  const load = loads.find(l => l.id === e.target.value);
                  setSelectedLoad(load);
                  console.log('Load selected:', load);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
              >
                <option value="">
                  {loads.length === 0 ? 'No loads available' : 'Select a load...'}
                </option>
                {loads.map(load => (
                  <option key={load.id} value={load.id}>
                    Load #{load.load_number || load.id.slice(-6)} - ${load.rate}
                  </option>
                ))}
              </select>
            </div>

            {selectedLoad && (
              <SettlementCalculator
                load={selectedLoad}
                onCalculate={handleCreateSettlement}
              />
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'settlements' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1 min-w-80">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by recipient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-white text-sm placeholder:text-slate-600 outline-none flex-1"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedForBulk.size > 0 && (
            <div className="glass-card rounded-lg p-4 border border-orange-500/30 bg-orange-500/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-orange-400" />
                <span className="text-white text-sm font-medium">
                  {selectedForBulk.size} settlement{selectedForBulk.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <button
                onClick={handleBulkApprove}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
              >
                <Check className="w-4 h-4" /> Approve All
              </button>
            </div>
          )}

          {/* Settlements Table */}
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
          ) : filteredSettlements.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No settlements found</p>
            </div>
          ) : (
            <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5">
              {filteredSettlements.map(settlement => {
                const isSelected = selectedForBulk.has(settlement.id);
                return (
                  <div
                    key={settlement.id}
                    className={`p-5 hover:bg-white/2 transition-colors cursor-pointer ${isSelected ? 'bg-white/5' : ''}`}
                    onClick={() => {
                      const newSet = new Set(selectedForBulk);
                      if (newSet.has(settlement.id)) {
                        newSet.delete(settlement.id);
                      } else {
                        newSet.add(settlement.id);
                      }
                      setSelectedForBulk(newSet);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const newSet = new Set(selectedForBulk);
                            if (newSet.has(settlement.id)) {
                              newSet.delete(settlement.id);
                            } else {
                              newSet.add(settlement.id);
                            }
                            setSelectedForBulk(newSet);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-orange-400 font-semibold">
                              {settlement.payout_recipient || 'Unknown'}
                            </span>
                            <StatusBadge status={settlement.status} />
                          </div>
                          <p className="text-slate-500 text-xs mt-1">Load: {settlement.load_id?.slice(-6)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">${settlement.driver_net_pay.toFixed(2)}</div>
                        <div className="text-slate-600 text-xs mt-0.5">Net Pay</div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {settlement.status === 'draft' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveSettlement(settlement.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                      )}

                      {settlement.status === 'approved' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkPaid(settlement.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Mark Paid
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(settlement.id);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-slate-500/15 border border-slate-500/25 text-slate-400 hover:bg-slate-500/25 transition-colors ml-auto"
                      >
                        <Download className="w-3 h-3" /> PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'onboarding' && (
        <ContractorOnboardingKanban />
      )}

      {activeTab === 'analytics' && (
        <HRAnalyticsDashboard />
      )}

      {showBrandingPanel && (
        <div className="space-y-5">
          <SettlementBrandingPanel />
        </div>
      )}

      {/* Payout Calculation Modal */}
      {showPayoutModal && payoutDriver && (
        <PayoutCalculationModal
          isOpen={showPayoutModal}
          onClose={() => { setShowPayoutModal(false); fetchData(); }}
          driver={payoutDriver}
          loads={loads.filter(l => l.driver_id === payoutDriver.id)}
        />
      )}

      {/* Detail View */}
      {selectedSettlement && (
        <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Settlement Details</h2>
            <button
              onClick={() => setSelectedSettlement(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Gross Load Amount</span>
              <span className="text-white">${selectedSettlement.gross_load_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Company Fee</span>
              <span className="text-white">${selectedSettlement.company_fee_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Driver Gross Share</span>
              <span className="text-white">${selectedSettlement.driver_gross_share.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Driver Net Pay</span>
              <span className="text-green-400 font-bold">${selectedSettlement.driver_net_pay.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">HASTEN Net Revenue</span>
              <span className="text-orange-400">${selectedSettlement.hasten_net_revenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payout Recipient</span>
              <span className="text-white">{selectedSettlement.payout_recipient}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}