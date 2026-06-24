import { MessageSquare } from "lucide-react";
import DispatcherInbox from "@/components/dispatch/DispatcherInbox";

export default function DispatcherInboxPage() {
  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-orange-400" />
          Driver Messages
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Real-time communication with drivers</p>
      </div>
      <DispatcherInbox />
    </div>
  );
}