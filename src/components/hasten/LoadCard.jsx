import { MapPin, Clock, DollarSign, Truck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

export default function LoadCard({ load, linkPrefix = "/loads" }) {
  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const WORKFLOW = ["assigned", "accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery", "delivered", "pod_uploaded", "completed"];
  const currentIdx = WORKFLOW.indexOf(load.status);
  const progress = currentIdx >= 0 ? ((currentIdx + 1) / WORKFLOW.length) * 100 : 0;

  return (
    <Link to={`${linkPrefix}/${load.id}`} className="block">
      <div className="glass-card rounded-xl p-4 hover:border-orange-500/20 transition-all duration-200 cursor-pointer group">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-orange-400 font-mono text-sm font-bold">{load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}</span>
              <StatusBadge status={load.status} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-slate-300 text-sm">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>{load.origin_city}, {load.origin_state}</span>
              <ArrowRight className="w-3 h-3 text-slate-600" />
              <span>{load.destination_city}, {load.destination_state}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-green-400 font-bold text-sm">${(load.rate || 0).toLocaleString()}</div>
            <div className="text-slate-500 text-xs">{load.miles ? `${load.miles} mi` : ""}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs text-slate-400 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDate(load.pickup_date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Truck className="w-3 h-3" />
            <span>{load.equipment_type || "—"}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span>{load.weight ? `${load.weight.toLocaleString()} lbs` : "—"}</span>
          </div>
        </div>

        {load.status !== "available" && currentIdx >= 0 && (
          <div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>Pickup</span>
              <span>In Transit</span>
              <span>Delivered</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}