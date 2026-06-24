import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Truck, MapPin, Package, Calendar, Mail, Phone, Building2, Check, Loader2 } from "lucide-react";

export default function QuoteRequest() {
  const [formData, setFormData] = useState({
    requester_name: "",
    requester_email: "",
    requester_phone: "",
    company_name: "",
    origin_city: "",
    origin_state: "",
    origin_zip: "",
    destination_city: "",
    destination_state: "",
    destination_zip: "",
    pickup_date: "",
    delivery_date: "",
    equipment_type: "",
    commodity: "",
    weight: "",
    pieces: "",
    is_hazmat: false,
    special_requirements: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.QuoteRequest.create({
        ...formData,
        status: "pending",
        weight: parseFloat(formData.weight) || null,
        pieces: parseInt(formData.pieces) || null,
      });
      setSuccess(true);
      setFormData({
        requester_name: "",
        requester_email: "",
        requester_phone: "",
        company_name: "",
        origin_city: "",
        origin_state: "",
        origin_zip: "",
        destination_city: "",
        destination_state: "",
        destination_zip: "",
        pickup_date: "",
        delivery_date: "",
        equipment_type: "",
        commodity: "",
        weight: "",
        pieces: "",
        is_hazmat: false,
        special_requirements: "",
      });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const EQUIPMENT_OPTIONS = ["Dry Van", "Flatbed", "Reefer", "Step Deck", "Lowboy", "Box Truck", "Tanker", "Hotshot"];
  const STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-white font-heading font-bold text-3xl mb-2">Request a Quote</h1>
          <p className="text-slate-400">Get a shipping quote in minutes. Fill out the form below and we'll provide a competitive rate.</p>
        </div>

        {success && (
          <div className="mb-6 glass-card rounded-xl p-4 border border-green-500/20 bg-green-500/5 animate-slide-up">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-green-400 font-semibold">Quote request submitted!</div>
                <p className="text-slate-400 text-sm mt-1">We'll review your request and send a quote to {formData.requester_email} shortly.</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card rounded-xl border border-white/10 p-6 space-y-6">
          {/* Requester Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-orange-400" />
              <h2 className="text-white font-semibold">Contact Information</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <input type="text" name="requester_name" placeholder="Your Name *" value={formData.requester_name} onChange={handleChange} required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
              <input type="email" name="requester_email" placeholder="Email *" value={formData.requester_email} onChange={handleChange} required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <input type="tel" name="requester_phone" placeholder="Phone Number *" value={formData.requester_phone} onChange={handleChange} required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
              <input type="text" name="company_name" placeholder="Company Name"
                value={formData.company_name} onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
          </div>

          {/* Pickup Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-orange-400" />
              <h2 className="text-white font-semibold">Pickup Location</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <input type="text" name="origin_city" placeholder="City *" value={formData.origin_city} onChange={handleChange} required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
              <select name="origin_state" value={formData.origin_state} onChange={handleChange} required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
                style={{ background: "#0F1829" }}>
                <option value="">State *</option>
                {STATES.map(s => <option key={s} value={s} style={{ background: "#0F1829" }}>{s}</option>)}
              </select>
              <input type="text" name="origin_zip" placeholder="ZIP Code" value={formData.origin_zip} onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
          </div>

          {/* Delivery Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-orange-400" />
              <h2 className="text-white font-semibold">Delivery Location</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <input type="text" name="destination_city" placeholder="City *" value={formData.destination_city} onChange={handleChange} required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
              <select name="destination_state" value={formData.destination_state} onChange={handleChange} required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
                style={{ background: "#0F1829" }}>
                <option value="">State *</option>
                {STATES.map(s => <option key={s} value={s} style={{ background: "#0F1829" }}>{s}</option>)}
              </select>
              <input type="text" name="destination_zip" placeholder="ZIP Code" value={formData.destination_zip} onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-orange-400" />
              <h2 className="text-white font-semibold">Dates</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <input type="date" name="pickup_date" value={formData.pickup_date} onChange={handleChange} required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
                style={{ colorScheme: "dark" }} />
              <input type="date" name="delivery_date" value={formData.delivery_date} onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
                style={{ colorScheme: "dark" }} />
            </div>
          </div>

          {/* Cargo Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-orange-400" />
              <h2 className="text-white font-semibold">Cargo Details</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <select name="equipment_type" value={formData.equipment_type} onChange={handleChange} required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
                style={{ background: "#0F1829" }}>
                <option value="">Equipment Type *</option>
                {EQUIPMENT_OPTIONS.map(e => <option key={e} value={e} style={{ background: "#0F1829" }}>{e}</option>)}
              </select>
              <input type="text" name="commodity" placeholder="Commodity / Product Type"
                value={formData.commodity} onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <input type="number" name="weight" placeholder="Weight (lbs)" value={formData.weight} onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
              <input type="number" name="pieces" placeholder="Number of Pieces" value={formData.pieces} onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
            </div>
            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
              <input type="checkbox" name="is_hazmat" checked={formData.is_hazmat} onChange={handleChange} className="w-4 h-4 rounded cursor-pointer accent-orange-500" />
              <span>HAZMAT cargo</span>
            </label>
            <textarea name="special_requirements" placeholder="Special requirements or instructions (optional)"
              value={formData.special_requirements} onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              rows="4" />
          </div>

          {/* Submit */}
          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {submitting ? "Submitting…" : "Request Quote"}
          </button>

          <p className="text-slate-500 text-xs text-center">We'll respond within 24 hours with a competitive quote.</p>
        </form>
      </div>
    </div>
  );
}