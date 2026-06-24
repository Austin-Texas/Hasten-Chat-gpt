import { jsPDF } from "jspdf";

/**
 * Exports an IFTA report as a PDF.
 *
 * Accepts two shapes:
 *  - iftaTaxReport data  (has report.state_summary, report.load_breakdowns, report.period)
 *  - IFTAQuarterly data  (has quarterlyData.stateData, selectedQuarter, KPI totals)
 */
export function exportIFTAPDF({ report, quarterlyData, selectedQuarter }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 0;

  const ORANGE = [234, 88, 12];
  const NAVY   = [11, 18, 33];
  const GRAY   = [100, 116, 139];
  const WHITE  = [255, 255, 255];
  const LIGHT  = [241, 245, 249];

  const fmt = (n, decimals = 2) =>
    typeof n === "number" ? n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : "—";

  // ── Header banner ────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 72, "F");

  doc.setFillColor(...ORANGE);
  doc.rect(margin - 4, 18, 36, 36, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("H", margin + 9, 42);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("HASTEN Logistics", margin + 40, 38);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text("IFTA Fuel Tax Report", margin + 40, 54);

  // Period label top-right
  const period = report?.period || selectedQuarter || "—";
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(period, W - margin, 38, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, W - margin, 54, { align: "right" });

  y = 96;

  // ── KPI summary row ──────────────────────────────────────────────────────
  const kpis = report
    ? [
        { label: "Total Loads",    value: String(report.loads_count || 0) },
        { label: "Total Miles",    value: (report.total_miles || 0).toLocaleString() },
        { label: "Total Gallons",  value: fmt(report.total_gallons, 1) },
        { label: "Tax Owed",       value: `$${fmt(report.total_tax_owed)}` },
      ]
    : [
        { label: "Total Miles",   value: (quarterlyData.totalMiles || 0).toLocaleString() },
        { label: "Total Gallons", value: fmt(quarterlyData.totalGallons, 1) },
        { label: "Fuel Cost",     value: `$${fmt(quarterlyData.totalFuelCost)}` },
        { label: "Avg MPG",       value: String(quarterlyData.mpg || "—") },
      ];

  const boxW = (W - margin * 2 - 12) / kpis.length;
  kpis.forEach((kpi, i) => {
    const x = margin + i * (boxW + 4);
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, boxW, 48, 4, 4, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(kpi.label.toUpperCase(), x + boxW / 2, y + 14, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(kpi.value, x + boxW / 2, y + 34, { align: "center" });
  });

  y += 64;

  // ── Section helper ───────────────────────────────────────────────────────
  const sectionHeader = (title) => {
    doc.setFillColor(...ORANGE);
    doc.rect(margin, y, 4, 14, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(title, margin + 10, y + 11);
    y += 22;
  };

  const tableHeader = (cols) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, W - margin * 2, 20, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    cols.forEach(col => {
      const tx = col.align === "right" ? col.x + col.w : col.x;
      doc.text(col.label, tx, y + 13, { align: col.align || "left" });
    });
    y += 20;
  };

  const tableRow = (cols, rowData, rowIdx) => {
    const rowH = 18;
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, W - margin * 2, rowH, "F");
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    cols.forEach((col, ci) => {
      const val = String(rowData[ci] ?? "—");
      doc.setTextColor(col.color ? col.color : NAVY);
      const tx = col.align === "right" ? col.x + col.w : col.x;
      doc.text(val, tx, y + 12, { align: col.align || "left" });
    });
    y += rowH;
  };

  const checkPage = (needed = 60) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 40;
    }
  };

  // ── State Summary Table ──────────────────────────────────────────────────
  sectionHeader("Per-State Summary");

  const stateCols = report
    ? [
        { label: "STATE",        x: margin + 4,   w: 50,  align: "left" },
        { label: "MILES",        x: margin + 124,  w: 70,  align: "right" },
        { label: "GALLONS",      x: margin + 224,  w: 70,  align: "right" },
        { label: "RATE / GAL",   x: margin + 324,  w: 70,  align: "right" },
        { label: "TAX OWED",     x: margin + 424,  w: 75,  align: "right" },
      ]
    : [
        { label: "STATE",        x: margin + 4,   w: 50,  align: "left" },
        { label: "MILES",        x: margin + 104,  w: 70,  align: "right" },
        { label: "GALLONS",      x: margin + 204,  w: 70,  align: "right" },
        { label: "FUEL COST",    x: margin + 304,  w: 80,  align: "right" },
        { label: "MPG",          x: margin + 394,  w: 55,  align: "right" },
        { label: "LOADS",        x: margin + 449,  w: 50,  align: "right" },
      ];

  tableHeader(stateCols);

  const stateRows = report
    ? report.state_summary.map(r => [
        r.state,
        r.miles.toLocaleString(),
        fmt(r.gallons, 1),
        r.rate !== null ? `$${r.rate.toFixed(4)}` : "N/A",
        `$${fmt(r.taxOwed)}`,
      ])
    : Object.entries(quarterlyData.stateData)
        .sort(([, a], [, b]) => b.miles - a.miles)
        .map(([state, d]) => [
          state,
          d.miles.toLocaleString(),
          fmt(d.gallons, 1),
          `$${fmt(d.cost)}`,
          d.gallons > 0 ? (d.miles / d.gallons).toFixed(2) : "—",
          String(d.loads),
        ]);

  stateRows.forEach((row, i) => {
    checkPage(22);
    tableRow(stateCols, row, i);
  });

  // Totals row
  doc.setFillColor(234, 88, 12, 30);
  doc.rect(margin, y, W - margin * 2, 20, "F");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ORANGE);
  if (report) {
    doc.text("TOTAL", margin + 4, y + 13);
    doc.text(report.total_miles.toLocaleString(), margin + 194, y + 13, { align: "right" });
    doc.text(fmt(report.total_gallons, 1), margin + 294, y + 13, { align: "right" });
    doc.text(`$${fmt(report.total_tax_owed)}`, margin + 499, y + 13, { align: "right" });
  } else {
    doc.text("TOTAL", margin + 4, y + 13);
    doc.text(quarterlyData.totalMiles.toLocaleString(), margin + 174, y + 13, { align: "right" });
    doc.text(fmt(quarterlyData.totalGallons, 1), margin + 274, y + 13, { align: "right" });
    doc.text(`$${fmt(quarterlyData.totalFuelCost)}`, margin + 384, y + 13, { align: "right" });
  }
  y += 28;

  // ── Load Breakdown (IFTAReport only) ─────────────────────────────────────
  if (report?.load_breakdowns?.length > 0) {
    checkPage(60);
    sectionHeader(`Load Breakdown  (${report.load_breakdowns.length} loads)`);

    const loadCols = [
      { label: "LOAD #",       x: margin + 4,   w: 90,  align: "left" },
      { label: "ORIGIN",       x: margin + 104,  w: 110, align: "left" },
      { label: "DESTINATION",  x: margin + 224,  w: 110, align: "left" },
      { label: "MILES",        x: margin + 354,  w: 60,  align: "right" },
      { label: "TAX",          x: margin + 429,  w: 70,  align: "right" },
    ];
    tableHeader(loadCols);

    report.load_breakdowns.forEach((load, i) => {
      checkPage(22);
      tableRow(loadCols, [
        load.load_number || `LD${load.load_id?.slice(-6).toUpperCase()}`,
        load.origin,
        load.destination,
        (load.miles || 0).toLocaleString(),
        `$${fmt(load.total_tax)}`,
      ], i);
    });
  }

  // ── Footer on every page ─────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(...NAVY);
    doc.rect(0, ph - 28, W, 28, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 190, 210);
    doc.text("HASTEN Logistics · IFTA Fuel Tax Report · Confidential", margin, ph - 10);
    doc.text(`Page ${p} of ${totalPages}`, W - margin, ph - 10, { align: "right" });
  }

  const filename = report
    ? `HASTEN_IFTA_Q${report.quarter}_${report.year}.pdf`
    : `HASTEN_IFTA_${selectedQuarter}.pdf`;

  doc.save(filename);
}