import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, DollarSign, Users } from 'lucide-react';

export default function HRAnalyticsDashboard() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [metrics, setMetrics] = useState({
    avgPayout: 0,
    totalSettlements: 0,
    totalContractors: 0,
    fuelDeductionTotal: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settlementsData, contractorsData] = await Promise.all([
        base44.asServiceRole.entities.Settlement.list('-created_date', 500),
        base44.asServiceRole.entities.ContractorProfile.list('-created_date', 500)
      ]);

      setSettlements(settlementsData);

      // ─── CALCULATE METRICS ──────────────────────────────────
      const totalPayout = settlementsData.reduce((sum, s) => sum + (s.driver_net_pay || 0), 0);
      const avgPayout = settlementsData.length > 0 ? totalPayout / settlementsData.length : 0;
      const totalFuel = settlementsData.reduce((sum, s) => sum + (s.fuel_advance || 0), 0);

      setMetrics({
        avgPayout: Math.round(avgPayout * 100) / 100,
        totalSettlements: settlementsData.length,
        totalContractors: contractorsData.length,
        fuelDeductionTotal: Math.round(totalFuel * 100) / 100
      });

      // ─── WEEKLY SETTLEMENTS OVER TIME ──────────────────────
      const weeklyMap = {};
      const today = new Date();

      settlementsData.forEach(s => {
        const createdDate = new Date(s.created_date);
        const weekStart = new Date(createdDate);
        weekStart.setDate(createdDate.getDate() - createdDate.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = {
            week: weekKey,
            totalSettlements: 0,
            count: 0,
            avgAmount: 0
          };
        }

        weeklyMap[weekKey].totalSettlements += s.driver_net_pay || 0;
        weeklyMap[weekKey].count += 1;
      });

      Object.keys(weeklyMap).forEach(key => {
        weeklyMap[key].avgAmount = Math.round((weeklyMap[key].totalSettlements / weeklyMap[key].count) * 100) / 100;
      });

      const sortedWeekly = Object.values(weeklyMap)
        .sort((a, b) => new Date(a.week) - new Date(b.week))
        .slice(-12); // Last 12 weeks

      setWeeklyData(sortedWeekly);

      // ─── FUEL VS EARNINGS COMPARISON ────────────────────────
      const comparisonMap = {};

      settlementsData.slice(0, 50).forEach(s => {
        const gross = s.gross_load_amount || 0;
        const fuel = s.fuel_advance || 0;
        const contractorId = s.driver_id || 'unknown';

        if (!comparisonMap[contractorId]) {
          comparisonMap[contractorId] = {
            id: contractorId,
            grossEarnings: gross,
            fuelDeduction: fuel,
            netPayout: s.driver_net_pay || 0
          };
        } else {
          comparisonMap[contractorId].grossEarnings += gross;
          comparisonMap[contractorId].fuelDeduction += fuel;
          comparisonMap[contractorId].netPayout += s.driver_net_pay || 0;
        }
      });

      const comparison = Object.values(comparisonMap).slice(0, 15);
      setComparisonData(comparison);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="space-y-5">{[1, 2, 3].map(i => <div key={i} className="skeleton h-64 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white font-heading font-bold text-2xl flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-orange-400" />
          HR Analytics
        </h2>
        <p className="text-slate-400 text-sm mt-1">Contractor payouts, settlements, and financial metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="text-slate-500 text-xs font-semibold uppercase mb-2">Avg Payout</div>
          <div className="text-white font-heading font-bold text-2xl">${metrics.avgPayout.toLocaleString()}</div>
          <div className="text-slate-600 text-xs mt-2">Per settlement</div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="text-slate-500 text-xs font-semibold uppercase mb-2">Total Settlements</div>
          <div className="text-white font-heading font-bold text-2xl">{metrics.totalSettlements}</div>
          <div className="text-slate-600 text-xs mt-2">Completed settlements</div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="text-slate-500 text-xs font-semibold uppercase mb-2">Active Contractors</div>
          <div className="text-white font-heading font-bold text-2xl">{metrics.totalContractors}</div>
          <div className="text-slate-600 text-xs mt-2">In system</div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="text-slate-500 text-xs font-semibold uppercase mb-2">Total Fuel Advances</div>
          <div className="text-white font-heading font-bold text-2xl">${metrics.fuelDeductionTotal.toLocaleString()}</div>
          <div className="text-slate-600 text-xs mt-2">All settlements</div>
        </div>
      </div>

      {/* Weekly Settlements Chart */}
      <div className="glass-card rounded-xl border border-white/5 p-5">
        <h3 className="text-white font-semibold text-lg mb-4">Weekly Settlement Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="week"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fontSize: 12 }}
              tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              tick={{ fontSize: 12 }}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ background: 'rgba(15,24,41,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => `$${value.toLocaleString()}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalSettlements"
              name="Total Settled"
              stroke="#EA580C"
              strokeWidth={2}
              dot={{ fill: '#EA580C', r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="avgAmount"
              name="Avg Per Settlement"
              stroke="#22C55E"
              strokeWidth={2}
              dot={{ fill: '#22C55E', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Fuel vs Earnings Comparison */}
      <div className="glass-card rounded-xl border border-white/5 p-5">
        <h3 className="text-white font-semibold text-lg mb-4">Fuel Deductions vs Gross Earnings</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              type="number"
              dataKey="grossEarnings"
              name="Gross Earnings"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fontSize: 12 }}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="number"
              dataKey="fuelDeduction"
              name="Fuel Deduction"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fontSize: 12 }}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ background: 'rgba(15,24,41,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
              cursor={{ fill: 'rgba(234,88,12,0.1)' }}
              formatter={(value) => `$${value.toLocaleString()}`}
            />
            <Scatter
              name="Contractors"
              data={comparisonData}
              fill="#EA580C"
              fillOpacity={0.6}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-slate-400 text-xs mt-4">
          Shows the relationship between gross earnings and fuel deductions for the top 15 contractors.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="text-slate-500 text-xs font-semibold uppercase mb-3">Avg Fuel %</div>
          <div className="text-white font-heading font-bold text-xl">
            {metrics.totalSettlements > 0
              ? Math.round((metrics.fuelDeductionTotal / (settlements.reduce((sum, s) => sum + (s.gross_load_amount || 0), 0))) * 100)
              : 0}%
          </div>
          <p className="text-slate-600 text-xs mt-2">Of gross earnings</p>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="text-slate-500 text-xs font-semibold uppercase mb-3">Largest Payout</div>
          <div className="text-green-400 font-heading font-bold text-xl">
            ${settlements.length > 0 ? Math.max(...settlements.map(s => s.driver_net_pay || 0)).toLocaleString() : 0}
          </div>
          <p className="text-slate-600 text-xs mt-2">Single settlement</p>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5">
          <div className="text-slate-500 text-xs font-semibold uppercase mb-3">Smallest Payout</div>
          <div className="text-slate-400 font-heading font-bold text-xl">
            ${settlements.length > 0 ? Math.min(...settlements.map(s => s.driver_net_pay || 0)).toLocaleString() : 0}
          </div>
          <p className="text-slate-600 text-xs mt-2">Single settlement</p>
        </div>
      </div>
    </div>
  );
}