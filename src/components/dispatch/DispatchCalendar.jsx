import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle } from "lucide-react";
import { STATE_TO_CORRIDOR } from "@/components/dispatch/RegionGroupView";
import { logDispatcherEvent } from "@/lib/dispatcherWorkflow";

const CORRIDOR_COLORS = {
  "I-95 East Coast": "bg-blue-500/20 border-blue-500/30 text-blue-300",
  "I-10 Southern": "bg-orange-500/20 border-orange-500/30 text-orange-300",
  "I-40 Central": "bg-purple-500/20 border-purple-500/30 text-purple-300",
  "I-80 Northern": "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
  "I-35 Central": "bg-green-500/20 border-green-500/30 text-green-300",
  "I-5 West Coast": "bg-teal-500/20 border-teal-500/30 text-teal-300",
  Other: "bg-slate-500/20 border-slate-500/30 text-slate-300",
};

const BOTTLENECK_THRESHOLD = 3;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CALENDAR_STATUSES = ["available", "assigned", "accepted", "en_route", "arrived_pickup", "loaded", "in_transit", "arrived_delivery", "delivered", "pod_uploaded", "completed"];

function safeDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoDay(value) {
  const parsed = safeDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : null;
}

function getCorridor(state) {
  return STATE_TO_CORRIDOR?.[String(state || "").toUpperCase()] || STATE_TO_CORRIDOR?.[state] || "Other";
}

function getDaysInMonth(date) {
  const safe = safeDate(date) || new Date();
  return new Date(safe.getFullYear(), safe.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date) {
  const safe = safeDate(date) || new Date();
  return new Date(safe.getFullYear(), safe.getMonth(), 1).getDay();
}

function pickupDate(load) {
  return load?.pickup_date || load?.pickup_datetime_start || load?.pickup_datetime || load?.pickup_at;
}

function deliveryDate(load) {
  return load?.delivery_date || load?.delivery_datetime_end || load?.delivery_datetime || load?.delivery_at || pickupDate(load);
}

function overlaps(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  return startA < endB && endA > startB;
}

function driverName(driver = {}) {
  return driver.full_name || driver.name || [driver.first_name, driver.last_name].filter(Boolean).join(" ") || "Driver";
}

function statusLabel(status = "") {
  return String(status).replace(/_/g, " ");
}

export default function DispatchCalendar({ loads = [], drivers = [], trucks = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [selectedTruckId, setSelectedTruckId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);

  const safeLoads = useMemo(() => Array.isArray(loads) ? loads.filter(Boolean) : [], [loads]);
  const safeDrivers = useMemo(() => Array.isArray(drivers) ? drivers.filter(Boolean) : [], [drivers]);
  const safeTrucks = useMemo(() => Array.isArray(trucks) ? trucks.filter(Boolean) : [], [trucks]);

  const filteredLoads = useMemo(() => safeLoads.filter((load) => {
    if (["cancelled"].includes(load.status)) return false;
    if (selectedDriverId && load.driver_id !== selectedDriverId) return false;
    if (selectedTruckId && load.truck_id !== selectedTruckId) return false;
    if (selectedStatus && load.status !== selectedStatus) return false;
    return true;
  }), [safeLoads, selectedDriverId, selectedTruckId, selectedStatus]);

  const conflicts = useMemo(() => {
    const seen = new Set();
    const results = [];

    safeLoads.forEach((load) => {
      const start = safeDate(pickupDate(load));
      const end = safeDate(deliveryDate(load));
      if (!start || !end || load.status === "cancelled") return;

      safeLoads.forEach((other) => {
        if (!other || other.id === load.id || other.status === "cancelled") return;
        const otherStart = safeDate(pickupDate(other));
        const otherEnd = safeDate(deliveryDate(other));
        if (!overlaps(start, end, otherStart, otherEnd)) return;

        if (load.driver_id && other.driver_id && load.driver_id === other.driver_id) {
          const key = ["driver", load.id, other.id].sort().join("|");
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              type: "driver_double_booked",
              loadId: load.id,
              otherLoadId: other.id,
              driverId: load.driver_id,
              message: `Driver double-booked: ${load.load_number || load.id} overlaps with ${other.load_number || other.id}`,
            });
          }
        }

        if (load.truck_id && other.truck_id && load.truck_id === other.truck_id) {
          const key = ["truck", load.id, other.id].sort().join("|");
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              type: "truck_double_booked",
              loadId: load.id,
              otherLoadId: other.id,
              truckId: load.truck_id,
              message: `Truck double-booked: ${load.load_number || load.id} overlaps with ${other.load_number || other.id}`,
            });
          }
        }
      });
    });

    return results;
  }, [safeLoads]);

  const getLoadsForDate = (date) => {
    const target = isoDay(date);
    if (!target) return [];

    return filteredLoads.filter((load) => {
      const pickupKey = isoDay(pickupDate(load));
      const deliveryKey = isoDay(deliveryDate(load));
      if (!pickupKey && !deliveryKey) return false;
      return pickupKey === target || deliveryKey === target;
    });
  };

  const getRegionGroups = (dayLoads) => {
    const groups = {};
    (Array.isArray(dayLoads) ? dayLoads : []).forEach((load) => {
      const corridor = getCorridor(load.destination_state || load.origin_state);
      if (!groups[corridor]) groups[corridor] = [];
      groups[corridor].push(load);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  };

  const bottleneckDates = useMemo(() => {
    try {
      const results = [];
      const daysInMonth = getDaysInMonth(currentDate);

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayLoads = getLoadsForDate(date);
        const regionGroups = getRegionGroups(dayLoads);
        regionGroups.forEach(([corridor, corridorLoads]) => {
          if (corridorLoads.length >= BOTTLENECK_THRESHOLD) results.push({ day, corridor, count: corridorLoads.length });
        });
      }

      return results;
    } catch (error) {
      console.error("Dispatch calendar bottleneck calculation failed", error);
      logDispatcherEvent?.("DISPATCH_CALENDAR_RENDER_FAILED", {
        entity_type: "DispatchCalendar",
        title: "Dispatch calendar failed to calculate bottlenecks",
        description: error.message,
        loads_count: safeLoads.length,
      }).catch(() => {});
      return [];
    }
  }, [currentDate, filteredLoads, safeLoads.length]);

  const filteredConflicts = useMemo(() => conflicts.filter((conflict) => {
    if (selectedDriverId && conflict.type !== "driver_double_booked") return false;
    if (selectedTruckId && conflict.type !== "truck_double_booked") return false;
    return true;
  }), [conflicts, selectedDriverId, selectedTruckId]);

  const renderMonth = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-white/1 border border-white/5 rounded-lg min-h-24" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const loadsForDay = getLoadsForDate(date);
      const isToday = new Date().toDateString() === date.toDateString();
      const regionGroups = getRegionGroups(loadsForDay);
      const hasBottleneck = bottleneckDates.some((item) => item.day === day);

      days.push(
        <div
          key={day}
          className={`border rounded-lg p-2 text-xs min-h-24 overflow-y-auto ${
            isToday ? "border-orange-500/40 bg-orange-500/5" :
            hasBottleneck ? "border-red-500/40 bg-red-500/5" :
            "border-white/10 bg-white/2"
          }`}
        >
          <div className={`font-bold mb-1 flex items-center justify-between ${isToday ? "text-orange-400" : hasBottleneck ? "text-red-400" : "text-slate-300"}`}>
            <span>{day}</span>
            {loadsForDay.length > 0 && <span className={`text-[9px] px-1 rounded-full ${hasBottleneck ? "bg-red-500/20 text-red-400" : "bg-white/10 text-slate-500"}`}>{loadsForDay.length}</span>}
          </div>

          <div className="space-y-1">
            {regionGroups.map(([corridor, corridorLoads]) => (
              <div key={corridor} className={`rounded p-1 border ${CORRIDOR_COLORS[corridor] || CORRIDOR_COLORS.Other} ${corridorLoads.length >= BOTTLENECK_THRESHOLD ? "ring-1 ring-red-500/40" : ""}`} title={`${corridor}: ${corridorLoads.length} load${corridorLoads.length !== 1 ? "s" : ""}`}>
                <div className="text-[9px] font-bold uppercase tracking-wide opacity-80 truncate">{corridor.replace(/^I-\d+\s/, "")}</div>
                <div className="text-[10px] font-medium flex items-center gap-0.5 flex-wrap">
                  {corridorLoads.slice(0, 3).map((load, index) => (
                    <span key={load.id || index}>
                      <a href={`/loads/${load.id}`} className="hover:underline">{load.load_number || `#${String(load.id || "").slice(-4)}`}</a>
                      {index < Math.min(corridorLoads.length, 3) - 1 && <span className="opacity-40">, </span>}
                    </span>
                  ))}
                  {corridorLoads.length > 3 && <span className="opacity-60">+{corridorLoads.length - 3}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-400" />
          <h2 className="text-white font-heading font-bold text-xl">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors">Today</button>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {safeDrivers.length > 0 && (
          <select value={selectedDriverId || ""} onChange={(event) => setSelectedDriverId(event.target.value || null)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-orange-500/40">
            <option value="">All Drivers</option>
            {safeDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driverName(driver)}</option>)}
          </select>
        )}

        {safeTrucks.length > 0 && (
          <select value={selectedTruckId || ""} onChange={(event) => setSelectedTruckId(event.target.value || null)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-orange-500/40">
            <option value="">All Trucks</option>
            {safeTrucks.map((truck) => <option key={truck.id} value={truck.id}>{truck.unit_number || truck.name || truck.id}</option>)}
          </select>
        )}

        <select value={selectedStatus || ""} onChange={(event) => setSelectedStatus(event.target.value || null)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-orange-500/40">
          <option value="">All Statuses</option>
          {CALENDAR_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </select>
      </div>

      {filteredConflicts.length > 0 && (
        <div className="glass-card rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-semibold"><AlertTriangle className="w-5 h-5" />{filteredConflicts.length} scheduling conflict{filteredConflicts.length !== 1 ? "s" : ""} detected</div>
          <div className="space-y-1 text-sm text-red-300">{filteredConflicts.map((conflict, index) => <div key={`${conflict.type}-${index}`}>• {conflict.message}</div>)}</div>
        </div>
      )}

      <div className="glass-card rounded-xl border border-white/5 p-5">
        <div className="grid grid-cols-7 gap-1 mb-3">{DAYS.map((day) => <div key={day} className="text-center text-slate-400 text-xs font-semibold py-2">{day}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">{renderMonth()}</div>
      </div>

      {bottleneckDates.length > 0 && (
        <div className="glass-card rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-semibold"><AlertTriangle className="w-5 h-5" />{bottleneckDates.length} delivery bottleneck{bottleneckDates.length !== 1 ? "s" : ""} detected</div>
          <div className="flex flex-wrap gap-2">
            {bottleneckDates.map((bottleneck, index) => (
              <div key={`${bottleneck.corridor}-${index}`} className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-red-300 font-medium">{MONTHS[currentDate.getMonth()].slice(0, 3)} {bottleneck.day}</span>
                <span className="text-red-500/60">•</span>
                <span className="text-red-400">{bottleneck.corridor}</span>
                <span className="text-red-500/60">•</span>
                <span className="text-red-300 font-bold">{bottleneck.count} loads</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 text-xs text-slate-400 flex-wrap">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded border-2 border-orange-500/40 bg-orange-500/5" /><span>Today</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded border-2 border-red-500/40 bg-red-500/5" /><span>Bottleneck (3+ loads same region)</span></div>
        {Object.entries(CORRIDOR_COLORS).slice(0, 6).map(([corridor, cls]) => <div key={corridor} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded ${cls}`} /><span>{corridor.replace(/^I-\d+\s/, "")}</span></div>)}
      </div>
    </div>
  );
}
