import { AlertCircle } from "lucide-react";

export default function MobileEmptyState({ title = "Nothing here yet", message = "Check back later.", icon: Icon = AlertCircle }) {
  return (
    <div className="glass-card rounded-xl border border-white/5 p-10 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-slate-600" />
      <p className="font-medium text-slate-300">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}
