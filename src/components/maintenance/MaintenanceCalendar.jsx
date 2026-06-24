import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Wrench } from "lucide-react";

const TYPE_COLORS = {
  preventive:   { bg: "bg-blue-500",   dot: "bg-blue-400",   text: "text-blue-300",   badge: "bg-blue-500/15 border-blue-500/25 text-blue-300" },
  corrective:   { bg: "bg-red-500",    dot: "bg-red-400",    text: "text-red-300",    badge: "bg-red-500/15 border-red-500/25 text-red-300" },
  inspection:   { bg: "bg-cyan-500",   dot: "bg-cyan-400",   text: "text-cyan-300",   badge: "bg-cyan-500/15 border-cyan-500/25 text-cyan-300" },
  tire:         { bg: "bg-amber-500",  dot: "bg-amber-400",  text: "text-amber-300",  badge: "bg-amber-500/15 border-amber-500/25 text-amber-300" },
  brake:        { bg: "bg-orange-500", dot: "bg-orange-400", text: "text-orange-300", badge: "bg-orange-500/15 border-orange-500/25 text-orange-300" },
  engine:       { bg: "bg-purple-500", dot: "bg-purple-400", text: "text-purple-300", badge: "bg-purple-500/15 border-purple-500/25 text-purple-300" },
  transmission: { bg: "bg-pink-500",   dot: "bg-pink-400",   text: "text-pink-300",   badge: "bg-pink-500/15 border-pink-500/25 text-pink-300" },
  other:        { bg: "bg-slate-500",  dot: "bg-slate-400",  text: "text-slate-300",  badge: "bg-slate-500/15 border-slate-500/25 text-slate-300" },
};

function getColor(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function MaintenanceCalendar({ records, trucks, onEditRecord }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null); // selected day ISO string

  const truckMap = useMemo(() => Object.fromEntries(trucks.map(t => [t.id, t])), [trucks]);

  // Index records by calendar day (YYYY-MM-DD)
  const byDay = useMemo(() => {
    const map = {};
    records.forEach(r => {
      if (!r.scheduled_date) return;
      const key = r.scheduled_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [records]);

  // Build the calendar grid for this month
  const grid = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const selectedEvents = selected ? (byDay[selected] || []) : [];

  // Count upcoming events in this month for the header
  const monthEvents = Object.entries(byDay)
    .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2,"0")}`))
    .flatMap(([, v]) => v);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TYPE_COLORS).slice(0, 6).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
            <span className="text-slate-400 text-xs capitalize">{type}</span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2 glass-card rounded-xl border border-white/5 p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="text-white font-heading font-semibold text-lg">{MONTHS[month]} {year}</div>
              <div className="text-slate-500 text-xs">{monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""} this month</div>
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const key = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const events = byDay[key] || [];
              const isToday = key === todayKey;
              const isSelected = key === selected;
              const isPast = new Date(key) < today && key !== todayKey;

              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  className={`relative rounded-lg p-1.5 min-h-[52px] text-left transition-all border ${
                    isSelected
                      ? "bg-orange-500/20 border-orange-500/40"
                      : isToday
                      ? "bg-orange-500/10 border-orange-500/20"
                      : events.length > 0
                      ? "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/15"
                      : "border-transparent hover:bg-white/3"
                  }`}
                >
                  <span className={`text-xs font-semibold block mb-1 ${
                    isToday ? "text-orange-400" : isPast ? "text-slate-600" : "text-slate-300"
                  }`}>
                    {day}
                  </span>
                  {/* Event dots — show up to 3 */}
                  <div className="flex flex-wrap gap-0.5">
                    {events.slice(0, 3).map((e, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${getColor(e.type).dot}`} />
                    ))}
                    {events.length > 3 && (
                      <span className="text-[9px] text-slate-500 leading-none self-end">+{events.length - 3}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel — selected day or upcoming list */}
        <div className="glass-card rounded-xl border border-white/5 p-5 flex flex-col">
          {selected ? (
            <>
              <div className="mb-4">
                <div className="text-white font-semibold">
                  {new Date(selected + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </div>
                <div className="text-slate-500 text-xs">{selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}</div>
              </div>
              {selectedEvents.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">No events scheduled</div>
              ) : (
                <div className="space-y-3 overflow-y-auto">
                  {selectedEvents.map(e => {
                    const truck = truckMap[e.truck_id];
                    const colors = getColor(e.type);
                    return (
                      <button
                        key={e.id}
                        onClick={() => onEditRecord(e)}
                        className="w-full text-left rounded-xl border border-white/5 bg-white/3 hover:bg-white/6 transition-colors p-3.5"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-lg ${colors.bg}/15 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Wrench className={`w-3.5 h-3.5 ${colors.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium capitalize">{(e.type || "other").replace("_", " ")}</div>
                            <div className="text-slate-400 text-xs mt-0.5">
                              {truck ? `Unit #${truck.unit_number} · ${truck.make} ${truck.model}` : "Unknown truck"}
                            </div>
                            {e.vendor && <div className="text-slate-500 text-xs mt-0.5">{e.vendor}</div>}
                            {e.total_cost && (
                              <div className="text-orange-400 text-xs font-semibold mt-1">${e.total_cost.toLocaleString()}</div>
                            )}
                          </div>
                          <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize ${colors.badge}`}>
                            {e.status || "scheduled"}
                          </span>
                        </div>
                        {e.description && (
                          <p className="text-slate-500 text-xs mt-2 line-clamp-2">{e.description}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-white font-semibold mb-4">Upcoming Events</div>
              <div className="space-y-2.5 overflow-y-auto flex-1">
                {records
                  .filter(r => r.scheduled_date && new Date(r.scheduled_date) >= today && r.status !== "completed" && r.status !== "cancelled")
                  .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                  .slice(0, 10)
                  .map(e => {
                    const truck = truckMap[e.truck_id];
                    const colors = getColor(e.type);
                    const daysAway = Math.round((new Date(e.scheduled_date) - today) / (1000 * 60 * 60 * 24));
                    return (
                      <button
                        key={e.id}
                        onClick={() => onEditRecord(e)}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3 hover:bg-white/6 border border-white/5 transition-colors"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs font-medium capitalize">{(e.type || "other").replace("_", " ")}</div>
                          <div className="text-slate-500 text-[10px]">{truck ? `Unit #${truck.unit_number}` : "—"}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-xs font-semibold ${daysAway <= 3 ? "text-red-400" : daysAway <= 7 ? "text-amber-400" : "text-slate-400"}`}>
                            {daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `${daysAway}d`}
                          </div>
                          <div className="text-slate-600 text-[10px]">{new Date(e.scheduled_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                        </div>
                      </button>
                    );
                  })}
                {records.filter(r => r.scheduled_date && new Date(r.scheduled_date) >= today && r.status !== "completed" && r.status !== "cancelled").length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-slate-600 text-sm py-8">No upcoming events</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}