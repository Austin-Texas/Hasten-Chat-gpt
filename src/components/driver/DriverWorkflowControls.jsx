import { CheckCircle2, FileUp, MapPin, PackageCheck, Truck, Wrench } from "lucide-react";
import {
  acceptDriverLoad,
  completeDriverDelivery,
  completeDriverPickup,
  markDriverArrivedDelivery,
  markDriverArrivedPickup,
  submitDriverDvir,
  uploadDriverPod,
} from "@/lib/driverWorkflowActions";

function Button({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-black text-green-300 hover:text-white">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

export default function DriverWorkflowControls({ driverId, loadId, onAction }) {
  if (!driverId) return null;
  const currentLoadId = loadId || "demo-load-current";
  const done = () => onAction?.();

  return (
    <div className="glass-card rounded-2xl border border-white/5 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/10 text-green-400">
          <Truck className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-black text-white">Driver Workflow Controls</h2>
          <p className="mt-0.5 text-xs text-slate-500">Local enterprise actions for assignment, pickup, delivery, POD, and DVIR.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button icon={CheckCircle2} label="Accept Assignment" onClick={() => { acceptDriverLoad({ driverId, loadId: currentLoadId }); done(); }} />
        <Button icon={MapPin} label="Arrive Pickup" onClick={() => { markDriverArrivedPickup({ driverId, loadId: currentLoadId }); done(); }} />
        <Button icon={PackageCheck} label="Pickup Complete" onClick={() => { completeDriverPickup({ driverId, loadId: currentLoadId }); done(); }} />
        <Button icon={MapPin} label="Arrive Delivery" onClick={() => { markDriverArrivedDelivery({ driverId, loadId: currentLoadId }); done(); }} />
        <Button icon={PackageCheck} label="Delivery Complete" onClick={() => { completeDriverDelivery({ driverId, loadId: currentLoadId }); done(); }} />
        <Button icon={FileUp} label="Add POD" onClick={() => { uploadDriverPod({ driverId, loadId: currentLoadId, document: { storage_url: "demo://pod", ocr_status: "needs_review" } }); done(); }} />
        <Button icon={Wrench} label="Submit DVIR" onClick={() => { submitDriverDvir({ driverId, truckId: "demo-truck", inspectionType: "pre_trip", defects: [] }); done(); }} />
      </div>
    </div>
  );
}
