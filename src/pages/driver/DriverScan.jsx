import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ScanLine, ChevronLeft, Package } from "lucide-react";
import { Link } from "react-router-dom";
import DocumentOCRProcessor from "@/components/driver/DocumentOCRProcessor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DriverScan({ user }) {
  const [loads, setLoads] = useState([]);
  const [selectedLoadId, setSelectedLoadId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch loads assigned to this driver
    base44.entities.Load.filter({}, "-created_date", 50)
      .then((allLoads) => {
        // Filter to loads assigned to this user's driver profile
        const driverLoads = allLoads.filter(
          (l) => l.driver_id === user?.id || l.status === "assigned" || l.status === "en_route" || l.status === "in_transit"
        );
        setLoads(driverLoads);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const selectedLoad = loads.find((l) => l.id === selectedLoadId);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/driver/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-white font-heading font-bold text-xl flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-green-400" />
            Document Scanner
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Upload BOL/POD and auto-extract data with OCR
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        </div>
      ) : loads.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No active loads to scan documents for.</p>
          <Link to="/driver/loads" className="inline-block mt-3 text-green-400 text-sm hover:underline">
            View available loads →
          </Link>
        </div>
      ) : (
        <>
          {/* Load Selection */}
          <div className="space-y-2">
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wide block">
              Select Load
            </label>
            <Select value={selectedLoadId} onValueChange={setSelectedLoadId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Choose a load to scan documents for..." />
              </SelectTrigger>
              <SelectContent>
                {loads.map((load) => (
                  <SelectItem key={load.id} value={load.id}>
                    {load.load_number || `#${load.id.slice(-6)}`} — {load.origin_city} → {load.destination_city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* OCR Processor */}
          {selectedLoad ? (
            <DocumentOCRProcessor load={selectedLoad} />
          ) : (
            <div className="glass-card rounded-xl p-8 text-center">
              <ScanLine className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Select a load above to start scanning documents.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}