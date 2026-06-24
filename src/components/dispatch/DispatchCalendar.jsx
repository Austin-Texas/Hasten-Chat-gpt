import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, Loader2 } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import { STATE_TO_CORRIDOR } from "@/components/dispatch/RegionGroupView";
import { logTimelineEvent } from "@/lib/timelineLogger";

const CORRIDOR_COLORS = {
  "I-95 East Coast": "bg-blue-500/20 border-blue-500/30 text-blue-300",
  "I-10 Southern": "bg-orange-500/20 border-orange-500/30 text-orange-300",
  "I-40 Central": "bg-purple-500/20 border-purple-500/30 text-purple-300",
  "I-80 Northern": "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
  "I-35 Central": "bg-green-500/20 border-green-500/30 text-green-300",
  "I-5 West Coast": "bg-teal-500/20 border-teal-500/30 text-teal-300",
  "Other": "bg-slate-500/20 border-slate-500/30 text-slate-300",
};

function getCorridor(state) {
  return STATE_TO_CORRIDOR[state] || "Other";
}

const BOTTLENECK_THRESHOLD = 3;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DispatchCalendar({ loads = [], drivers = [], trucks = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // month, week, day
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [selectedTruckId, setSelectedTruckId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [logging, setLogging] = useState(false);

  // Detect scheduling conflicts
  useEffect(() => {
    const detectConflicts = () => {
      const newConflicts = [];
      
      loads.forEach(load => {
        if (!load.driver_id || !load.pickup_date || !load.delivery_date) return;
        
        // Check driver double-booking
        const driverLoads = loads.filter(l => 
          l.driver_id === load.driver_id && 
          l.id !== load.id &&
          l.status !== "cancelled"
        );
        
        driverLoads.forEach(otherLoad => {
          const pickupStart = new Date(load.pickup_date);
          const deliveryEnd = new Date(load.delivery_date);
          const otherPickupStart = new Date(otherLoad.pickup_date);
          const otherDeliveryEnd = new Date(otherLoad.delivery_date);
          
          if (pickupStart < otherDeliveryEnd && deliveryEnd > otherPickupStart) {
            newConflicts.push({
              type: "driver_double_booked",
              loadId: load.id,
              otherLoadId: otherLoad.id,
              driverId: load.driver_id,
              message: `Driver double-booked: ${load.load_number} overlaps with ${otherLoad.load_number}`
            });
          }
        });

        // Check truck double-booking
        if (load.truck_id) {
          const truckLoads = loads.filter(l => 
            l.truck_id === load.truck_id && 
            l.id !== load.id &&
            l.status !== "cancelled"
          );
          
          truckLoads.forEach(otherLoad => {
            const pickupStart = new Date(load.pickup_date);
            const deliveryEnd = new Date(load.delivery_date);
            const otherPickupStart = new Date(otherLoad.pickup_date);
            const otherDeliveryEnd = new Date(otherLoad.delivery_date);
            
            if (pickupStart < otherDeliveryEnd && deliveryEnd > otherPickupStart) {
              newConflicts.push({
                type: "truck_double_booked",
                loadId: load.id,
                otherLoadId: otherLoad.id,
                truckId: load.truck_id,
                message: `Truck double-booked: ${load.load_number} overlaps with ${otherLoad.load_number}`
              });
            }
          });
        }
      });
      
      setConflicts(newConflicts);
    };
    
    detectConflicts();
  }, [loads]);

  // Group loads by delivery date — spots upcoming delivery bottlenecks
  const getLoadsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return loads.filter(load => {
      if (!load.delivery_date) return false;
      const deliveryDate = load.delivery_date.split('T')[0];
      if (deliveryDate !== dateStr) return false;
      // Only show active (non-cancelled, non-completed) loads
      if (load.status === "cancelled" || load.status === "completed") return false;

      if (selectedDriverId && load.driver_id !== selectedDriverId) return false;
      if (selectedTruckId && load.truck_id !== selectedTruckId) return false;
      if (selectedStatus && load.status !== selectedStatus) return false;

      return true;
    });
  };

  // Group a day's loads by corridor/region for bottleneck detection
  const getRegionGroups = (dayLoads) => {
    const groups = {};
    dayLoads.forEach(load => {
      const corridor = getCorridor(load.destination_state);
      if (!groups[corridor]) groups[corridor] = [];
      groups[corridor].push(load);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  };

  // Detect bottleneck: any date+region with >= threshold loads
  const getBottleneckDates = () => {
    const bottlenecks = [];
    const daysInMonth = getDaysInMonth(currentDate);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayLoads = getLoadsForDate(date);
      const regionGroups = getRegionGroups(dayLoads);
      regionGroups.forEach(([corridor, corridorLoads]) => {
        if (corridorLoads.length >= BOTTLENECK_THRESHOLD) {
          bottlenecks.push({ day, corridor, count: corridorLoads.length });
        }
      });
    }
    return bottlenecks;
  };

  const bottleneckDates = getBottleneckDates();

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleScheduleChange = async (loadId, newPickupDate, newDeliveryDate) => {
    setLogging(true);
    try {
      let currentUser = { id: 'system', role: 'dispatcher', full_name: 'Dispatcher' };
      try {
        const user = await base44.auth.me();
        Object.assign(currentUser, user);
      } catch {}

      // Update load
      await base44.entities.Load.update(loadId, {
        pickup_date: newPickupDate,
        delivery_date: newDeliveryDate,
      });

      // Log timeline event
      const load = loads.find(l => l.id === loadId);
      if (load) {
        await logTimelineEvent({
          entityType: 'Load',
          entityId: loadId,
          entityDisplay: load.load_number,
          action: 'updated',
          summary: `Rescheduled ${load.load_number} to ${new Date(newPickupDate).toLocaleDateString()}`,
          currentUser
        });

        // Send notification
        await base44.entities.Notification.create({
          user_id: currentUser.id,
          role: currentUser.role,
          title: 'Load Rescheduled',
          message: `${load.load_number} has been rescheduled to ${new Date(newPickupDate).toLocaleDateString()}`,
          type: 'load_assigned',
          related_entity_type: 'Load',
          related_entity_id: loadId
        });
      }

      alert('Load rescheduled and notification sent!');
    } catch (err) {
      console.error('Failed to reschedule load:', err);
      alert('Failed to reschedule load');
    } finally {
      setLogging(false);
    }
  };

  const renderMonth = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-white/1 border border-white/5"></div>);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const loadsForDay = getLoadsForDate(date);
      const isToday = new Date().toDateString() === date.toDateString();

      const regionGroups = getRegionGroups(loadsForDay);
      const hasBottleneck = bottleneckDates.some(b => b.day === day);

      days.push(
        <div 
          key={day}
          className={`border rounded-lg p-2 text-xs min-h-24 overflow-y-auto ${
            isToday ? 'border-orange-500/40 bg-orange-500/5' :
            hasBottleneck ? 'border-red-500/40 bg-red-500/5' :
            'border-white/10 bg-white/2'
          }`}
        >
          <div className={`font-bold mb-1 flex items-center justify-between ${isToday ? 'text-orange-400' : hasBottleneck ? 'text-red-400' : 'text-slate-300'}`}>
            <span>{day}</span>
            {loadsForDay.length > 0 && (
              <span className={`text-[9px] px-1 rounded-full ${hasBottleneck ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-slate-500'}`}>
                {loadsForDay.length}
              </span>
            )}
          </div>
          <div className="space-y-1">
            {regionGroups.map(([corridor, corridorLoads]) => (
              <div
                key={corridor}
                className={`rounded p-1 border ${CORRIDOR_COLORS[corridor] || CORRIDOR_COLORS["Other"]} ${
                  corridorLoads.length >= BOTTLENECK_THRESHOLD ? 'ring-1 ring-red-500/40' : ''
                }`}
                title={`${corridor}: ${corridorLoads.length} load${corridorLoads.length !== 1 ? "s" : ""} delivering`}
              >
                <div className="text-[9px] font-bold uppercase tracking-wide opacity-80 truncate">{corridor.replace(/^I-\d+\s/, "")}</div>
                <div className="text-[10px] font-medium flex items-center gap-0.5 flex-wrap">
                  {corridorLoads.slice(0, 3).map(load => (
                    <a key={load.id} href={`/loads/${load.id}`} className="hover:underline">
                      {load.load_number || `#${load.id?.slice(-4)}`}
                    </a>
                  )).flatMap((el, i) => i < corridorLoads.length - 1 ? [el, <span key={`s${i}`} className="opacity-40">,</span>] : [el])}
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

  const filteredConflicts = conflicts.filter(c => {
    if (selectedDriverId && c.type !== 'driver_double_booked') return false;
    if (selectedTruckId && c.type !== 'truck_double_booked') return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-400" />
          <h2 className="text-white font-heading font-bold text-xl">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
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
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {drivers.length > 0 && (
          <select
            value={selectedDriverId || ''}
            onChange={(e) => setSelectedDriverId(e.target.value || null)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-orange-500/40"
          >
            <option value="">All Drivers</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>
                {d.first_name} {d.last_name}
              </option>
            ))}
          </select>
        )}

        {trucks.length > 0 && (
          <select
            value={selectedTruckId || ''}
            onChange={(e) => setSelectedTruckId(e.target.value || null)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-orange-500/40"
          >
            <option value="">All Trucks</option>
            {trucks.map(t => (
              <option key={t.id} value={t.id}>
                {t.unit_number}
              </option>
            ))}
          </select>
        )}

        <select
          value={selectedStatus || ''}
          onChange={(e) => setSelectedStatus(e.target.value || null)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-orange-500/40"
        >
          <option value="">All Statuses</option>
          {['available', 'assigned', 'in_transit', 'delivered', 'completed'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Conflict Alert */}
      {filteredConflicts.length > 0 && (
        <div className="glass-card rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <AlertTriangle className="w-5 h-5" />
            {filteredConflicts.length} scheduling conflict{filteredConflicts.length !== 1 ? 's' : ''} detected
          </div>
          <div className="space-y-1 text-sm text-red-300">
            {filteredConflicts.map((c, idx) => (
              <div key={idx}>• {c.message}</div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="glass-card rounded-xl border border-white/5 p-5">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-3">
          {DAYS.map(day => (
            <div key={day} className="text-center text-slate-400 text-xs font-semibold py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {renderMonth()}
        </div>
      </div>

      {/* Bottleneck alerts */}
      {bottleneckDates.length > 0 && (
        <div className="glass-card rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <AlertTriangle className="w-5 h-5" />
            {bottleneckDates.length} delivery bottleneck{bottleneckDates.length !== 1 ? "s" : ""} detected
          </div>
          <div className="flex flex-wrap gap-2">
            {bottleneckDates.map((b, idx) => (
              <div key={idx} className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-red-300 font-medium">
                  {MONTHS[currentDate.getMonth()].slice(0, 3)} {b.day}
                </span>
                <span className="text-red-500/60">•</span>
                <span className="text-red-400">{b.corridor}</span>
                <span className="text-red-500/60">•</span>
                <span className="text-red-300 font-bold">{b.count} loads</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-400 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-orange-500/40 bg-orange-500/5"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-red-500/40 bg-red-500/5"></div>
          <span>Bottleneck (3+ loads same region)</span>
        </div>
        {Object.entries(CORRIDOR_COLORS).slice(0, 6).map(([corridor, cls]) => (
          <div key={corridor} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${cls}`}></div>
            <span>{corridor.replace(/^I-\d+\s/, "")}</span>
          </div>
        ))}
      </div>

      {logging && (
        <div className="flex items-center gap-2 text-orange-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Updating load and logging timeline event...
        </div>
      )}
    </div>
  );
}