import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Bot } from "lucide-react";
import AgentChat from "@/components/agent/AgentChat";

const AGENT_LABELS = {
  admin_assistant: "Admin Assistant",
  dispatcher_assistant: "Dispatcher Assistant",
  driver_assistant: "Driver Assistant",
  customer_assistant: "Customer Assistant",
};

export default function AgentConversation() {
  const { agentName } = useParams();
  const label = AGENT_LABELS[agentName] || "AI Assistant";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center">
            <Bot className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-white font-heading font-bold text-lg">{label}</h1>
            <p className="text-slate-500 text-xs">AI-powered assistant</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 flex-1 overflow-hidden flex flex-col">
        <AgentChat agentName={agentName} />
      </div>
    </div>
  );
}