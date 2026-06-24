import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { BookTemplate, Plus, Zap, Edit2, Trash2, ArrowRight, MapPin, Truck } from "lucide-react";
import LoadTemplateModal from "@/components/hasten/LoadTemplateModal";

export default function LoadTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [creating, setCreating] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      const data = await base44.entities.LoadTemplate.list("-times_used", 100);
      setTemplates(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreateLoad = async (template) => {
    setCreating(template.id);
    try {
      // Generate a load number
      const loadNumber = `LD-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      const newLoad = await base44.entities.Load.create({
        load_number: loadNumber,
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
      // Increment usage counter
      await base44.entities.LoadTemplate.update(template.id, { times_used: (template.times_used || 0) + 1 });
      navigate(`/loads/${newLoad.id}`);
    } catch (err) {
      console.error(err);
      setCreating(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    try {
      await base44.entities.LoadTemplate.delete(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error(err); }
  };

  const openEdit = (template) => { setEditTemplate(template); setShowModal(true); };
  const openNew = () => { setEditTemplate(null); setShowModal(true); };
  const handleSaved = () => { setShowModal(false); setEditTemplate(null); fetchTemplates(); };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Load Templates</h1>
          <p className="text-slate-400 text-sm mt-0.5">Save repeat routes and generate loads instantly</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-48 rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <BookTemplate className="w-8 h-8 text-orange-400" />
          </div>
          <p className="text-white font-medium text-lg mb-1">No templates yet</p>
          <p className="text-slate-500 text-sm mb-6">Save your first repeat route to generate loads in one click</p>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white text-sm"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
            <Plus className="w-4 h-4" /> Create First Template
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div key={template.id} className="glass-card rounded-xl p-5 border border-white/5 hover:border-orange-500/15 transition-all duration-150 flex flex-col">
              {/* Name + usage */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <h3 className="text-white font-semibold truncate">{template.name}</h3>
                  <span className="text-slate-500 text-xs">{template.times_used || 0} uses</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(template)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors" aria-label="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(template.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-colors" aria-label="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-slate-300 text-sm font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{template.origin_city}, {template.origin_state}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-end gap-1 text-slate-300 text-sm font-medium">
                    <span className="truncate">{template.destination_city}, {template.destination_state}</span>
                    <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-5">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3 h-3" />
                  <span>{template.equipment_type}</span>
                </div>
                {template.miles && <div>{template.miles} mi</div>}
                {template.weight && <div>{(template.weight / 1000).toFixed(0)}k lbs</div>}
                {template.rate && <div className="text-green-400 font-medium">${template.rate.toLocaleString()}</div>}
                {template.commodity && <div className="col-span-2 truncate">{template.commodity}</div>}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleCreateLoad(template)}
                disabled={creating === template.id}
                className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60 transition-all duration-150"
                style={{ background: "linear-gradient(135deg, #EA580C, #F97316)", boxShadow: "0 4px 16px rgba(234,88,12,0.2)" }}
              >
                {creating === template.id
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Zap className="w-4 h-4" />
                }
                {creating === template.id ? "Creating…" : "Create Load"}
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <LoadTemplateModal
          template={editTemplate}
          onClose={() => { setShowModal(false); setEditTemplate(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}