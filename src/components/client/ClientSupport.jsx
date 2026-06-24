import { Mail, Phone, MessageSquare, ExternalLink } from "lucide-react";

export default function ClientSupport({ client, user }) {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Support</h1>
        <p className="text-slate-400 text-sm mt-0.5">Get help with your shipments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl border border-white/5 p-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center mb-4">
            <Mail className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">Email Support</h3>
          <p className="text-slate-400 text-sm mb-4">Our team responds within 2 hours</p>
          <a
            href="mailto:support@hasten.io"
            className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm font-medium"
          >
            support@hasten.io
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="glass-card rounded-xl border border-white/5 p-6">
          <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center mb-4">
            <Phone className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">Phone Support</h3>
          <p className="text-slate-400 text-sm mb-4">Mon-Fri, 8 AM - 5 PM EST</p>
          <a
            href="tel:+1-800-HASTEN-1"
            className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm font-medium"
          >
            +1 (800) HASTEN-1
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="glass-card rounded-xl border border-white/5 p-6">
          <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center mb-4">
            <MessageSquare className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">Live Chat</h3>
          <p className="text-slate-400 text-sm mb-4">Available 24/7 for urgent issues</p>
          <button className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm font-medium">
            Start Chat
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-white/5 p-6">
        <h3 className="text-white font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {[
            "How do I track my shipment in real-time?",
            "What payment methods do you accept?",
            "Can I modify a shipment after booking?",
            "What's your on-time delivery rate?",
            "Do you offer insurance coverage?",
          ].map((q, i) => (
            <div key={i} className="p-3 rounded-lg bg-white/2 hover:bg-white/4 transition-colors cursor-pointer">
              <p className="text-slate-300 text-sm">{q}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}