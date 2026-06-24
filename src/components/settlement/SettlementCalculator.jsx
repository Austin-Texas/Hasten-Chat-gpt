import { useState } from 'react';
import { DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SettlementCalculator({ load, onCalculate }) {
  const [grossAmount, setGrossAmount] = useState(load?.rate || 5000);
  const [driverPercent, setDriverPercent] = useState(80);
  const [companyPercent, setCompanyPercent] = useState(20);
  const [flatFee, setFlatFee] = useState(0);
  const [factoringPercent, setFactoringPercent] = useState(0);
  const [factoringPaidBy, setFactoringPaidBy] = useState('hasten');
  const [fuelAdvance, setFuelAdvance] = useState(0);
  const [escrowHold, setEscrowHold] = useState(0);
  const [insuranceDeduction, setInsuranceDeduction] = useState(0);
  const [otherDeduction, setOtherDeduction] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleCalculate = async () => {
    if (driverPercent + companyPercent !== 100) {
      setError('Driver % + Company % must equal 100');
      return;
    }

    try {
      const res = await fetch('https://base44.example.com/api/settlementCalculationEngine', {
        method: 'POST',
        body: JSON.stringify({
          load_id: load?.id,
          driver_id: load?.driver_id,
          gross_load_amount: grossAmount,
          driver_percentage: driverPercent,
          company_percentage: companyPercent,
          flat_company_fee: flatFee,
          factoring_fee_percentage: factoringPercent,
          factoring_fee_paid_by: factoringPaidBy,
          fuel_advance: fuelAdvance,
          escrow_hold: escrowHold,
          insurance_deduction: insuranceDeduction,
          other_deduction: otherDeduction,
          bonus
        })
      });

      const data = await res.json();
      if (data.success) {
        setResults(data);
        setError(null);
        onCalculate?.(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Input Grid */}
      <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-orange-400" />
          Settlement Calculator
        </h3>

        {/* Gross Amount */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Gross Load Amount
            </label>
            <input
              type="number"
              value={grossAmount}
              onChange={(e) => setGrossAmount(parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Bonus
            </label>
            <input
              type="number"
              value={bonus}
              onChange={(e) => setBonus(parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>
        </div>

        {/* Percentages */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Driver % ({driverPercent}%)
            </label>
            <input
              type="number"
              value={driverPercent}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setDriverPercent(val);
                setCompanyPercent(100 - val);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Company % ({companyPercent}%)
            </label>
            <input
              type="number"
              value={companyPercent}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCompanyPercent(val);
                setDriverPercent(100 - val);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Flat Company Fee
            </label>
            <input
              type="number"
              value={flatFee}
              onChange={(e) => setFlatFee(parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>
        </div>

        {/* Factoring */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Factoring Fee %
            </label>
            <input
              type="number"
              value={factoringPercent}
              onChange={(e) => setFactoringPercent(parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>

          {factoringPercent > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Factoring Paid By
              </label>
              <select
                value={factoringPaidBy}
                onChange={(e) => setFactoringPaidBy(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              >
                <option value="hasten">HASTEN</option>
                <option value="driver">Driver</option>
                <option value="split">Split</option>
              </select>
            </div>
          )}
        </div>

        {/* Deductions */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Fuel Advance
            </label>
            <input
              type="number"
              value={fuelAdvance}
              onChange={(e) => setFuelAdvance(parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Insurance Deduction
            </label>
            <input
              type="number"
              value={insuranceDeduction}
              onChange={(e) => setInsuranceDeduction(parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Escrow Hold
            </label>
            <input
              type="number"
              value={escrowHold}
              onChange={(e) => setEscrowHold(parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Other Deduction
            </label>
            <input
              type="number"
              value={otherDeduction}
              onChange={(e) => setOtherDeduction(parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        <button
          onClick={handleCalculate}
          className="w-full px-4 py-2.5 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors text-sm"
        >
          Calculate Settlement
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="glass-card rounded-xl p-5 border border-orange-500/20 bg-orange-500/5 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <h3 className="text-white font-semibold">Scenario: {results.scenario}</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Gross Load Amount</span>
              <span className="text-white font-medium">${results.gross_load_amount.toFixed(2)}</span>
            </div>
            {results.factoring_fee_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Factoring Fee</span>
                <span className="text-red-400">-${results.factoring_fee_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Company Fee</span>
              <span className="text-red-400">-${results.company_fee_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Driver Gross Share</span>
              <span className="text-white font-medium">${results.driver_gross_share.toFixed(2)}</span>
            </div>

            {results.fuel_advance > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Fuel Advance</span>
                <span className="text-red-400">-${results.fuel_advance.toFixed(2)}</span>
              </div>
            )}

            {results.bonus > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Bonus</span>
                <span className="text-green-400">+${results.bonus.toFixed(2)}</span>
              </div>
            )}

            <div className="col-span-2 border-t border-white/10 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-white font-semibold">Driver Net Pay</span>
                <span className="text-green-400 font-bold text-lg">${results.driver_net_pay.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-slate-400">HASTEN Net Revenue</span>
                <span className="text-orange-400 font-medium">${results.hasten_net_revenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-slate-400">Payout Recipient</span>
                <span className="text-white">{results.payout_recipient}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}