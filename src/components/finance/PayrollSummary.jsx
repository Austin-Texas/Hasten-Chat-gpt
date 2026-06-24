import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Download, DollarSign, Truck, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect } from "react";

const PERIOD_OPTIONS = [
  { key: "this_week",   label: "This Week" },
  { key: "this_month",  label: "This Month" },
  { key: "last_month",  label: "Last Month" },
  { key: "this_quarter",label: "This Quarter" },
  { key: "all_time",    label: "All Time" },
];

function periodRange(key) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (key) {
    case "this_week": {
      const day = now.getDay();
      const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
      return [start, end];
    }
    case "this_month":  return [new Date(y, m, 1), new Date(y, m + 1, 0, 23, 59, 59)];
    case "last_month":  return [new Date(y, m - 1, 1), new Date(y, m, 0, 23, 59, 59)];
    case "this_quarter": {
      const q = Math.floor(m / 3);
      return [new Date(y, q * 3, 1), new Date(y, q * 3 + 3, 0, 23, 59, 59)];
    }
    default: return [null, null];
  }
}

function exportCSV(rows, period) {
  const headers = [
    "Driver ID", "Driver Name", "Email",
    "Loads Completed", "Total Miles", "Gross Pay ($)",
    "Pay Type", "Pay Rate",
    "Fuel Expenses ($)", "Other Expenses ($)", "Net Pay ($)",
    "Hours Logged", "Avg Pay / Load ($)"
  ];
  const lines = [
    headers.join(","),
    ...rows.map(r => [
      r.driverId,
      `"${r.name}"`,
      `"${r.email}"`,
      r.loads,
      r.miles,
      r.grossPay.toFixed(2),
      r.payType,
      r.payRate,
      r.fuelExpenses.toFixed(2),
      r.otherExpenses.toFixed(2),
      r.netPay.toFixed(2),
      r.hours.toFixed(1),
      r.loads > 0 ? (r.grossPay / r.loads).toFixed(2) : "0.00",
    ].join(",")),
  ];
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hasten_payroll_${period}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PayrollSummary() {
  const [drivers, setDrivers]   = useState([]);
  const [loads, setLoads]       = useState([]);
  const [shiftLogs, setShiftLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState("this_month");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Driver.list("-created_date", 200),
      base44.entities.Load.filter({ status: "completed" }, "-created_date", 500),
      base44.entities.ShiftLog.list("-created_date", 500),
      base44.entities.Expense.list("-created_date", 500),
    ]).then(([d, l, s, e]) => {
      setDrivers(d);
      setLoads(l);
      setShiftLogs(s);
      setExpenses(e);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const payrollRows = useMemo(() => {
    const [start, end] = periodRange(period);

    const inRange = (dateStr) => {
      if (!dateStr) return period === "all_time";
      const d = new Date(dateStr);
      if (!start) return true;
      return d >= start && d <= end;
    };

    return drivers.map(driver => {
      // Loads completed by this driver in period
      const driverLoads = loads.filter(l =>
        l.driver_id === driver.id &&
        inRange(l.actual_delivery || l.updated_date)
      );

      const totalMiles = driverLoads.reduce((s, l) => s + (l.miles || 0), 0);

      // Gross pay calculation based on pay_type
      let grossPay = 0;
      if (driver.pay_type === "per_mile" && driver.pay_rate) {
        grossPay = totalMiles * driver.pay_rate;
      } else if (driver.pay_type === "percentage" && driver.pay_rate) {
        const revenue = driverLoads.reduce((s, l) => s + (l.rate || 0), 0);
        grossPay = revenue * (driver.pay_rate / 100);
      } else if (driver.pay_type === "flat_rate" && driver.pay_rate) {
        grossPay = driverLoads.length * driver.pay_rate;
      } else {
        // Fallback: sum load rates
        grossPay = driverLoads.reduce((s, l) => s + (l.rate || 0), 0);
      }

      // Shift hours
      const driverShifts = shiftLogs.filter(s =>
        s.driver_id === driver.id && inRange(s.shift_date)
      );
      const totalHours = driverShifts.reduce((s, sh) => s + (sh.total_hours || 0), 0);

      // Hourly pay override
      if (driver.pay_type === "hourly" && driver.pay_rate) {
        grossPay = totalHours * driver.pay_rate;
      }

      // Expenses deductible (fuel only shown separately)
      const driverExpenses = expenses.filter(e =>
        e.driver_id === driver.id && inRange(e.date)
      );
      const fuelExpenses  = driverExpenses.filter(e => e.category === "fuel").reduce((s, e) => s + (e.amount || 0), 0);
      const otherExpenses = driverExpenses.filter(e => e.category !== "fuel").reduce((s, e) => s + (e.amount || 0), 0);

      return {
        driverId:      driver.id,
        unitId:        driver.truck_id || "—",
        name:          `${driver.first_name} ${driver.last_name}`,
        email:         driver.email,
        payType:       driver.pay_type || "flat_rate",
        payRate:       driver.pay_rate || 0,
        loads:         driverLoads.length,
        miles:         Math.round(totalMiles),
        grossPay:      Math.round(grossPay * 100) / 100,
        fuelExpenses:  Math.round(fuelExpenses * 100) / 100,
        otherExpenses: Math.round(otherExpenses * 100) / 100,
        netPay:        Math.round((grossPay - fuelExpenses) * 100) / 100,
        hours:         Math.round(totalHours * 10) / 10,
        loadList:      driverLoads,
      };
    }).filter(r => r.loads > 0 || r.hours > 0).sort((a, b) => b.grossPay - a.grossPay);
  }, [drivers, loads, shiftLogs, expenses, period]);

  const totals = useMemo(() => ({
    loads:    payrollRows.reduce((s, r) => s + r.loads, 0),
    miles:    payrollRows.reduce((s, r) => s + r.miles, 0),
    grossPay: payrollRows.reduce((s, r) => s + r.grossPay, 0),
    netPay:   payrollRows.reduce((s, r) => s + r.netPay, 0),
    hours:    payrollRows.reduce((s, r) => s + r.hours, 0),
  }), [payrollRows]);

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5">
          {PERIOD_OPTIONS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-150 ${
                period === p.key ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => exportCSV(payrollRows, period)}
          disabled={payrollRows.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40 transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Drivers",        value: payrollRows.length,                        icon: Users,      color: "blue" },
          { label: "Loads Completed",value: totals.loads,                              icon: Truck,      color: "orange" },
          { label: "Gross Payroll",  value: `$${totals.grossPay.toLocaleString()}`,    icon: DollarSign, color: "green" },
          { label: "Total Hours",    value: `${totals.hours.toLocaleString()}h`,        icon: Clock,      color: "cyan" },
        ].map(k => (
          <div key={k.label} className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <k.icon className={`w-4 h-4 ${
                k.color === "blue" ? "text-blue-400" : k.color === "orange" ? "text-orange-400" :
                k.color === "green" ? "text-green-400" : "text-cyan-400"
              }`} />
              <span className="text-slate-400 text-xs uppercase tracking-wider">{k.label}</span>
            </div>
            <div className="text-white font-bold text-xl font-heading">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {payrollRows.length === 0 ? (
        <div className="glass-card rounded-xl border border-white/5 p-10 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No completed payroll data for this period</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          {/* Header */}
          <div className="hidden lg:grid grid-cols-8 gap-3 px-5 py-3 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
            <span className="col-span-2">Driver</span>
            <span className="text-right">Loads</span>
            <span className="text-right">Miles</span>
            <span className="text-right">Hours</span>
            <span className="text-right">Pay Type</span>
            <span className="text-right">Gross Pay</span>
            <span className="text-right">Net Pay</span>
          </div>
          <div className="divide-y divide-white/5">
            {payrollRows.map(row => {
              const isOpen = expanded === row.driverId;
              return (
                <div key={row.driverId}>
                  <button
                    className="w-full text-left px-5 py-4 hover:bg-white/2 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : row.driverId)}
                  >
                    {/* Mobile layout */}
                    <div className="flex items-center justify-between lg:hidden">
                      <div>
                        <div className="text-white font-semibold text-sm">{row.name}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{row.loads} loads · {row.miles.toLocaleString()} mi · {row.hours}h</div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">${row.grossPay.toLocaleString()}</div>
                        <div className="text-slate-500 text-xs">net ${row.netPay.toLocaleString()}</div>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 ml-2" /> : <ChevronDown className="w-4 h-4 text-slate-500 ml-2" />}
                    </div>
                    {/* Desktop grid */}
                    <div className="hidden lg:grid grid-cols-8 gap-3 items-center">
                      <div className="col-span-2">
                        <div className="text-white font-semibold text-sm">{row.name}</div>
                        <div className="text-slate-500 text-xs capitalize">{row.payType?.replace("_", " ")} · {row.email}</div>
                      </div>
                      <span className="text-right text-slate-300 text-sm">{row.loads}</span>
                      <span className="text-right text-slate-300 text-sm">{row.miles.toLocaleString()}</span>
                      <span className="text-right text-slate-300 text-sm">{row.hours}h</span>
                      <span className="text-right text-slate-400 text-xs capitalize">{row.payType?.replace("_"," ")}</span>
                      <span className="text-right text-green-400 font-bold font-mono">${row.grossPay.toLocaleString()}</span>
                      <div className="text-right flex items-center justify-end gap-1">
                        <span className="text-white font-bold font-mono">${row.netPay.toLocaleString()}</span>
                        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded load breakdown */}
                  {isOpen && (
                    <div className="bg-white/2 border-t border-white/5 px-5 pb-4 animate-slide-up">
                      <div className="pt-3 mb-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          ["Pay Rate", row.payRate ? `${row.payType === "percentage" ? row.payRate + "%" : "$" + row.payRate + (row.payType === "per_mile" ? "/mi" : row.payType === "hourly" ? "/hr" : " flat")}` : "—"],
                          ["Fuel Expenses", `-$${row.fuelExpenses.toLocaleString()}`],
                          ["Other Expenses", `-$${row.otherExpenses.toLocaleString()}`],
                          ["Avg / Load", row.loads > 0 ? `$${Math.round(row.grossPay / row.loads).toLocaleString()}` : "—"],
                        ].map(([label, val]) => (
                          <div key={label} className="glass-card rounded-lg p-2.5 border border-white/5">
                            <div className="text-slate-500 text-xs">{label}</div>
                            <div className={`text-sm font-semibold mt-0.5 ${val.startsWith("-") ? "text-red-400" : "text-white"}`}>{val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Load list */}
                      {row.loadList.length > 0 && (
                        <div>
                          <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Completed Loads</div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {row.loadList.map(l => (
                              <div key={l.id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                                <span className="text-orange-400 font-mono font-bold">{l.load_number || `#LD${l.id?.slice(-6).toUpperCase()}`}</span>
                                <span className="text-slate-400">{l.origin_city} → {l.destination_city}</span>
                                <span className="text-slate-400">{l.miles ? `${l.miles} mi` : "—"}</span>
                                <span className="text-green-400 font-semibold">${(l.rate || 0).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totals footer */}
          <div className="hidden lg:grid grid-cols-8 gap-3 px-5 py-3.5 border-t border-orange-500/10 bg-orange-500/3 text-sm font-bold">
            <span className="col-span-2 text-white">Totals ({payrollRows.length} drivers)</span>
            <span className="text-right text-white">{totals.loads}</span>
            <span className="text-right text-white">{totals.miles.toLocaleString()}</span>
            <span className="text-right text-white">{totals.hours}h</span>
            <span />
            <span className="text-right text-green-400 font-mono">${totals.grossPay.toLocaleString()}</span>
            <span className="text-right text-white font-mono">${totals.netPay.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}