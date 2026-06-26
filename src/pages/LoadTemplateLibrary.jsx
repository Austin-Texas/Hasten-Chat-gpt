import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Copy, BookTemplate, ArrowRight, ChevronRight, Search, CheckCircle2 } from "lucide-react";
import LoadTemplateManager from "@/components/loads/LoadTemplateManager";
import { createLoadWithWorkflow } from "@/lib/dispatcherWorkflow";

export default function LoadTemplateLibrary() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const records = await base44.entities.LoadTemplate.list("-created_date", 100);
      setTemplates(records || []);
      return records || [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates().catch(console.error); }, []);

  const handleOpen = (template = null) => {
    setEditingTemplate(template);
    setShowForm(true);
    setNotice("");
  };

  const handleSaved = async (savedTemplate) => {
    setShowForm(false);
    setEditingTemplate(null);
    if (savedTemplate?.id) {
      setTemplates(prev => [savedTemplate, ...prev.filter(t => t.id !== savedTemplate.id)]);
      setNotice("Template saved and added to the library.");
    }
    await fetchTemplates();
  };

  const handleCreateFromTemplate = async (template) => {
    try {
      const newLoad = await createLoadWithWorkflow({
        load_number: `LOAD-${Date.now().toString().slice(-8)}`,
        status: "available",
        origin_city: template.origin_city,
        origin_state: template.origin_state,
        origin_address: template.origin_address,
        origin_zip: template.origin_zip,
        destination_city: template.destination_city,
        destination_state: template.destination_state,
        destination_address: template.destination_address,
        destination_zip: template.destination_zip,
        equipment_type: template.equipment_type,
        commodity: template.commodity,
        weight: template.weight,
        miles: template.miles,
        rate: template.rate,
        rate_per_mile: template.rate_per_mile,
        fuel_surcharge: template.fuel_surcharge,
        priority: template.priority,
        special_instructions: template.special_instructions,
      });

      await base44.entities.LoadTemplate.update(template.id, { times_used: (template.times_used || 0) + 1 });
      setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, times_used: (t.times_used || 0) + 1 } : t));
      window.location.href = `/loads/${newLoad.id}`;
    } catch (err) {
      console.error("Failed to create load from template:", err);
      setNotice(err.message || "Failed to create load from template.");
    }
  };

  const filtered = templates.filter(t => {
    const q = search.toLowerCase();
    return !search || (t.name || "").toLowerCase().includes(q) || (t.origin_city || "").toLowerCase().includes(q) || (t.destination_city || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white font-heading font-bold text-2xl">Load Template Library</h1><p className="text-slate-400 text-sm mt-0.5">Save recurring routes for instant load creation</p></div>
        <button onClick={() => handleOpen()} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-950 text-sm bg-green-500 hover:bg-green-400"><Plus className="w-4 h-4" /> New Template</button>
      </div>

      {notice && <div className={`rounded-xl border px-4 py-3 text-sm ${notice.includes("Failed") ? "border-red-500/20 bg-red-500/10 text-red-300" : "border-green-500/20 bg-green-500/10 text-green-300"}`}><CheckCircle2 className="inline w-4 h-4 mr-2" />{notice}</div>}

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" placeholder="Search templates by name, origin, or destination…" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/40 transition-colors" /></div>

      {loading ? (
        <div className="grid lg:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16"><BookTemplate className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400 font-medium">No templates found</p><button onClick={() => handleOpen()} className="text-green-400 text-sm font-medium mt-3 hover:text-green-300 transition-colors">Create your first template →</button></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {filtered.map(template => (
            <div key={template.id} className="glass-card rounded-xl border border-white/5 overflow-hidden hover:border-green-500/15 transition-all group">
              <div className="p-5 space-y-4">
                <div><h3 className="text-white font-semibold text-lg mb-1">{template.name}</h3><div className="flex items-center gap-2 text-sm text-slate-400"><span>{template.origin_city}, {template.origin_state}</span><ArrowRight className="w-3 h-3" /><span>{template.destination_city}, {template.destination_state}</span></div></div>
                <div className="grid grid-cols-3 gap-3 text-xs"><div><div className="text-slate-500">Equipment</div><div className="text-white font-semibold">{template.equipment_type}</div></div><div><div className="text-slate-500">Miles</div><div className="text-white font-semibold">{template.miles || "—"}</div></div><div><div className="text-slate-500">Rate</div><div className="text-green-400 font-semibold">${template.rate || "—"}</div></div></div>
                {template.commodity && <div><div className="text-slate-500 text-xs">Commodity</div><div className="text-white text-sm">{template.commodity}</div></div>}
                <div className="text-xs text-slate-500">Used {template.times_used || 0} time{(template.times_used || 0) !== 1 ? "s" : ""}</div>
                <div className="flex gap-2 pt-2"><button onClick={() => handleCreateFromTemplate(template)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-green-500 text-slate-950 text-sm font-semibold hover:bg-green-400 transition-colors"><Copy className="w-4 h-4" />Create Load</button><button onClick={() => handleOpen(template)} className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold hover:border-white/20 transition-colors" title="Edit template"><ChevronRight className="w-4 h-4" /></button></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <LoadTemplateManager template={editingTemplate} onClose={() => setShowForm(false)} onSaved={handleSaved} />}
    </div>
  );
}
