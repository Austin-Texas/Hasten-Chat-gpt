import { Plus, AlertCircle } from "lucide-react";

export default function ClientBooking({ client, user }) {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Book a Load</h1>
        <p className="text-slate-400 text-sm mt-0.5">Request a new shipment</p>
      </div>

      <div className="glass-card rounded-xl border border-amber-500/25 bg-amber-500/5 p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-300 font-semibold">Coming Soon</h3>
            <p className="text-amber-200 text-sm mt-1">
              The load booking system is currently being developed. Please contact our sales team at sales@hasten.io to request a quote.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}