import React, { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Calculator, DollarSign, TrendingDown, TrendingUp,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * PayoutCalculationModal — adapted from Hastenload-main secondary project.
 * Calculates and creates a Settlement record using HASTEN primary entities.
 * Maps to: Settlement, SettlementRule, Driver, Load.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {object} driver - Driver entity
 * @param {Array} loads - Completed loads for the driver
 */
export default function PayoutCalculationModal({ isOpen, onClose, driver, loads }) {
  const [fuelAdvancePct, setFuelAdvancePct] = useState(5);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);

  const completedLoads = (loads || []).filter((l) => l.status === "completed" || l.status === "delivered");

  const calculation = React.useMemo(() => {
    const totalTripPay = completedLoads.reduce((sum, l) => sum + (l.rate || 0), 0);
    const totalMiles = completedLoads.reduce((sum, l) => sum + (l.miles || 0), 0);
    const fuelAdvance = totalTripPay * (fuelAdvancePct / 100);
    const driverShare = totalTripPay * 0.8; // 80% default
    const companyShare = totalTripPay * 0.2; // 20% default
    const netPay = driverShare - fuelAdvance;

    return {
      totalTripPay,
      totalMiles,
      tripCount: completedLoads.length,
      driverShare,
      companyShare,
      fuelAdvance,
      fuelAdvancePct,
      netPay,
    };
  }, [completedLoads, fuelAdvancePct]);

  const handleCalculate = async () => {
    if (!driver) return;
    setCalculating(true);
    try {
      const user = await base44.auth.me();

      // Create a Settlement record for each completed load
      for (const load of completedLoads) {
        const loadPay = load.rate || 0;
        const driverGross = loadPay * 0.8;
        const companyFee = loadPay * 0.2;
        const fuelAdvance = loadPay * (fuelAdvancePct / 100);
        const netPay = driverGross - fuelAdvance;

        const settlementNumber = `STL-${load.load_number || load.id.slice(-6)}-${Date.now().toString().slice(-6)}`;

        await base44.entities.Settlement.create({
          load_id: load.id,
          driver_id: driver.id,
          settlement_number: settlementNumber,
          status: "pending_review",
          gross_load_amount: loadPay,
          driver_percentage: 80,
          company_percentage: 20,
          fuel_advance: fuelAdvance,
          driver_gross_share: driverGross,
          company_fee_amount: companyFee,
          total_deductions: fuelAdvance,
          driver_net_pay: netPay,
          hasten_net_revenue: companyFee,
          payout_method: driver.pay_type === "per_mile" ? "direct_deposit" : "manual_ach",
          payout_recipient: `${driver.first_name} ${driver.last_name}`,
          created_by: user.id,
          notes: `Auto-generated payout for ${completedLoads.length} load(s)`,
        });
      }

      // Create timeline event
      await base44.entities.TimelineEvent.create({
        entity_type: "Driver",
        entity_id: driver.id,
        event_type: "payout_calculated",
        description: `Payout calculated for ${completedLoads.length} load(s) — Net: $${calculation.netPay.toFixed(2)}`,
        metadata: JSON.stringify(calculation),
      });

      setResult(calculation);
    } catch (error) {
      console.error("Payout calculation error:", error);
      alert("Failed to calculate payout: " + error.message);
    } finally {
      setCalculating(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  const formatCurrency = (val) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-400" />
            Payout Calculation
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {driver ? `Calculate payout for ${driver.first_name} ${driver.last_name}` : "Select a driver first"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fuel Advance Input */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Fuel Advance Percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={fuelAdvancePct}
                onChange={(e) => setFuelAdvancePct(parseFloat(e.target.value) || 0)}
                min="0"
                max="50"
                step="0.5"
                className="bg-white/5 border-white/10 text-white"
              />
              <span className="text-slate-400 text-sm">%</span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white/5 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Completed Loads:</span>
              <span className="font-semibold text-white">{calculation.tripCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Miles:</span>
              <span className="font-semibold text-white">{calculation.totalMiles.toLocaleString()}</span>
            </div>
            <div className="border-t border-white/10 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Total Trip Pay:
                </span>
                <span className="font-semibold text-white">{formatCurrency(calculation.totalTripPay)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-400" /> Driver Share (80%):
                </span>
                <span className="font-semibold text-green-400">{formatCurrency(calculation.driverShare)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-amber-400" /> Fuel Advance ({fuelAdvancePct}%):
                </span>
                <span className="font-semibold text-amber-400">-{formatCurrency(calculation.fuelAdvance)}</span>
              </div>
            </div>
            <div className="border-t border-white/10 pt-3">
              <div className="flex justify-between">
                <span className="text-white font-bold">Net Payout:</span>
                <span className="text-green-400 font-bold text-lg">{formatCurrency(calculation.netPay)}</span>
              </div>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 animate-slide-up">
              <Calculator className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-400">
                Settlements created for {result.tripCount} load(s). Total net: {formatCurrency(result.netPay)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            >
              {result ? "Close" : "Cancel"}
            </Button>
            {!result && (
              <Button
                onClick={handleCalculate}
                disabled={calculating || calculation.tripCount === 0}
                className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold"
              >
                {calculating ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4 mr-1" />
                )}
                {calculating ? "Calculating..." : "Calculate & Create"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}