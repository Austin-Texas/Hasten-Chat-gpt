import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Phone, MapPin, FileText, Plus, X, Check } from "lucide-react";

export default function DriverEmergencyCenter({ user }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    incident_type: "breakdown",
    title: "",
    description: "",
    location: "",
    witness_names: "",
    severity: "medium",
  });

  useEffect(() => {
    if (!user?.id) return;
    const driver = base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1)
      .then(d => d[0]?.id)
      .catch(() => null);
    
    driver.then(driverId => {
      if (!driverId) {
        setLoading(false);
        return;
      }
      base44.entities.IncidentReport.filter({ driver_id: driverId }, "-created_date", 50)
        .then(setIncidents)
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    
    const driver = await base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1)
      .catch(() => []);
    if (!driver[0]) return;

    try {
      await base44.entities.IncidentReport.create({
        ...formData,
        driver_id: driver[0].id,
        reported_by: user.id,
        reported_at: new Date().toISOString(),
        incident_time: new Date().toISOString(),
      });
      setFormData({ incident_type: "breakdown", title: "", description: "", location: "", witness_names: "", severity: "medium" });
      setShowForm(false);
      const updated = await base44.entities.IncidentReport.filter({ driver_id: driver[0].id }, "-created_date", 50);
      setIncidents(updated);
    } catch (err) {
      console.error("Failed to report incident:", err);
    }
  };

  const severityColor = {
    low: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    critical: "bg-red-500/15 text-red-400 border-red-500/25",
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-400" /> Emergency Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">Report incidents, breakdowns, accidents</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 transition-all"
        >
          <Plus className="w-4 h-4" /> Report Incident
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-xl border border-orange-500/20 p-5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Incident Type</label>
              <select
                value={formData.incident_type}
                onChange={e => setFormData({ ...formData, incident_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40"
              >
                <option value="breakdown">Breakdown</option>
                <option value="accident">Accident</option>
                <option value="mechanical_failure">Mechanical Failure</option>
                <option value="safety_violation">Safety Violation</option>
                <option value="weather_incident">Weather Incident</option>
                <option value="injury">Injury</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief incident title"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-orange-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Description</label>
              <textarea
                required
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details of what happened"
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-orange-500/40 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, state"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-orange-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Severity</label>
                <select
                  value={formData.severity}
                  onChange={e => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Witness Names (optional)</label>
              <input
                type="text"
                value={formData.witness_names}
                onChange={e => setFormData({ ...formData, witness_names: e.target.value })}
                placeholder="Names of any witnesses"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-orange-500/40"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors">
                <Check className="w-4 h-4 inline mr-2" /> Submit Report
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg font-medium text-slate-300 bg-white/5 hover:bg-white/10 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No incidents reported yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map(incident => (
            <div key={incident.id} className="glass-card rounded-lg p-4 border border-white/5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white">{incident.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded border ${severityColor[incident.severity]}`}>
                      {incident.severity}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs capitalize">{incident.incident_type.replace(/_/g, " ")}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${incident.status === "resolved" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>
                  {incident.status}
                </span>
              </div>
              <p className="text-slate-300 text-sm mb-2">{incident.description}</p>
              {incident.location && (
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <MapPin className="w-3 h-3" /> {incident.location}
                </div>
              )}
              {incident.resolution_notes && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <p className="text-xs text-slate-400"><strong>Resolution:</strong> {incident.resolution_notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}