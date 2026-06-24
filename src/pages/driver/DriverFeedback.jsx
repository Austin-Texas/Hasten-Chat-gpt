import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Star, Send, CheckCircle, Loader2, Paperclip, X
} from "lucide-react";
import CameraUpload from "@/components/driver/CameraUpload";

const CATEGORIES = [
  { value: "tracking",  label: "📍 Tracking & Maps" },
  { value: "billing",   label: "💰 Pay & Earnings" },
  { value: "dispatch",  label: "📋 Dispatch & Loads" },
  { value: "driver",    label: "👤 Driver Profile" },
  { value: "technical", label: "🛠 App Bug / Crash" },
  { value: "other",     label: "💬 General Feedback" },
];

export default function DriverFeedback({ user }) {
  const navigate = useNavigate();
  const [driver, setDriver]       = useState(null);
  const [form, setForm]           = useState({ subject: "", category: "other", message: "", attachment_url: "" });
  const [rating, setRating]       = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]  = useState(false);
  const [error, setError]          = useState("");

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1)
      .then(drivers => { if (drivers.length) setDriver(drivers[0]); })
      .catch(console.error);
  }, [user?.id]);

  const handleSubmit = async () => {
    if (!form.message.trim()) { setError("Please write a message before submitting."); return; }
    setSubmitting(true);
    setError("");
    try {
      const subject = form.subject.trim() || `Driver Feedback — ${CATEGORIES.find(c => c.value === form.category)?.label}`;

      // Save to SupportTicket entity
      await base44.entities.SupportTicket.create({
        ticket_number: `FB-${Date.now().toString().slice(-6)}`,
        status: "open",
        priority: "low",
        category: form.category,
        subject,
        description: `${rating ? `Rating: ${"★".repeat(rating)}${"☆".repeat(5 - rating)}\n\n` : ""}${form.message}`,
        requester_id: user?.id || "",
        requester_name: driver ? `${driver.first_name} ${driver.last_name}` : user?.full_name || "",
        requester_email: driver?.email || user?.email || "",
      });

      // Manifest audit
      await base44.entities.Manifest.create({
        load_id: "no-load",
        event_type: "note_added",
        event_title: "Driver Feedback Submitted",
        event_description: subject,
        event_timestamp: new Date().toISOString(),
        performed_by: driver ? `${driver.first_name} ${driver.last_name}` : user?.full_name || "",
        performed_by_role: "driver",
        is_system_event: true,
        attachment_url: form.attachment_url || undefined,
      }).catch(() => {});

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] pb-28 px-6 text-center animate-slide-up">
        <div className="w-20 h-20 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Thank You!</h2>
        <p className="text-slate-400 text-sm mb-8">Your feedback has been submitted and will be reviewed by the HASTEN team.</p>
        <button
          onClick={() => navigate("/driver/profile")}
          className="px-8 py-3 rounded-2xl font-bold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
        >
          Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-2">
        <button onClick={() => navigate("/driver/profile")} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">App Feedback</h1>
        <div className="w-9" />
      </div>

      {/* Star rating */}
      <div className="glass-card rounded-2xl border border-white/5 p-5 text-center">
        <p className="text-slate-400 text-sm mb-4">How would you rate your experience?</p>
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="transition-transform active:scale-90"
            >
              <Star
                className={`w-9 h-9 transition-colors ${
                  star <= (hoveredStar || rating)
                    ? "text-amber-400 fill-amber-400"
                    : "text-slate-700"
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-slate-500 text-xs mt-3">
            {rating === 5 ? "Excellent! 🎉" : rating === 4 ? "Great! 👍" : rating === 3 ? "OK 👌" : rating === 2 ? "Needs improvement 🤔" : "Poor experience 😕"}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="glass-card rounded-2xl border border-white/5 p-5">
        <h3 className="text-white font-semibold text-sm mb-3">Category</h3>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setForm(f => ({ ...f, category: cat.value }))}
              className={`p-3 rounded-xl border text-sm font-medium text-left transition-all active:scale-95 ${
                form.category === cat.value
                  ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
                  : "border-white/5 bg-white/3 text-slate-400 hover:bg-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div className="glass-card rounded-2xl border border-white/5 p-5">
        <h3 className="text-white font-semibold text-sm mb-3">Subject <span className="text-slate-600">(optional)</span></h3>
        <input
          type="text"
          value={form.subject}
          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
          placeholder="Brief summary of your feedback"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors"
        />
      </div>

      {/* Message */}
      <div className="glass-card rounded-2xl border border-white/5 p-5">
        <h3 className="text-white font-semibold text-sm mb-3">Message <span className="text-red-400">*</span></h3>
        <textarea
          value={form.message}
          onChange={e => { setForm(f => ({ ...f, message: e.target.value })); setError(""); }}
          placeholder="Describe your feedback, suggestion, or issue in detail..."
          rows={5}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors resize-none"
        />
        <div className="text-slate-600 text-xs mt-1.5 text-right">{form.message.length} chars</div>
      </div>

      {/* Screenshot upload */}
      <div className="glass-card rounded-2xl border border-white/5 p-5">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-slate-400" />
          Screenshot <span className="text-slate-600">(optional)</span>
        </h3>
        {form.attachment_url ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
            <img src={form.attachment_url} alt="Screenshot" className="w-full h-full object-cover" />
            <button
              onClick={() => setForm(f => ({ ...f, attachment_url: "" }))}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <CameraUpload
            label="Attach Screenshot"
            accept="image/*"
            docType="feedback_screenshot"
            onUploaded={(url) => setForm(f => ({ ...f, attachment_url: url }))}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !form.message.trim()}
        className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg, #EA580C, #F97316)", boxShadow: "0 4px 20px rgba(234,88,12,0.3)" }}
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit Feedback</>}
      </button>
    </div>
  );
}