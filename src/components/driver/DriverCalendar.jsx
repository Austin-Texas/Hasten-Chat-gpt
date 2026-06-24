import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function DriverCalendar({ driverId, loads = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("week");
  const [conflicts, setConflicts] = useState([]);

  // Detect double-booking conflicts
  useEffect(() => {
    const detectConflicts = () => {
      const driverLoads = loads.filter(l => l.driver_id === driverId && l.status !== "cancelled");
      const newConflicts = [];

      for (let i = 0; i < driverLoads.length; i++) {
        const load = driverLoads[i];
        if (!load.pickup_date || !load.delivery_date) continue;
        
        for (let j = i + 1; j < driverLoads.length; j++) {
          const otherLoad = driverLoads[j];
          const pickupStart = new Date(load.pickup_date);
          const deliveryEnd = new Date(load.delivery_date);
          const otherPickupStart = new Date(otherLoad.pickup_date);
          const otherDeliveryEnd = new Date(otherLoad.delivery_date);
          
          if (pickupStart < otherDeliveryEnd && deliveryEnd > otherPickupStart) {
            newConflicts.push({
              load1: load,
              load2: otherLoad,
              message: `${load.load_number} overlaps with ${otherLoad.load_number}`
            });
          }
        }
      }
      
      setConflicts(newConflicts);
    };
    
    detectConflicts();
  }, [loads, driverId]);

  const getLoadsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return loads.filter(load => {
      if (!load.driver_id || load.driver_id !== driverId || !load.pickup_date) return false;
      const pickupDate = load.pickup_date.split('T')[0];
      const deliveryDate = load.delivery_date ? load.delivery_date.split('T')[0] : pickupDate;
      return pickupDate <= dateStr && deliveryDate >= dateStr;
    });
  };

  const getWeekDates = () => {
    const curr = new Date(currentDate);
    const first = curr.getDate() - curr.getDay();
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr.getFullYear(), curr.getMonth(), first + i);
      weekDates.push(d);
    }
    return weekDates;
  };

  const renderDayView = () => {
    const loadsForDay = getLoadsForDate(currentDate);
    const dayConflicts = conflicts.filter(c => {
      const date1 = new Date(c.load1.pickup_date).toISOString().split('T')[0];
      const date2 = new Date(currentDate).toISOString().split('T')[0];
      return date1 <= date2 && new Date(c.load1.delivery_date).toISOString().split('T')[0] >= date2;
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-lg">
              {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000))}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000))}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {dayConflicts.length > 0 && (
          <div className="glass-card rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1">
            <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4" />
              Double-booking conflict
            </div>
            <div className="text-red-300 text-xs">
              {dayConflicts[0].message}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {loadsForDay.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No loads scheduled
            </div>
          ) : (
            loadsForDay.map(load => (
              <a key={load.id} href={`/driver/loads/${load.id}`} className="block">
                <div className="glass-card rounded-lg border border-blue-500/30 bg-blue-500/8 p-4 hover:bg-blue-500/12 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-orange-400 font-mono font-bold text-sm">
                        {load.load_number || `#LD${load.id?.slice(-6)}`}
                      </div>
                      <div className="text-slate-300 text-sm font-medium mt-1">
                        {load.origin_city} → {load.destination_city}
                      </div>
                    </div>
                    <StatusBadge status={load.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                    {load.pickup_date && (
                      <span>Pickup: {new Date(load.pickup_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                    {load.delivery_date && (
                      <span>Delivery: {new Date(load.delivery_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                    <span className="ml-auto text-green-400 font-bold">${(load.rate || 0).toLocaleString()}</span>
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates();

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-lg">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000))}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000))}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="glass-card rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center gap-2 text-red-400 text-sm font-semibold mb-2">
              <AlertTriangle className="w-4 h-4" />
              {conflicts.length} double-booking conflict{conflicts.length !== 1 ? "s" : ""}
            </div>
            <div className="text-red-300 text-xs space-y-1">
              {conflicts.map((c, idx) => (
                <div key={idx}>• {c.message}</div>
              ))}
            </div>
          </div>
        )}

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2 text-xs text-slate-500 font-semibold text-center">
          {DAYS.map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date, idx) => {
            const loadsForDay = getLoadsForDate(date);
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <div 
                key={idx}
                className={`border rounded-lg p-2 min-h-32 overflow-y-auto text-xs ${
                  isToday ? 'border-orange-500/40 bg-orange-500/5' : 'border-white/10 bg-white/2'
                }`}
              >
                <div className={`font-bold mb-2 ${isToday ? 'text-orange-400' : 'text-slate-300'}`}>
                  <div>{DAYS[date.getDay()]}</div>
                  <div className="text-[10px] text-slate-500">{date.getDate()}</div>
                </div>
                <div className="space-y-1">
                  {loadsForDay.map(load => (
                    <a 
                      key={load.id}
                      href={`/driver/loads/${load.id}`}
                      className="block bg-blue-500/20 border border-blue-500/30 rounded p-1 text-slate-200 hover:bg-blue-500/30 transition-colors"
                      title={load.load_number}
                    >
                      <div className="font-medium text-[10px] truncate">
                        {load.load_number}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {load.origin_city}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-1.5 p-1 rounded-lg bg-white/5 border border-white/5 w-fit">
        <button
          onClick={() => setViewMode("week")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
            viewMode === "week" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setViewMode("day")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
            viewMode === "day" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          Day
        </button>
      </div>

      {/* Content */}
      {viewMode === "week" ? renderWeekView() : renderDayView()}
    </div>
  );
}