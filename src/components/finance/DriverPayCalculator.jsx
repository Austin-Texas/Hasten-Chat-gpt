import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User, Download, Loader2, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DriverPayCalculator() {
  const [drivers, setDrivers] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState([]);
  const [sortBy, setSortBy] = useState("earnings");

  useEffect(() => {
    Promise.all([
      base44.entities.Driver.list("-created_date", 200),
      base44.entities.Load.filter({ status: "completed" }, "-created_date", 500),
    ])
      .then(([drv, lds]) => {
        setDrivers(drv);
        setLoads(lds);
        calculatePayroll(drv, lds);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const calculatePayroll = (drivers, loads) => {
    const payroll = drivers.map(driver => {
      const driverLoads = loads.filter(l => l.driver_id === driver.id);
      
      let totalPay = 0;
      
      driverLoads.forEach(load => {
        let pay = 0;
        
        switch (driver.pay_type) {
          case "per_mile":
            pay = (load.miles || 0) * (driver.pay_rate || 0);
            break;
          case "percentage":
            pay = (load.rate || 0) * ((driver.pay_rate || 0) / 100);
            break;
          case "flat_rate":
            pay = driver.pay_rate || 0;
            break;
          case "hourly":
            // Assume 8 hours per typical load if not specified
            pay = (driver.pay_rate || 0) * 8;
            break;
          default:
            pay = 0;
        }
        
        totalPay += pay;
      });

      return {
        id: driver.id,
        name: `${driver.first_name} ${driver.last_name}`,
        loadsCompleted: driverLoads.length,
        totalMiles: driverLoads.reduce((s, l) => s + (l.miles || 0), 0),
        totalLoadValue: driverLoads.reduce((s, l) => s + (l.rate || 0), 0),
        payType: driver.pay_type || "per_mile",
        payRate: driver.pay_rate || 0,
        totalEarnings: Math.round(totalPay * 100) / 100,
        avgPerLoad: driverLoads.length > 0 ? Math.round((totalPay / driverLoads.length) * 100) / 100 : 0,
        status: driver.status,
      };
    });

    const sorted = [...payroll].sort((a, b) => {
      if (sortBy === "earnings") return b.totalEarnings - a.totalEarnings;
      if (sortBy === "loads") return b.loadsCompleted - a.loadsCompleted;
      return b.avgPerLoad - a.avgPerLoad;
    });

    setPayrollData(sorted.filter(p => p.loadsCompleted > 0));
  };

  const stats = {
    totalDrivers: payrollData.length,
    totalPayroll: payrollData.reduce((s, p) => s + p.totalEarnings, 0),
    avgPay: payrollData.length > 0 ? Math.round((payrollData.reduce((s, p) => s + p.totalEarnings, 0) / payrollData.length) * 100) / 100 : 0,
    topEarner: payrollData.length > 0 ? payrollData[0] : null,
  };

  const chartData = payrollData.slice(0, 10).map(d => ({
    name: d.name.split(" ")[0],
    earnings: d.totalEarnings,
  }));

  const handleExportCSV = () => {
    const csv = [
      ["Driver Payroll Report", new Date().toLocaleDateString()],
      [],
      ["Driver Name", "Loads Completed", "Total Miles", "Total Load Value", "Pay Type", "Pay Rate", "Total Earnings", "Avg Per Load"],
    ];

    payrollData.forEach(p => {
      csv.push([
        p.name,
        p.loadsCompleted,
        p.totalMiles,
        p.totalLoadValue.toFixed(2),
        p.payType,
        p.payRate,
        p.totalEarnings.toFixed(2),
        p.avgPerLoad.toFixed(2),
      ]);
    });

    csv.push([]);
    csv.push(["TOTALS", payrollData.reduce((s, p) => s + p.loadsCompleted, 0), payrollData.reduce((s, p) => s + p.totalMiles, 0), payrollData.reduce((s, p) => s + p.totalLoadValue, 0).toFixed(2), "", "", stats.totalPayroll.toFixed(2), ""]);

    const csvContent = csv.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `driver-payroll-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Active Drivers</div>
          <div className="text-2xl font-bold text-white">{stats.totalDrivers}</div>
          <div className="text-slate-500 text-xs mt-1">with completed loads</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Total Payroll</div>
          <div className="text-2xl font-bold text-green-400">${stats.totalPayroll.toLocaleString()}</div>
          <div className="text-slate-500 text-xs mt-1">all drivers</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Avg Driver Pay</div>
          <div className="text-2xl font-bold text-blue-400">${stats.avgPay.toLocaleString()}</div>
          <div className="text-slate-500 text-xs mt-1">per driver</div>
        </div>
        {stats.topEarner && (
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Top Earner</div>
            <div className="text-white text-xs font-semibold truncate">{stats.topEarner.name}</div>
            <div className="text-green-400 font-bold text-sm mt-0.5">${stats.topEarner.totalEarnings.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Top 10 Earners</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} />
              <YAxis stroke="hsl(215 20% 55%)" style={{ fontSize: "12px" }} tickFormatter={v => `$${v.toLocaleString()}`} />
              <Tooltip contentStyle={{ background: "hsl(222 40% 7%)", border: "1px solid hsl(222 30% 14%)" }}
                formatter={v => [`$${v.toLocaleString()}`, "Earnings"]} />
              <Bar dataKey="earnings" fill="#EA580C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {[
            { key: "earnings", label: "Total Earnings" },
            { key: "loads", label: "Loads Completed" },
            { key: "avg", label: "Avg Per Load" },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => {
                setSortBy(opt.key);
                const sorted = [...payrollData].sort((a, b) => {
                  if (opt.key === "earnings") return b.totalEarnings - a.totalEarnings;
                  if (opt.key === "loads") return b.loadsCompleted - a.loadsCompleted;
                  return b.avgPerLoad - a.avgPerLoad;
                });
                setPayrollData(sorted);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortBy === opt.key ? "bg-orange-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportCSV}
          disabled={loading || payrollData.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/30 disabled:opacity-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Payroll Table */}
      {loading ? (
        <div className="glass-card rounded-xl p-8 flex items-center justify-center text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Calculating payroll...
        </div>
      ) : payrollData.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-slate-500">
          <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No drivers with completed loads</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Driver</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Loads</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Miles</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Load Value</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Pay Type</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Rate</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total Earnings</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Avg/Load</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payrollData.map(driver => (
                  <tr key={driver.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-400 text-xs font-bold">{driver.name.split(" ")[0][0]}{driver.name.split(" ")[1]?.[0] || ""}</span>
                        </div>
                        <div className="text-white text-sm font-medium">{driver.name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-300 text-sm">{driver.loadsCompleted}</td>
                    <td className="px-5 py-3 text-right text-slate-300 text-sm">{driver.totalMiles.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-slate-300 text-sm">${driver.totalLoadValue.toLocaleString()}</td>
                    <td className="px-5 py-3 text-left text-slate-400 text-xs capitalize">{driver.payType.replace("_", " ")}</td>
                    <td className="px-5 py-3 text-right text-slate-300 text-sm">
                      {driver.payType === "percentage" ? `${driver.payRate}%` : `$${driver.payRate}`}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400 font-bold">{driver.totalEarnings.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-300 text-sm">${driver.avgPerLoad.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="px-5 py-4 bg-orange-500/5 border-t border-orange-500/20">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Loads</div>
                <div className="text-white font-bold">{payrollData.reduce((s, p) => s + p.loadsCompleted, 0)}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Miles</div>
                <div className="text-white font-bold">{payrollData.reduce((s, p) => s + p.totalMiles, 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Load Value</div>
                <div className="text-white font-bold">${payrollData.reduce((s, p) => s + p.totalLoadValue, 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Payroll</div>
                <div className="text-green-400 font-bold text-lg">${stats.totalPayroll.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}