import { useState } from "react";
import { X, Download, FileText, Loader2, CheckCircle } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function buildCSV(rows, headers) {
  const escape = v => (v === null || v === undefined) ? "" : `"${String(v).replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportReportModal({ loads, invoices, expenses, clients, onClose }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [reportType, setReportType] = useState("monthly_summary");
  const [exported, setExported] = useState(false);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  const filterByMonth = (items, dateField) =>
    items.filter(item => {
      const d = new Date(item[dateField] || item.created_date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

  const handleExport = () => {
    const monthLabel = `${MONTHS[month]}_${year}`;
    let csvContent = "";
    let filename = "";

    if (reportType === "monthly_summary") {
      const monthLoads = filterByMonth(loads, "actual_delivery").concat(
        loads.filter(l => {
          const d = new Date(l.delivery_date || l.created_date);
          return d.getFullYear() === year && d.getMonth() === month &&
            !filterByMonth(loads, "actual_delivery").find(m => m.id === l.id);
        })
      );
      const monthExpenses = filterByMonth(expenses, "date");
      const monthInvoices = filterByMonth(invoices, "issue_date");

      const totalRevenue = monthLoads.reduce((s, l) => s + (l.rate || 0), 0);
      const totalExpenses = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const totalPaid = monthInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;

      // Summary section
      const summaryRows = [
        { Metric: "Report Period", Value: `${MONTHS[month]} ${year}` },
        { Metric: "Total Revenue (completed loads)", Value: `$${totalRevenue.toLocaleString()}` },
        { Metric: "Total Expenses", Value: `$${totalExpenses.toLocaleString()}` },
        { Metric: "Net Profit", Value: `$${netProfit.toLocaleString()}` },
        { Metric: "Loads Completed", Value: monthLoads.length },
        { Metric: "Avg Revenue / Load", Value: monthLoads.length ? `$${Math.round(totalRevenue / monthLoads.length).toLocaleString()}` : "$0" },
        { Metric: "Invoices Paid", Value: `$${totalPaid.toLocaleString()}` },
        { Metric: "Invoices (count)", Value: monthInvoices.length },
      ];

      // Broker breakdown
      const brokerMap = {};
      monthLoads.forEach(l => {
        const bid = l.broker_id || l.client_id;
        if (!bid) return;
        if (!brokerMap[bid]) brokerMap[bid] = { name: clientMap[bid]?.company_name || `Broker ${bid.slice(-4)}`, revenue: 0, loads: 0 };
        brokerMap[bid].revenue += l.rate || 0;
        brokerMap[bid].loads += 1;
      });
      const brokerRows = Object.values(brokerMap).sort((a, b) => b.revenue - a.revenue).map(b => ({
        Broker: b.name,
        "Loads Completed": b.loads,
        "Revenue": `$${b.revenue.toLocaleString()}`,
        "Avg Revenue / Load": `$${Math.round(b.revenue / b.loads).toLocaleString()}`,
      }));

      const summaryCsv = buildCSV(summaryRows, ["Metric", "Value"]);
      const brokerCsv = brokerRows.length > 0
        ? "\n\nBROKER BREAKDOWN\n" + buildCSV(brokerRows, ["Broker", "Loads Completed", "Revenue", "Avg Revenue / Load"])
        : "\n\nNo broker data for this period.";

      csvContent = `HASTEN MONTHLY REVENUE SUMMARY\nGenerated: ${now.toLocaleDateString()}\n\n` + summaryCsv + brokerCsv;
      filename = `HASTEN_Monthly_Summary_${monthLabel}.csv`;
    }

    if (reportType === "load_detail") {
      const monthLoads = filterByMonth(loads, "actual_delivery");
      const rows = monthLoads.map(l => ({
        "Load #": l.load_number || l.id?.slice(-6).toUpperCase(),
        "Origin": `${l.origin_city || ""}, ${l.origin_state || ""}`,
        "Destination": `${l.destination_city || ""}, ${l.destination_state || ""}`,
        "Equipment": l.equipment_type || "",
        "Miles": l.miles || "",
        "Rate": l.rate ? `$${l.rate.toLocaleString()}` : "$0",
        "Rate/Mile": l.rate_per_mile ? `$${l.rate_per_mile.toFixed(2)}` : "",
        "Fuel Surcharge": l.fuel_surcharge ? `$${l.fuel_surcharge.toLocaleString()}` : "$0",
        "Total Revenue": l.total_revenue ? `$${l.total_revenue.toLocaleString()}` : "",
        "Pickup Date": l.pickup_date ? new Date(l.pickup_date).toLocaleDateString() : "",
        "Delivery Date": l.actual_delivery ? new Date(l.actual_delivery).toLocaleDateString() : (l.delivery_date ? new Date(l.delivery_date).toLocaleDateString() : ""),
        "Broker": clientMap[l.broker_id || l.client_id]?.company_name || "",
        "Status": l.status || "",
      }));
      const headers = ["Load #","Origin","Destination","Equipment","Miles","Rate","Rate/Mile","Fuel Surcharge","Total Revenue","Pickup Date","Delivery Date","Broker","Status"];
      csvContent = `HASTEN LOAD DETAIL REPORT - ${MONTHS[month]} ${year}\nGenerated: ${now.toLocaleDateString()}\n\n` + buildCSV(rows, headers);
      filename = `HASTEN_Load_Detail_${monthLabel}.csv`;
    }

    if (reportType === "expense_detail") {
      const monthExpenses = filterByMonth(expenses, "date");
      const rows = monthExpenses.map(e => ({
        "Date": e.date ? new Date(e.date).toLocaleDateString() : "",
        "Category": (e.category || "").replace(/_/g, " "),
        "Vendor": e.vendor || "",
        "Description": e.description || "",
        "Amount": `$${(e.amount || 0).toLocaleString()}`,
        "Status": e.status || "",
        "Truck": e.truck_id || "",
        "Driver": e.driver_id || "",
      }));
      const headers = ["Date","Category","Vendor","Description","Amount","Status","Truck","Driver"];
      csvContent = `HASTEN EXPENSE REPORT - ${MONTHS[month]} ${year}\nGenerated: ${now.toLocaleDateString()}\n\n` + buildCSV(rows, headers);
      filename = `HASTEN_Expenses_${monthLabel}.csv`;
    }

    downloadCSV(csvContent, filename);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const REPORT_TYPES = [
    { key: "monthly_summary", label: "Monthly Revenue Summary", desc: "KPIs + broker breakdown — ideal for broker meetings" },
    { key: "load_detail", label: "Load Detail Report", desc: "Line-by-line completed loads with rates and routes" },
    { key: "expense_detail", label: "Expense Report", desc: "All expenses with categories, vendors, and amounts" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative glass-card rounded-2xl border border-white/10 w-full max-w-md shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-heading font-semibold">Export Report</h2>
              <p className="text-slate-500 text-xs">Download financial data as CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Report type */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Report Type</label>
            <div className="space-y-2">
              {REPORT_TYPES.map(rt => (
                <button
                  key={rt.key}
                  onClick={() => setReportType(rt.key)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
                    reportType === rt.key
                      ? "border-orange-500/40 bg-orange-500/5"
                      : "border-white/5 hover:border-white/10 bg-white/2"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 flex-shrink-0 transition-all ${
                    reportType === rt.key ? "border-orange-500 bg-orange-500" : "border-slate-600"
                  }`} />
                  <div>
                    <div className={`text-sm font-medium ${reportType === rt.key ? "text-orange-400" : "text-white"}`}>{rt.label}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{rt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Period picker */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Period</label>
            <div className="flex gap-2">
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              >
                {MONTHS.map((m, i) => <option key={i} value={i} className="bg-slate-900">{m}</option>)}
              </select>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              >
                {years.map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
              </select>
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200"
            style={{ background: exported ? "linear-gradient(135deg,#16a34a,#22c55e)" : "linear-gradient(135deg,#EA580C,#F97316)", boxShadow: "0 4px 20px rgba(234,88,12,0.3)" }}
          >
            {exported
              ? <><CheckCircle className="w-4 h-4" /> Downloaded!</>
              : <><Download className="w-4 h-4" /> Export as CSV</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}