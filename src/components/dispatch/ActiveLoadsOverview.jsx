import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, MapPin, Clock, ChevronRight, Loader2, TrendingUp } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import { Link } from "react-router-dom";

export default function ActiveLoadsOverview() {
  const [loads, setLoads] = useState([]);
  const [loadStops, setLoadStops] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch active loads (not completed or cancelled)
      const activeStatuses = [
        "available",
        "assigned",
        "accepted",
        "en_route",
        "arrived_pickup",
        "loaded",
        "in_transit",
        "arrived_delivery",
        "delivered",
        "pod_uploaded",
      ];
      const allLoads = [];
      for (const status of activeStatuses) {
        const loadsData = await base44.entities.Load.filter({ status }, "-created_date", 50).catch(() => []);
        allLoads.push(...loadsData);
      }
      setLoads(allLoads);

      // Fetch all stops for these loads
      const stopsMap = {};
      await Promise.all(
        allLoads.map(async (load) => {
          const stops = await base44.entities.LoadStop.filter({ load_id: load.id }, "stop_number", 20).catch(() => []);
          stopsMap[load.id] = stops;
        })
      );
      setLoadStops(stopsMap);
    } catch (err) {
      console.error("Error fetching active loads:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get next upcoming stop for a load
  const getNextStop = (load) => {
    const stops = loadStops[load.id] || [];
    if (stops.length === 0) return null;

    // Find first non-completed stop
    const nextStop = stops.find((s) => s.status !== "completed" && s.status !== "skipped");
    return nextStop || stops[stops.length - 1];
  };

  // Check if stop is overdue
  const isStopOverdue = (stop) => {
    if (!stop.appointment_end) return false;
    const endTime = new Date(stop.appointment_end);
    return endTime < new Date();
  };

  // Check if stop is coming up soon (within 1 hour)
  const isStopUpcoming = (stop) => {
    if (!stop.appointment_start) return false;
    const startTime = new Date(stop.appointment_start);
    const now = new Date();
    const oneHourAway = new Date(now.getTime() + 60 * 60 * 1000);
    return startTime > now && startTime <= oneHourAway;
  };

  const overdueCount = loads.filter((load) => {
    const nextStop = getNextStop(load);
    return nextStop && isStopOverdue(nextStop);
  }).length;

  const upcomingCount = loads.filter((load) => {
    const nextStop = getNextStop(load);
    return nextStop && isStopUpcoming(nextStop);
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-lg p-3 border border-white/5">
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Active Loads</div>
          <div className="text-white font-bold text-2xl">{loads.length}</div>
        </div>
        <div className={`glass-card rounded-lg p-3 border ${overdueCount > 0 ? "border-red-500/30 bg-red-500/5" : "border-white/5"}`}>
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Overdue Stops
          </div>
          <div className={`font-bold text-2xl ${overdueCount > 0 ? "text-red-400" : "text-green-400"}`}>{overdueCount}</div>
        </div>
        <div className={`glass-card rounded-lg p-3 border ${upcomingCount > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-white/5"}`}>
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Upcoming (1h)
          </div>
          <div className={`font-bold text-2xl ${upcomingCount > 0 ? "text-amber-400" : "text-slate-400"}`}>{upcomingCount}</div>
        </div>
      </div>

      {/* Active Loads with Next Stop */}
      <div className="space-y-2">
        <h3 className="text-white font-semibold text-sm">Active Loads & Next Stop</h3>

        {loads.length === 0 ? (
          <div className="glass-card rounded-lg p-8 border border-white/5 text-center">
            <TrendingUp className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No active loads</p>
          </div>
        ) : (
          <div className="glass-card rounded-lg border border-white/5 divide-y divide-white/5 max-h-96 overflow-y-auto">
            {loads.map((load) => {
              const nextStop = getNextStop(load);
              const overdue = nextStop && isStopOverdue(nextStop);
              const upcoming = nextStop && isStopUpcoming(nextStop);

              return (
                <Link
                  key={load.id}
                  to={`/loads/${load.id}`}
                  className="p-4 hover:bg-white/3 transition-colors flex items-start justify-between gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="font-semibold text-white text-sm group-hover:text-orange-400 transition-colors">
                        {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
                      </div>
                      <StatusBadge status={load.status} />
                    </div>

                    {nextStop ? (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1 ${
                            nextStop.stop_type === "pickup" ? "bg-blue-400" : "bg-green-400"
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-slate-300 text-xs">
                              <span className="font-medium">Stop {nextStop.stop_number}</span>
                              {" · "}
                              <span className="capitalize">{nextStop.stop_type}</span>
                            </p>
                            <p className="text-slate-400 text-xs truncate">
                              {nextStop.facility_name || `${nextStop.city}, ${nextStop.state}`}
                            </p>
                          </div>
                        </div>

                        {nextStop.appointment_start && (
                          <div className="flex items-center gap-1.5 text-xs ml-3">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span className={`${overdue ? "text-red-400 font-semibold" : upcoming ? "text-amber-400" : "text-slate-400"}`}>
                              {new Date(nextStop.appointment_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {overdue && " — OVERDUE"}
                              {upcoming && !overdue && " — SOON"}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs">No stops assigned</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {overdue && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400 text-xs font-semibold">Overdue</span>
                      </div>
                    )}
                    {upcoming && !overdue && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-400 text-xs font-semibold">Upcoming</span>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}