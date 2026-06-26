import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Loader2, Bot, User as UserIcon, ChevronDown, ChevronUp, Wrench, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";

const AGENT_LABELS = {
  admin_assistant: "Admin Assistant",
  dispatcher_assistant: "Dispatcher Assistant",
  driver_assistant: "Driver Assistant",
  customer_assistant: "Customer Assistant",
};

const COPILOT_PROMPTS = [
  "Which loads risk late delivery today?",
  "Which drivers are available near Dallas?",
  "Which compliance documents expire this week?",
  "Which customers have unpaid invoices?",
  "Which loads are missing POD?",
  "Which settlements are ready for approval?",
  "Which drivers have high detention risk?",
  "Which invoices should be factored?",
];

const TOOL_STATUS_ICON = {
  pending: Clock,
  running: Loader2,
  in_progress: Loader2,
  completed: CheckCircle2,
  success: CheckCircle2,
  failed: AlertCircle,
  error: AlertCircle,
};

function FunctionDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const rawStatus = toolCall.status || "pending";
  const isFailed = ["failed", "error"].includes(rawStatus) ||
    (toolCall.results && typeof toolCall.results === "string" && /error|failed/i.test(toolCall.results));
  const status = isFailed ? "failed" : rawStatus;
  const Icon = TOOL_STATUS_ICON[status] || Clock;
  const isRunning = ["pending", "running", "in_progress"].includes(status);

  const projection = toolCall.display_projection || {};
  const hideDetails = projection.hide_details && projection.details_redacted;
  const statusLabel = isRunning
    ? (projection.active_label || "Working...")
    : isFailed
      ? (projection.error_label || "Failed")
      : (projection.label || "Completed");

  let parsedArgs = toolCall.arguments_string;
  try { parsedArgs = JSON.parse(toolCall.arguments_string); } catch { /* keep raw */ }

  let parsedResults = toolCall.results;
  if (typeof parsedResults === "string") {
    try { parsedResults = JSON.parse(parsedResults); } catch { /* keep raw */ }
  }

  const fnName = toolCall.name?.replace(/_/g, " ") || "tool";

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => !hideDetails && setExpanded(!expanded)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors ${
          isFailed
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : isRunning
              ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
              : "bg-green-500/10 border-green-500/20 text-green-400"
        }`}
      >
        <Icon className={`w-3 h-3 ${isRunning ? "animate-spin" : ""}`} />
        <span className="font-medium capitalize">{fnName}</span>
        <span className="opacity-70">— {statusLabel}</span>
        {!hideDetails && (expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />)}
      </button>
      {expanded && !hideDetails && (
        <div className="mt-1.5 space-y-1.5 pl-2 border-l border-white/10">
          {parsedArgs && (
            <div>
              <span className="text-slate-500 font-semibold">Parameters:</span>
              <pre className="mt-0.5 p-1.5 bg-black/30 rounded text-[10px] overflow-x-auto text-slate-300">
                {JSON.stringify(parsedArgs, null, 2)}
              </pre>
            </div>
          )}
          {parsedResults != null && (
            <div>
              <span className="text-slate-500 font-semibold">Result:</span>
              <pre className="mt-0.5 p-1.5 bg-black/30 rounded text-[10px] overflow-x-auto text-slate-300">
                {typeof parsedResults === "string" ? parsedResults : JSON.stringify(parsedResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-green-500/15 border border-green-500/25 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-green-400" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
        isUser
          ? "bg-green-500 text-black rounded-br-sm"
          : "glass-card text-slate-200 border border-white/5 rounded-bl-sm"
      }`}>
        {message.content && (
          isUser
            ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            : <ReactMarkdown className="text-sm prose prose-sm prose-invert max-w-none [&_p]:mb-1 [&_ul]:mb-1 [&_ol]:mb-1">{message.content}</ReactMarkdown>
        )}
        {message.tool_calls?.map((tc, idx) => <FunctionDisplay key={idx} toolCall={tc} />)}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-4 h-4 text-slate-400" />
        </div>
      )}
    </div>
  );
}

export default function AgentChat({ agentName }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const agentLabel = AGENT_LABELS[agentName] || agentName;

  useEffect(() => {
    const init = async () => {
      try {
        const existing = await base44.agents.listConversations({ agent_name: agentName });
        if (existing && existing.length > 0) {
          const conv = await base44.agents.getConversation(existing[0].id);
          setConversation(conv);
          setMessages(conv.messages || []);
        } else {
          const conv = await base44.agents.createConversation({
            agent_name: agentName,
            metadata: { name: `${agentLabel} Chat`, description: `Conversation with ${agentLabel}` },
          });
          setConversation(conv);
          setMessages([]);
        }
      } catch (err) {
        console.error("Agent init error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [agentName]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendContent = async (content) => {
    if (!content.trim() || sending || !conversation) return;
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: content.trim() });
    } catch (err) {
      console.error("Send error:", err);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    const content = input.trim();
    setInput("");
    await sendContent(content);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Connecting to {agentLabel}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-white/5 px-4 py-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Enterprise Copilot Prompts</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {COPILOT_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendContent(prompt)}
              disabled={sending || !conversation}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:border-green-500/30 hover:text-green-300 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <Bot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-medium text-sm">{agentLabel}</p>
            <p className="text-slate-500 text-xs mt-1">Ask for operational risk, available drivers, compliance expirations, unpaid invoices, missing PODs, settlement readiness, detention risk, factoring candidates, reports, or action suggestions.</p>
          </div>
        )}
        {messages.map((msg, idx) => <MessageBubble key={msg.id || idx} message={msg} />)}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 px-4 pb-3 pt-2 border-t border-white/5 flex-shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder={`Message ${agentLabel}...`}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500/40 transition-colors"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0 bg-green-500 hover:bg-green-600"
        >
          {sending ? <Loader2 className="w-4 h-4 text-black animate-spin" /> : <Send className="w-4 h-4 text-black" />}
        </button>
      </div>
    </div>
  );
}
