import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  buildTaxDocumentFrom1099Calculation,
  calculate1099NECTrips,
  FEDERAL_WITHHOLDING_BOX_4,
  TAX_1099_DOCUMENT_TYPE,
  TAX_1099_EMPLOYMENT_TYPE,
} from "@/lib/tax1099";

export default function TaxDocumentGenerator({ isOpen, onClose, drivers }) {
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [taxYear, setTaxYear] = useState(new Date().getFullYear().toString());
  const [generating, setGenerating] = useState(false);
  const [driverStats, setDriverStats] = useState(null);

  const fetchDriverStats = async (driverId, year) => {
    if (!driverId || !year) return;
    try {
      const [loads, settlements] = await Promise.all([
        base44.entities.Load.filter({ driver_id: driverId }, "-created_date", 1000).catch(() => []),
        base44.entities.Settlement.filter({ driver_id: driverId }, "-created_date", 1000).catch(() => []),
      ]);
      const completedTrips = [...loads, ...settlements];
      const calculation = calculate1099NECTrips(completedTrips, year);
      setDriverStats(calculation);
    } catch (err) {
      console.error("Failed to fetch 1099 stats:", err);
      setDriverStats(null);
    }
  };

  React.useEffect(() => {
    if (selectedDriverId && taxYear && isOpen) {
      fetchDriverStats(selectedDriverId, taxYear);
    } else {
      setDriverStats(null);
    }
  }, [selectedDriverId, taxYear, isOpen]);

  const handleGenerate = async () => {
    if (!selectedDriverId || !taxYear) {
      alert("Please select a driver and tax year");
      return;
    }

    setGenerating(true);
    try {
      const driver = drivers.find((d) => d.id === selectedDriverId);
      if (!driver) throw new Error("Driver not found");

      const user = await base44.auth.me();
      const calculation = driverStats || calculate1099NECTrips([], taxYear);
      const taxDocPayload = buildTaxDocumentFrom1099Calculation({
        driver,
        driverId: selectedDriverId,
        userId: driver.user_id,
        taxYear,
        calculation,
        generatedBy: user.id,
      });

      const taxDoc = await base44.entities.TaxDocument.create(taxDocPayload);

      await base44.entities.TimelineEvent.create({
        entity_type: "TaxDocument",
        entity_id: taxDoc.id,
        event_type: "tax_document_generated",
        description: `1099-NEC generated for ${taxDocPayload.driver_name} — Tax Year ${taxYear}. Box 1: $${calculation.grand_total_gross_box_1.toLocaleString()}; Box 4: $0.00`,
        metadata: JSON.stringify({
          driver_id: selectedDriverId,
          tax_year: taxYear,
          box_1_nonemployee_compensation: calculation.box_1_nonemployee_compensation,
          box_4_federal_income_tax_withheld: FEDERAL_WITHHOLDING_BOX_4,
          trip_count: calculation.trip_breakdown.length,
        }),
      });

      onClose();
    } catch (error) {
      alert("Failed to generate 1099-NEC: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (val) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-400" />
            Generate 1099-NEC Preview
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            HASTEN MVP supports 1099 owner-operator tax reporting only. Box 1 uses gross initial quote plus detention pay; Box 4 is always $0.00.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Document Type</label>
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm font-bold text-green-300">
                1099-NEC only
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Employment Type</label>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                Owner-Operator 1099
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Tax Year</label>
              <Input
                type="number"
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                min="2020"
                max={new Date().getFullYear()}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Driver</label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select a 1099 owner-operator" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.full_name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || driver.name || "Driver"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4 space-y-3">
              <div className="grid gap-2 md:grid-cols-4">
                <SummaryItem label="Total Base Earnings" value={formatCurrency(driverStats?.total_base_earnings)} />
                <SummaryItem label="Total Detention Earned" value={formatCurrency(driverStats?.total_detention_earned)} />
                <SummaryItem label="1099 Box 1 Gross" value={formatCurrency(driverStats?.grand_total_gross_box_1)} accent="green" />
                <SummaryItem label="Box 4 Federal Withheld" value={formatCurrency(FEDERAL_WITHHOLDING_BOX_4)} accent="blue" />
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                No fuel, toll, maintenance, repair, insurance, escrow, or other deductions are subtracted from 1099 gross.
              </div>
            </CardContent>
          </Card>

          {driverStats?.trip_breakdown?.length > 0 && (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="border-b border-white/10 px-3 py-2 text-sm font-bold text-white">Trip Breakdown</div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.03] text-slate-500 text-left">
                    <tr>
                      <th className="px-3 py-2">Trip ID</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Route</th>
                      <th className="px-3 py-2 text-right">Initial Quote</th>
                      <th className="px-3 py-2 text-right">Detention Pay</th>
                      <th className="px-3 py-2 text-right">Net Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverStats.trip_breakdown.map((trip) => (
                      <tr key={trip.trip_id} className="border-t border-white/5">
                        <td className="px-3 py-2 text-slate-300">{trip.trip_id}</td>
                        <td className="px-3 py-2 text-slate-500">{trip.date ? new Date(trip.date).toLocaleDateString() : "—"}</td>
                        <td className="px-3 py-2 text-white">{trip.route}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{formatCurrency(trip.initial_quote_price)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{formatCurrency(trip.detention_pay)}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{formatCurrency(trip.net_paid_to_driver)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedDriverId}
              className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold"
            >
              {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
              {generating ? "Generating..." : "Generate 1099-NEC Preview"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryItem({ label, value, accent }) {
  const color = accent === "green" ? "text-green-400" : accent === "blue" ? "text-blue-300" : "text-white";
  return <div className="rounded-lg bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div><div className={`mt-1 text-lg font-black ${color}`}>{value}</div></div>;
}
