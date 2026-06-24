import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function SettlementPreview({ driver }) {
  const [loads, setLoads] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    fetchData();
  }, [driver?.id]);

  const fetchData = async () => {
    try {
      // Get this week's completed/paid loads
      const loadsData = await base44.asServiceRole.entities.Load.filter(
        { driver_id: driver?.id, status: 'completed' },
        '-created_date',
        50
      );

      // Filter to this week only
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const thisWeekLoads = loadsData.filter(load => {
        const loadDate = new Date(load.created_date);
        return loadDate >= weekStart;
      });

      setLoads(thisWeekLoads);

      // Get settlement rule
      const profiles = await base44.asServiceRole.entities.ContractorProfile.filter(
        { driver_id: driver?.id },
        '-created_date',
        1
      );

      if (profiles[0]) {
        calculateEstimates(thisWeekLoads, profiles[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimates = async (weekLoads, profile) => {
    setCalculating(true);
    try {
      const results = [];
      let totalGross = 0;
      let totalFuel = 0;
      let totalBonus = 0;
      let totalNet = 0;

      for (const load of weekLoads) {
        const res = await base44.functions.invoke('settlementCalculationEngine', {
          load_id: load.id,
          driver_id: driver?.id,
          gross_load_amount: load.rate || 0,
          driver_percentage: 85,
          company_percentage: 15,
          factoring_fee_percentage: 0,
          fuel_advance: load.fuel_advance || 0,
          bonus: load.bonus || 0
        });

        if (res.data.success) {
          results.push({
            load_id: load.id,
            load_number: load.load_number || `#${load.id.slice(-6)}`,
            ...res.data
          });

          totalGross += res.data.gross_load_amount;
          totalFuel += res.data.fuel_advance;
          totalBonus += res.data.bonus;
          totalNet += res.data.driver_net_pay;
        }
      }

      setSettlements(results);
      setTotals({
        gross: totalGross,
        fuel: totalFuel,
        bonus: totalBonus,
        net: totalNet,
        loads: weekLoads.length
      });
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-8 border border-white/5 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400 mx-auto mb-3" />
        <p className="text-slate-400">Loading settlement preview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="glass-card rounded-lg p-4 border border-white/5">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">This Week's Loads</div>
          <div className="text-white font-bold text-2xl">{totals?.loads || 0}</div>
          <div className="text-slate-600 text-xs mt-1">Completed</div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-white/5">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Total Pay</div>
          <div className="text-green-400 font-bold text-2xl">${(totals?.gross || 0).toFixed(2)}</div>
          <div className="text-slate-600 text-xs mt-1">Gross load value</div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-white/5">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Deductions</div>
          <div className="text-red-400 font-bold text-2xl">${(totals?.fuel || 0).toFixed(2)}</div>
          <div className="text-slate-600 text-xs mt-1">Fuel advances</div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-orange-500/20 bg-orange-500/5 rounded-lg">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Your Payout</div>
          <div className="text-orange-400 font-bold text-2xl">${(totals?.net || 0).toFixed(2)}</div>
          <div className="text-slate-600 text-xs mt-1">After deductions</div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      {settlements.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-400" />
            Load-by-Load Breakdown
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {settlements.map((settlement, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-white/3 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-semibold">{settlement.load_number}</div>
                    <div className="text-slate-600 text-xs mt-0.5">
                      {settlement.origin_city || 'Origin'} → {settlement.destination_city || 'Destination'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold">${settlement.driver_net_pay.toFixed(2)}</div>
                    <div className="text-slate-600 text-xs">Your net</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/10 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Load Rate:</span>
                    <span className="text-white font-medium">${settlement.gross_load_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Company Fee (15%):</span>
                    <span className="text-red-400">-${settlement.company_fee_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Your Share:</span>
                    <span className="text-white">${settlement.driver_gross_share.toFixed(2)}</span>
                  </div>

                  {settlement.fuel_advance > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fuel Advance:</span>
                      <span className="text-red-400">-${settlement.fuel_advance.toFixed(2)}</span>
                    </div>
                  )}

                  {settlement.bonus > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bonus:</span>
                      <span className="text-green-400">+${settlement.bonus.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Totals */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Gross Pay:</span>
              <span className="text-white font-medium">${(totals?.gross || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Company Fees:</span>
              <span className="text-red-400">-${((totals?.gross || 0) * 0.15).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Fuel Advances:</span>
              <span className="text-red-400">-${(totals?.fuel || 0).toFixed(2)}</span>
            </div>
            {totals?.bonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Bonuses:</span>
                <span className="text-green-400">+${(totals?.bonus || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-white/10 pt-3 mt-3">
              <span className="text-white font-semibold">Estimated Weekly Payout:</span>
              <span className="text-orange-400 font-bold text-lg">${(totals?.net || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mt-4">
            <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-blue-300 text-xs">
              <div className="font-semibold mb-0.5">Preview Only</div>
              <div>This is an estimate based on completed loads. Final settlement will be generated by finance.</div>
            </div>
          </div>
        </div>
      )}

      {settlements.length === 0 && (
        <div className="glass-card rounded-xl p-12 border border-white/5 text-center">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No completed loads this week</p>
          <p className="text-slate-600 text-sm mt-2">Your settlement preview will appear once loads are completed.</p>
        </div>
      )}
    </div>
  );
}