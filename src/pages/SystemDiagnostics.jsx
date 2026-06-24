import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, Play, CheckCircle, AlertCircle, XCircle, Loader2 } from "lucide-react";

export default function SystemDiagnostics() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const result = await base44.entities.SystemDiagnosticRun.list("-created_date", 50);
      setRuns(result);
    } catch (err) {
      console.error("Failed to fetch diagnostic runs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setRunning(true);
    try {
      const result = await base44.functions.invoke("runSystemDiagnostics", {});
      await fetchRuns();
      if (result.data?.run_id) {
        setSelectedRunId(result.data.run_id);
        await fetchIssuesForRun(result.data.run_id);
      }
    } catch (err) {
      console.error("Failed to run diagnostics:", err);
    } finally {
      setRunning(false);
    }
  };

  const fetchIssuesForRun = async (runId) => {
    try {
      const result = await base44.entities.SystemDiagnosticIssue.filter({ diagnostic_run_id: runId }, "-created_date", 100);
      setIssues(result);
    } catch (err) {
      console.error("Failed to fetch issues:", err);
    }
  };

  const handleSelectRun = async (runId) => {
    setSelectedRunId(runId);
    await fetchIssuesForRun(runId);
  };

  const statusIcon = {
    completed: <CheckCircle className="w-4 h-4 text-green-400" />,
    running: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
    pending: <Activity className="w-4 h-4 text-slate-400" />,
  };

  const severityColor = {
    critical: "text-red-400 bg-red-500/10",
    high: "text-orange-400 bg-orange-500/10",
    medium: "text-amber-400 bg-amber-500/10",
    low: "text-blue-400 bg-blue-500/10",
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" /> System Diagnostics
          </h1>
          <p className="text-slate-400 text-sm mt-1">Monitor system health, API status, database connectivity</p>
        </div>
        <button
          onClick={handleRunDiagnostics}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 transition-all"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "Running…" : "Run Diagnostics"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="lg:col-span-3 text-center py-8">
            <Loader2 className="w-8 h-8 text-slate-600 mx-auto animate-spin" />
            <p className="text-slate-400 mt-2">Loading diagnostic history...</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="lg:col-span-3 text-center py-8">
            <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No diagnostic runs yet</p>
          </div>
        ) : (
          <>
            <div className="lg:col-span-1 space-y-2">
              <h3 className="text-sm font-semibold text-slate-300 uppercase">Recent Runs</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {runs.map(run => (
                  <button
                    key={run.id}
                    onClick={() => handleSelectRun(run.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                      selectedRunId === run.id
                        ? "bg-blue-500/20 border border-blue-500/40"
                        : "bg-white/3 border border-white/5 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon[run.status]}
                      <span className="text-xs text-slate-400 capitalize">{run.status}</span>
                    </div>
                    <p className="text-xs text-slate-300">{new Date(run.created_date).toLocaleString()}</p>
                    {run.issue_count > 0 && (
                      <p className="text-xs text-red-400 mt-1">{run.issue_count} issue{run.issue_count !== 1 ? "s" : ""}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedRunId ? (
                <div className="space-y-4">
                  <div className="glass-card rounded-lg p-4 border border-white/5">
                    <h3 className="text-sm font-semibold text-white mb-2">Run Summary</h3>
                    {runs.find(r => r.id === selectedRunId) && (
                      <div className="space-y-1.5 text-xs text-slate-400">
                        <p>
                          <span className="text-slate-300">Status:</span>{" "}
                          <span className="capitalize">{runs.find(r => r.id === selectedRunId)?.status}</span>
                        </p>
                        <p>
                          <span className="text-slate-300">Issues:</span> {runs.find(r => r.id === selectedRunId)?.issue_count || 0}
                        </p>
                        <p>
                          <span className="text-slate-300">Warnings:</span> {runs.find(r => r.id === selectedRunId)?.warning_count || 0}
                        </p>
                        <p>
                          <span className="text-slate-300">Duration:</span> {runs.find(r => r.id === selectedRunId)?.duration_ms || "—"}ms
                        </p>
                      </div>
                    )}
                  </div>

                  {issues.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-white">Issues & Warnings</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {issues.map(issue => (
                          <div key={issue.id} className={`glass-card rounded-lg p-3 border border-white/5 ${severityColor[issue.severity]}`}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1">
                                <p className="text-xs font-semibold">{issue.title}</p>
                                <p className="text-xs opacity-80">{issue.module}</p>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded bg-white/10 capitalize">
                                {issue.issue_type}
                              </span>
                            </div>
                            {issue.description && <p className="text-xs opacity-75 mb-1">{issue.description}</p>}
                            {issue.recommendation && <p className="text-xs opacity-70"><strong>Recommendation:</strong> {issue.recommendation}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="glass-card rounded-lg p-8 border border-green-500/20 bg-green-500/5 text-center">
                      <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                      <p className="text-green-300 font-medium">All systems operational</p>
                      <p className="text-slate-400 text-xs mt-1">No issues detected in this run</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-card rounded-lg p-8 border border-white/5 text-center">
                  <Activity className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400">Select a run to view details</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}