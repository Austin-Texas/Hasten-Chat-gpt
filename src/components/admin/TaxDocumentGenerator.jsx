import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, Loader2, DollarSign } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * TaxDocumentGenerator — adapted from Hastenload-main secondary project.
 * Generates 1099-NEC / W2 / settlement summary / payroll summary tax documents.
 * Maps to HASTEN primary entities: Settlement, PayrollRecord, Driver, TaxDocument.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {Array} drivers - Driver entity list
 */
export default function TaxDocumentGenerator({ isOpen, onClose, drivers }) {
  const [documentType, setDocumentType] = useState("1099_nec");
  const [employmentType, setEmploymentType] = useState("owner_operator_1099");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [taxYear, setTaxYear] = useState(new Date().getFullYear().toString());
  const [generating, setGenerating] = useState(false);
  const [driverStats, setDriverStats] = useState(null);

  // Fetch driver financial summary when driver/year changes
  const fetchDriverStats = async (driverId, year) => {
    if (!driverId || !year) return;
    try {
      const settlements = await base44.entities.Settlement.filter({
        driver_id: driverId,
      }, "-created_date", 500);

      const yearSettlements = settlements.filter(
        (s) => s.created_date && new Date(s.created_date).getFullYear() === parseInt(year)
      );

      const gross = yearSettlements.reduce((sum, s) => sum + (s.gross_load_amount || 0), 0);
      const net = yearSettlements.reduce((sum, s) => sum + (s.driver_net_pay || 0), 0);
      const deductions = yearSettlements.reduce((sum, s) => sum + (s.total_deductions || 0), 0);
      const advances = yearSettlements.reduce((sum, s) => sum + (s.fuel_advance || 0), 0);

      setDriverStats({
        gross,
        net,
        deductions,
        advances,
        count: yearSettlements.length,
      });
    } catch (err) {
      console.error("Failed to fetch driver stats:", err);
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

      // Create TaxDocument record
      const taxDoc = await base44.entities.TaxDocument.create({
        driver_id: selectedDriverId,
        user_id: driver.user_id || "",
        driver_name: `${driver.first_name} ${driver.last_name}`,
        tax_year: parseInt(taxYear),
        document_type: documentType,
        employment_type: employmentType,
        status: "generated",
        gross_amount: driverStats?.gross || 0,
        taxable_amount: driverStats?.net || 0,
        deductions_amount: driverStats?.deductions || 0,
        advances_amount: driverStats?.advances || 0,
        reimbursements_amount: 0,
        generated_by: user.id,
        notes: `Generated for tax year ${taxYear}`,
      });

      // Create timeline event
      await base44.entities.TimelineEvent.create({
        entity_type: "TaxDocument",
        entity_id: taxDoc.id,
        event_type: "tax_document_generated",
        description: `${documentType.toUpperCase()} generated for ${driver.first_name} ${driver.last_name} — Tax Year ${taxYear}`,
        metadata: JSON.stringify({
          driver_id: selectedDriverId,
          tax_year: taxYear,
          gross: driverStats?.gross || 0,
          net: driverStats?.net || 0,
        }),
      });

      onClose();
    } catch (error) {
      alert("Failed to generate document: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (val) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-400" />
            Generate Tax Document
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Create 1099-NEC, W2, or summary documents for drivers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Document Type</label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1099_nec">1099-NEC (Independent Contractor)</SelectItem>
                <SelectItem value="w2">W2 (Employee)</SelectItem>
                <SelectItem value="settlement_summary">Settlement Summary</SelectItem>
                <SelectItem value="payroll_summary">Payroll Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employment Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Employment Type</label>
            <Select value={employmentType} onValueChange={setEmploymentType}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner_operator_1099">Owner-Operator (1099)</SelectItem>
                <SelectItem value="employee_w2">Employee (W2)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Driver Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Driver</label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.first_name} {driver.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tax Year */}
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

          {/* Summary Card */}
          {driverStats && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Gross Earnings:</span>
                  <span className="font-semibold text-white">{formatCurrency(driverStats.gross)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Net Pay:</span>
                  <span className="font-semibold text-green-400">{formatCurrency(driverStats.net)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Deductions:</span>
                  <span className="font-semibold text-red-400">{formatCurrency(driverStats.deductions)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Fuel Advances:</span>
                  <span className="font-semibold text-amber-400">{formatCurrency(driverStats.advances)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-white/10 pt-2 mt-2">
                  <span className="text-slate-400">Settlements:</span>
                  <span className="font-semibold text-white">{driverStats.count}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
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
              {generating ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              {generating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}