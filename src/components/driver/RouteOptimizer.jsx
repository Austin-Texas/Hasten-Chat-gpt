import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Route, Zap, Clock, Fuel, MapPin, ChevronDown, ChevronUp, RefreshCw, AlertTriangle } from "lucide-react";

export default function RouteOptimizer({ load }) {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");

  const calculate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a logistics route optimizer for a freight trucking company. Calculate the most efficient route for a Class 8 semi-truck.

Load Details:
- Origin: ${load.origin_address || ""} ${load.origin_city}, ${load.origin_state} ${load.origin_zip || ""}
- Destination: ${load.destination_address || ""} ${load.destination_city}, ${load.destination_state} ${load.destination_zip || ""}
- Total Miles: ${load.miles || "unknown"}
- Equipment: ${load.equipment_type || "Dry Van"}
- Weight: ${load.weight ? load.weight + " lbs" : "unknown"}
- Pickup: ${load.pickup_date ? new Date(load.pickup_date).toLocaleString() : "ASAP"}
- Delivery: ${load.delivery_date ? new Date(load.delivery_date).toLocaleString() : ""}
- Special Instructions: ${load.special_instructions || "none"}

Provide the optimal route with:
1. Recommended interstate/highway route (major roads only)
2. 2-4 recommended fuel stops (truck stops, loves, pilot, ta) with approximate mile markers
3. Recommended rest stops for HOS compliance (every ~4.5 hrs driving)
4. Estimated drive time (at 60mph average for trucks)
5. Estimated fuel cost (at 6.5 mpg, $4.00/gallon diesel)
6. Key alerts (construction zones, weight restrictions, mountain passes, low clearances if relevant)
7. A brief efficiency tip for this specific lane

Return compact, actionable information a driver can use on the road.`,
        response_json_schema: {
          type: "object",
          properties: {
            route_summary: { type: "string" },
            major_highways: { type: "array", items: { type: "string" } },
            estimated_drive_hours: { type: "number" },
            estimated_miles: { type: "number" },
            estimated_fuel_gallons: { type: "number" },
            estimated_fuel_cost: { type: "number" },
            fuel_stops: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  location: { type: "string" },
                  approx_mile: { type: "number" },
                  note: { type: "string" }
                }
              }
            },
            rest_stops: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  location: { type: "string" },
                  approx_mile: { type: "number" },
                  reason: { type: "string" }
                }
              }
            },
            alerts: { type: "array", items: { type: "string" } },
            efficiency_tip: { type: "string" }
          }
        }
      });
      setRoute(result);
      setExpanded(true);
    } catch (err) {
      setError("Could not calculate route. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "rgba(15,24,41,0.8)" }}>
      {/* Header */}
      <button
        onClick={() => route ? setExpanded(!expanded) : calculate()}
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
            <Route className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-white text-sm font-semibold">Route Optimizer</span>
          {route && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400">
              Ready
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!route && !loading && (
            <span className="text-blue-400 text-xs font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" /> Calculate
            </span>
          )}
          {loading && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
          {route && (expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />)}
        </div>
      </button>

      {error && (
        <div className="px-4 pb-3 flex items-center gap-2 text-red-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Route Content */}
      {route && expanded && (
        <div className="border-t border-white/5 px-4 py-3 space-y-4 animate-slide-up">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-white/5 p-2.5 text-center">
              <Clock className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <div className="text-white font-bold text-sm">{route.estimated_drive_hours?.toFixed(1)}h</div>
              <div className="text-slate-500 text-xs">Drive Time</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2.5 text-center">
              <MapPin className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-white font-bold text-sm">{route.estimated_miles?.toLocaleString()}</div>
              <div className="text-slate-500 text-xs">Est. Miles</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2.5 text-center">
              <Fuel className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-white font-bold text-sm">${route.estimated_fuel_cost?.toFixed(0)}</div>
              <div className="text-slate-500 text-xs">Fuel Cost</div>
            </div>
          </div>

          {/* Route summary */}
          {route.route_summary && (
            <p className="text-slate-300 text-xs leading-relaxed">{route.route_summary}</p>
          )}

          {/* Highways */}
          {route.major_highways?.length > 0 && (
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1.5">Route</div>
              <div className="flex flex-wrap gap-1.5">
                {route.major_highways.map((hw, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-mono">{hw}</span>
                ))}
              </div>
            </div>
          )}

          {/* Fuel Stops */}
          {route.fuel_stops?.length > 0 && (
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Fuel className="w-3 h-3" /> Fuel Stops
              </div>
              <div className="space-y-1.5">
                {route.fuel_stops.map((stop, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-amber-400 text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-semibold">{stop.name}</div>
                      <div className="text-slate-400 text-xs">{stop.location}</div>
                      {stop.approx_mile > 0 && <div className="text-amber-400/70 text-xs">~mile {stop.approx_mile}</div>}
                      {stop.note && <div className="text-slate-500 text-xs italic mt-0.5">{stop.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rest Stops */}
          {route.rest_stops?.length > 0 && (
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> HOS Rest Stops
              </div>
              <div className="space-y-1.5">
                {route.rest_stops.map((stop, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-400 text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-semibold">{stop.location}</div>
                      {stop.approx_mile > 0 && <div className="text-blue-400/70 text-xs">~mile {stop.approx_mile}</div>}
                      {stop.reason && <div className="text-slate-500 text-xs italic mt-0.5">{stop.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts */}
          {route.alerts?.length > 0 && (
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-400" /> Alerts
              </div>
              <div className="space-y-1">
                {route.alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-300">
                    <span className="text-red-500 mt-0.5">•</span> {alert}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Efficiency tip */}
          {route.efficiency_tip && (
            <div className="p-2.5 rounded-lg bg-green-500/5 border border-green-500/15">
              <div className="text-green-400 text-xs font-semibold mb-0.5 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Efficiency Tip
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{route.efficiency_tip}</p>
            </div>
          )}

          {/* Recalculate */}
          <button
            onClick={calculate}
            disabled={loading}
            className="w-full py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors text-xs flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Recalculate Route
          </button>
        </div>
      )}
    </div>
  );
}