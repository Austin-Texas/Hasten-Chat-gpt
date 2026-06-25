import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Database, Loader2, PackagePlus, RefreshCw, Trash2 } from "lucide-react";
import { demoSeedPhases, getPhaseRecordCount } from "@/lib/demoSeedData";

const SEEDED_KEY = "hasten_demo_seeded_phases";

function readSeeded() {
  try {
    return JSON.parse(localStorage.getItem(SEEDED_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeSeeded(values) {
  localStorage.setItem(SEEDED_KEY, JSON.stringify(values));
}

export default function DemoDataCenter() {
  const [seeded, setSeeded] = useState(() => readSeeded());
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState("");

  const totalRecords = useMemo(() => demoSeedPhases.reduce((sum, phase) => sum + getPhaseRecordCount(phase), 0), []);

  const seedPhase = async (phase) => {
    setWorking(phase.key);
    setNotice("");
    try {
      for (const [entityName, records] of Object.entries(phase.records)) {
        for (const record of records) {
          await base44.entities[entityName].create(record);
        }
      }
      const nextSeeded = [...new Set([...seeded, phase.key])];
      writeSeeded(nextSeeded);
      setSeeded(nextSeeded);
      setNotice(`${phase.title} seeded successfully.`);
    } catch (error) {
      console.error(error);
      setNotice(`Could not seed ${phase.title}. Check Base44 entity names/fields.`);
    } finally {
      setWorking("");
    }
  };

  const seedAll = async () => {
    setWorking("all");
    setNotice("");
    try {
      for (const phase of demoSeedPhases) {
        for (const [entityName, records] of Object.entries(phase.records)) {
          for (const record of records) {
            await base44.entities[entityName].create(record);
          }
        }
      }
      const allKeys = demoSeedPhases.map((phase) => phase.key);
      writeSeeded(allKeys);
      setSeeded(allKeys);
      setNotice("All demo phases seeded successfully.");
    } catch (error) {
      console.error(error);
      setNotice("Could not seed all phases. Check Base44 entity names/fields.");
    } finally {
      setWorking("");
    }
  };

  const resetSeededMarkers = () => {
    localStorage.removeItem(SEEDED_KEY);
    setSeeded([]);
    setNotice("Seed markers reset. Existing Base44 records were not deleted.");
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white font-heading">
            <Database className="h-6 w-6 text-green-400" /> Demo Data Center
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Seed safe example data by phase so every workflow has records to test before moving forward.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={seedAll} disabled={Boolean(working)} className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-60">
            {working === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />} Seed All {totalRecords}
          </button>
          <button onClick={resetSeededMarkers} disabled={Boolean(working)} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white disabled:opacity-60">
            <RefreshCw className="h-4 w-4" /> Reset Markers
          </button>
        </div>
      </div>

      {notice && <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">{notice}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        {demoSeedPhases.map((phase, index) => {
          const isSeeded = seeded.includes(phase.key);
          const recordCount = getPhaseRecordCount(phase);
          return (
            <div key={phase.key} className="glass-card flex flex-col rounded-xl border border-white/5 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-green-400">Step {index + 1}</div>
                  <h2 className="mt-1 text-lg font-bold text-white">{phase.title}</h2>
                </div>
                {isSeeded ? (
                  <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-300">
                    Seeded
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-2 py-1 text-[10px] font-bold text-slate-400">
                    Ready
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-400">{phase.description}</p>

              <div className="mt-4 space-y-2 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                {Object.entries(phase.records).map(([entityName, records]) => (
                  <div key={entityName} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{entityName}</span>
                    <span className="font-bold text-white">{records.length}</span>
                  </div>
                ))}
                <div className="border-t border-white/5 pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold text-green-300">{recordCount}</span>
                </div>
              </div>

              <button onClick={() => seedPhase(phase)} disabled={Boolean(working)} className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-green-500/25 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-300 hover:bg-green-500/15 disabled:opacity-60">
                {working === phase.key ? <Loader2 className="h-4 w-4 animate-spin" /> : isSeeded ? <CheckCircle className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
                {isSeeded ? "Seed Again" : "Seed This Phase"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="glass-card rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
        <div className="flex gap-3">
          <Trash2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold text-amber-300">Safe test data note</h3>
            <p className="mt-1 text-sm text-slate-300">
              This page only creates demo operational records. It does not create user passwords, does not delete production data, and Reset Markers only resets the local seeded checklist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
