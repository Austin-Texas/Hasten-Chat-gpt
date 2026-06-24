import { Truck, CheckCircle } from "lucide-react";

// Maps load lifecycle status → completion percentage
const STATUS_PROGRESS = {
  available: 0,
  assigned: 10,
  accepted: 20,
  en_route: 35,
  arrived_pickup: 45,
  loaded: 50,
  in_transit: 65,
  arrived_delivery: 85,
  delivered: 95,
  pod_uploaded: 100,
  completed: 100,
  cancelled: 0,
};

const STAGE_LABELS = {
  available: "Awaiting assignment",
  assigned: "Driver assigned",
  accepted: "Driver accepted",
  en_route: "Heading to pickup",
  arrived_pickup: "At pickup",
  loaded: "Loaded & departing",
  in_transit: "In transit",
  arrived_delivery: "At delivery",
  delivered: "Delivered",
  pod_uploaded: "POD uploaded",
  completed: "Completed",
  cancelled: "Cancelled",
};

function calcProgress(load) {
  if (load.status === "cancelled") return 0;
  const base = STATUS_PROGRESS[load.status] ?? 0;

  // If we have pickup + delivery timestamps and currently in transit, use time-based progress
  if (load.actual_pickup && (load.status === "in_transit" || load.status === "arrived_delivery")) {
    const start = new Date(load.actual_pickup).getTime();
    const end = load.actual_delivery
      ? new Date(load.actual_delivery).getTime()
      : (load.eta ? new Date(load.eta).getTime() : 0);
    if (end > start) {
      const now = Date.now();
      const pct = Math.min(100, Math.max(base, Math.round(((now - start) / (end - start)) * 100)));
      return pct;
    }
  }
  return base;
}

export default function LoadProgressBar({ load }) {
  const pct = calcProgress(load);
  const isCancelled = load.status === "cancelled";
  const isComplete = pct >= 100;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-500 font-medium">{STAGE_LABELS[load.status] || load.status}</span>
        <span className={`text-[10px] font-bold ${isCancelled ? "text-red-400" : isComplete ? "text-green-400" : "text-orange-400"}`}>
          {isCancelled ? "—" : `${pct}%`}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isCancelled
              ? "bg-red-500/40"
              : isComplete
                ? "bg-green-500"
                : "bg-gradient-to-r from-blue-500 via-orange-500 to-green-500"
          }`}
          style={{ width: `${isCancelled ? 100 : pct}%` }}
        >
          {/* Animated shimmer for in-transit */}
          {pct > 0 && pct < 100 && !isCancelled && (
            <div className="absolute inset-0 opacity-40 animate-pulse" style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
            }} />
          )}
        </div>
        {/* Truck marker at progress position */}
        {pct > 0 && pct < 100 && !isCancelled && (
          <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-500" style={{ left: `calc(${pct}% - 7px)` }}>
            <Truck className="w-3 h-3 text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]" />
          </div>
        )}
        {isComplete && !isCancelled && (
          <CheckCircle className="absolute top-1/2 right-0 -translate-y-1/2 w-2.5 h-2.5 text-green-300" />
        )}
      </div>
    </div>
  );
}