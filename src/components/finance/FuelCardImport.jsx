import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, X, Link2, Fuel, ChevronDown } from "lucide-react";

const selectClass = "bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-500/40 transition-colors w-full";

// Normalise a raw fuel card row into our Expense schema fields
function normaliseRow(row) {
  // Try to detect common fuel card CSV column names (EFS, Comdata, WEX, generic)
  const get = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find(rk => rk.toLowerCase().replace(/[\s_-]/g, "").includes(k.toLowerCase().replace(/[\s_-]/g, "")));
      if (found && row[found] !== undefined && row[found] !== "") return String(row[found]).trim();
    }
    return "";
  };

  const amountRaw = get("amount", "total", "transactionamount", "cost", "price", "charge");
  const gallonsRaw = get("gallons", "quantity", "qty", "volume", "litres", "units");
  const pricePerGalRaw = get("pricepergallon", "ppg", "unitprice", "rate", "priceperunit");
  const dateRaw = get("date", "transactiondate", "txndate", "postdate");
  const vendorRaw = get("merchant", "vendor", "location", "station", "site", "store", "name");
  const cityRaw = get("city", "locationcity");
  const stateRaw = get("state", "locationstate", "st");
  const driverRaw = get("driver", "drivername", "driverid", "cardname", "cardholder", "employee");
  const truckRaw = get("unit", "truck", "vehicle", "truckid", "unitnumber");
  const cardRaw = get("card", "cardnumber", "cardid", "account");

  const amount = parseFloat(amountRaw.replace(/[$,]/g, "")) || 0;
  const gallons = parseFloat(gallonsRaw.replace(/,/g, "")) || 0;
  const ppg = parseFloat(pricePerGalRaw.replace(/[$,]/g, "")) || (gallons > 0 && amount > 0 ? amount / gallons : 0);

  return {
    category: "fuel",
    amount,
    gallons,
    price_per_gallon: ppg,
    date: parseDateSafe(dateRaw),
    vendor: vendorRaw,
    location_city: cityRaw,
    location_state: stateRaw,
    description: cardRaw ? `Fuel card: ${cardRaw}` : "Fuel card import",
    status: "pending",
    is_reimbursable: false,
    _raw_driver: driverRaw,
    _raw_truck: truckRaw,
  };
}

function parseDateSafe(raw) {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // Try MM/DD/YYYY
  const parts = raw.split(/[/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const attempt = new Date(`${c}-${a.padStart(2,"0")}-${b.padStart(2,"0")}`);
    if (!isNaN(attempt.getTime())) return attempt.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/^["']|["']$/g, "").trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { values.push(cur); cur = ""; }
      else cur += ch;
    }
    values.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || "").replace(/^["']|["']$/g, "").trim(); });
    return obj;
  });
}

export default function FuelCardImport() {
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loads, setLoads] = useState([]);
  const [rows, setRows] = useState([]); // parsed + normalised rows with user mappings
  const [step, setStep] = useState("upload"); // upload | review | importing | done
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    Promise.all([
      base44.entities.Driver.list("-created_date", 100),
      base44.entities.Truck.list("-created_date", 100),
      base44.entities.Load.filter({ status: "in_transit" }, "-created_date", 200)
        .catch(() => base44.entities.Load.list("-created_date", 200)),
    ]).then(([d, t, l]) => {
      setDrivers(d);
      setTrucks(t);
      setLoads(l);
    }).catch(console.error);
  }, []);

  const driverNameMap = Object.fromEntries(
    drivers.map(d => [`${d.first_name} ${d.last_name}`.toLowerCase(), d.id])
  );
  const truckUnitMap = Object.fromEntries(
    trucks.map(t => [String(t.unit_number).toLowerCase(), t.id])
  );

  // Auto-match driver/truck from raw strings
  function autoMatch(norm) {
    let driverId = "";
    let truckId = "";
    if (norm._raw_driver) {
      const key = norm._raw_driver.toLowerCase();
      driverId = driverNameMap[key] || drivers.find(d =>
        d.first_name.toLowerCase().includes(key) || d.last_name.toLowerCase().includes(key)
      )?.id || "";
    }
    if (norm._raw_truck) {
      const key = norm._raw_truck.toLowerCase().replace(/^#/, "");
      truckId = truckUnitMap[key] || trucks.find(t =>
        String(t.unit_number).toLowerCase() === key
      )?.id || "";
      // Also try to find load by truck
      if (!driverId && truckId) {
        const load = loads.find(l => l.truck_id === truckId);
        if (load) driverId = load.driver_id || "";
      }
    }
    return { driverId, truckId };
  }

  const handleFile = async (file) => {
    setError("");
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "txt"].includes(ext)) {
      setError("Please upload a CSV or TXT file.");
      return;
    }
    const text = await file.text();
    let rawRows = parseCSV(text);

    if (rawRows.length === 0) {
      setError("No rows found in the file. Make sure it's a valid CSV with headers.");
      return;
    }

    // If the CSV doesn't look like a standard fuel card format, use AI to parse it
    const hasAmount = rawRows[0] && Object.keys(rawRows[0]).some(k =>
      ["amount","total","cost","price","charge"].some(kw => k.toLowerCase().includes(kw))
    );

    let normed;
    if (!hasAmount && rawRows.length <= 50) {
      setAiParsing(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are parsing a fuel card export CSV. The raw CSV content is:\n\n${text}\n\nExtract each transaction as a JSON array. Each object must have these fields: date (YYYY-MM-DD), amount (number, USD), gallons (number), price_per_gallon (number), vendor (string), location_city (string), location_state (string, 2-letter), driver_name (string), truck_unit (string), card_number (string). If a field is missing use null.`,
          response_json_schema: {
            type: "object",
            properties: {
              transactions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    amount: { type: "number" },
                    gallons: { type: "number" },
                    price_per_gallon: { type: "number" },
                    vendor: { type: "string" },
                    location_city: { type: "string" },
                    location_state: { type: "string" },
                    driver_name: { type: "string" },
                    truck_unit: { type: "string" },
                    card_number: { type: "string" },
                  }
                }
              }
            }
          }
        });
        rawRows = (result.transactions || []).map(t => ({
          Date: t.date || "",
          Amount: t.amount || "",
          Gallons: t.gallons || "",
          "Price Per Gallon": t.price_per_gallon || "",
          Merchant: t.vendor || "",
          City: t.location_city || "",
          State: t.location_state || "",
          Driver: t.driver_name || "",
          Unit: t.truck_unit || "",
          Card: t.card_number || "",
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setAiParsing(false);
      }
    }

    normed = rawRows.map((r, i) => {
      const norm = normaliseRow(r);
      const { driverId, truckId } = autoMatch(norm);
      // Best-guess load: active load for this driver
      const loadId = loads.find(l => l.driver_id === driverId)?.id || "";
      return {
        _id: i,
        ...norm,
        driver_id: driverId,
        truck_id: truckId,
        load_id: loadId,
      };
    });

    setRows(normed);
    setStep("review");
  };

  const updateRow = (idx, field, val) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: val };
      // Auto-fill load when driver changes
      if (field === "driver_id" && val) {
        const match = loads.find(l => l.driver_id === val);
        if (match) updated.load_id = match.id;
      }
      return updated;
    }));
  };

  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const handleImport = async () => {
    setStep("importing");
    let created = 0, failed = 0;
    for (const row of rows) {
      if (!row.amount || row.amount <= 0) { failed++; continue; }
      try {
        const payload = {
          category: "fuel",
          amount: row.amount,
          date: row.date,
          vendor: row.vendor || "Fuel Card",
          description: row.description,
          gallons: row.gallons || undefined,
          price_per_gallon: row.price_per_gallon || undefined,
          location_city: row.location_city || undefined,
          location_state: row.location_state || undefined,
          driver_id: row.driver_id || undefined,
          truck_id: row.truck_id || undefined,
          load_id: row.load_id || undefined,
          status: "pending",
          is_reimbursable: false,
        };
        // Clean undefined
        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
        await base44.entities.Expense.create(payload);
        created++;
      } catch (e) {
        console.error(e);
        failed++;
      }
    }
    setImportResult({ created, failed });
    setStep("done");
  };

  const reset = () => {
    setRows([]);
    setStep("upload");
    setImportResult(null);
    setError("");
  };

  const validRows = rows.filter(r => r.amount > 0);
  const totalAmount = validRows.reduce((s, r) => s + r.amount, 0);
  const totalGallons = validRows.reduce((s, r) => s + (r.gallons || 0), 0);
  const mappedDrivers = validRows.filter(r => r.driver_id).length;
  const mappedLoads = validRows.filter(r => r.load_id).length;

  // ── Upload step ──────────────────────────────────────────────────────────
  if (step === "upload") return (
    <div className="space-y-5">
      <div className="glass-card rounded-xl p-6 border border-white/5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Fuel className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-white font-heading font-semibold">Fuel Card Import</h2>
            <p className="text-slate-400 text-sm">Upload a CSV export from EFS, Comdata, WEX, or any fuel card provider</p>
          </div>
        </div>

        <div
          className="border-2 border-dashed border-white/10 rounded-xl p-10 text-center hover:border-orange-500/30 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        >
          {aiParsing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
              <p className="text-white font-medium">AI is parsing your fuel card format…</p>
              <p className="text-slate-500 text-sm">Detecting columns and extracting transactions</p>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-white font-medium mb-1">Drop your fuel card CSV here</p>
              <p className="text-slate-500 text-sm mb-4">or click to browse · CSV / TXT supported</p>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium">
                <Upload className="w-4 h-4" /> Choose File
              </span>
            </>
          )}
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Format guide */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold text-sm mb-3">Supported Formats</h3>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-slate-400">
          {[
            { name: "EFS / Fleet One", cols: "Date, Amount, Gallons, Driver, Unit, Merchant" },
            { name: "Comdata", cols: "Transaction Date, Total Amount, Quantity, Card Name, Unit #, Vendor" },
            { name: "WEX / Wright Express", cols: "Post Date, Amount, Gallons, Driver Name, Vehicle ID, Merchant" },
          ].map(f => (
            <div key={f.name} className="bg-white/3 rounded-lg p-3 border border-white/5">
              <div className="text-white font-medium mb-1">{f.name}</div>
              <div className="text-slate-500">{f.cols}</div>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-3">Don't see your format? Upload anyway — AI will auto-detect column mappings.</p>
      </div>
    </div>
  );

  // ── Importing step ───────────────────────────────────────────────────────
  if (step === "importing") return (
    <div className="glass-card rounded-xl p-12 border border-white/5 text-center">
      <Loader2 className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
      <p className="text-white font-semibold text-lg">Importing fuel card transactions…</p>
      <p className="text-slate-400 text-sm mt-1">Creating expense records and linking to loads</p>
    </div>
  );

  // ── Done step ────────────────────────────────────────────────────────────
  if (step === "done") return (
    <div className="space-y-5">
      <div className="glass-card rounded-xl p-8 border border-green-500/20 bg-green-500/5 text-center">
        <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
        <h2 className="text-white font-heading font-bold text-xl mb-1">Import Complete</h2>
        <p className="text-slate-400 text-sm mb-5">
          {importResult.created} expense record{importResult.created !== 1 ? "s" : ""} created
          {importResult.failed > 0 && ` · ${importResult.failed} skipped`}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:border-white/20 transition-colors">
            Import Another File
          </button>
          <a href="/finance" className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
            View in Finance →
          </a>
        </div>
      </div>
    </div>
  );

  // ── Review step ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Transactions", value: validRows.length, color: "text-white" },
          { label: "Total Amount", value: `$${totalAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, color: "text-red-400" },
          { label: "Total Gallons", value: Math.round(totalGallons).toLocaleString(), color: "text-orange-400" },
          { label: "Mapped to Loads", value: `${mappedLoads} / ${validRows.length}`, color: mappedLoads === validRows.length ? "text-green-400" : "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4 border border-white/5">
            <div className="text-slate-400 text-xs font-semibold uppercase mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Warning if any rows unmapped */}
      {mappedLoads < validRows.length && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300 text-sm">
            {validRows.length - mappedLoads} row{validRows.length - mappedLoads !== 1 ? "s" : ""} not yet linked to a load. Use the dropdowns below to map them before importing.
          </p>
        </div>
      )}

      {/* Row table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <h3 className="text-white font-semibold text-sm">{rows.length} Rows to Import</h3>
          <button onClick={reset} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">← Back to Upload</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 uppercase tracking-wider">
                {["Date","Vendor / Location","Amount","Gallons","Driver","Truck","Load",""].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, i) => (
                <tr key={i} className={`hover:bg-white/2 transition-colors ${row.amount <= 0 ? "opacity-40" : ""}`}>
                  <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{row.date}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-white font-medium truncate max-w-[160px]">{row.vendor || "—"}</div>
                    {(row.location_city || row.location_state) && (
                      <div className="text-slate-500">{[row.location_city, row.location_state].filter(Boolean).join(", ")}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-red-400 font-bold whitespace-nowrap">${row.amount.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{row.gallons ? row.gallons.toFixed(1) + " gal" : "—"}</td>

                  {/* Driver dropdown */}
                  <td className="px-3 py-2.5 min-w-[140px]">
                    <select value={row.driver_id || ""} onChange={e => updateRow(i, "driver_id", e.target.value)}
                      className={selectClass} style={{ background: "#0F1829" }}>
                      <option value="" style={{ background: "#0F1829" }}>— Unassigned —</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id} style={{ background: "#0F1829" }}>
                          {d.first_name} {d.last_name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Truck dropdown */}
                  <td className="px-3 py-2.5 min-w-[120px]">
                    <select value={row.truck_id || ""} onChange={e => updateRow(i, "truck_id", e.target.value)}
                      className={selectClass} style={{ background: "#0F1829" }}>
                      <option value="" style={{ background: "#0F1829" }}>— No Truck —</option>
                      {trucks.map(t => (
                        <option key={t.id} value={t.id} style={{ background: "#0F1829" }}>
                          #{t.unit_number}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Load dropdown */}
                  <td className="px-3 py-2.5 min-w-[160px]">
                    <select value={row.load_id || ""} onChange={e => updateRow(i, "load_id", e.target.value)}
                      className={`${selectClass} ${row.load_id ? "border-green-500/30" : ""}`} style={{ background: "#0F1829" }}>
                      <option value="" style={{ background: "#0F1829" }}>— No Load —</option>
                      {loads.map(l => (
                        <option key={l.id} value={l.id} style={{ background: "#0F1829" }}>
                          {l.load_number || l.id.slice(-6)} · {l.origin_city} → {l.destination_city}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-2.5">
                    <button onClick={() => removeRow(i)} className="p-1 rounded hover:bg-red-500/15 text-slate-600 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import button */}
      <div className="flex gap-3 pb-4">
        <button onClick={reset} className="px-5 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-medium hover:text-white transition-colors">
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={validRows.length === 0}
          className="flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)", boxShadow: "0 4px 20px rgba(234,88,12,0.25)" }}
        >
          <Fuel className="w-4 h-4" />
          Import {validRows.length} Fuel Transaction{validRows.length !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}