import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, MessageSquare, Truck, ChevronDown } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

const ACTIVE_STATUSES = ["assigned","accepted","en_route","arrived_pickup","loaded","in_transit","arrived_delivery"];

export default function DriverMessages({ user }) {
  const [loads, setLoads]           = useState([]);
  const [activeLoad, setActiveLoad] = useState(null);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [sending, setSending]       = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const bottomRef = useRef(null);

  // Read optional ?load_id= deep-link param
  const deepLoadId = new URLSearchParams(window.location.search).get("load_id");

  // Fetch driver's active loads
  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Load.filter({ driver_id: user.id }, "-created_date", 30)
      .then(data => {
        // Include active + recently completed so deep-link always works
        setLoads(data.filter(l => ACTIVE_STATUSES.includes(l.status) || l.id === deepLoadId));
        const target = deepLoadId
          ? data.find(l => l.id === deepLoadId)
          : data.find(l => ACTIVE_STATUSES.includes(l.status));
        if (target) setActiveLoad(target);
      })
      .catch(console.error);
  }, [user?.id]);

  const convId = activeLoad ? `load_${activeLoad.id}` : null;

  // Real-time subscription for active conversation
  useEffect(() => {
    if (!convId) return;

    // Initial fetch
    base44.entities.Message.filter({ conversation_id: convId }, "created_date", 100)
      .then(data => {
        setMessages(data);
        data.filter(m => !m.is_read && m.sender_id !== user?.id)
            .forEach(m => base44.entities.Message.update(m.id, { is_read: true }).catch(() => {}));
      })
      .catch(console.error);

    // Live subscribe
    const unsub = base44.entities.Message.subscribe((event) => {
      if (!event.data || event.data.conversation_id !== convId) return;
      if (event.type === "create") {
        setMessages(prev => {
          if (prev.find(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
        if (event.data.sender_id !== user?.id) {
          base44.entities.Message.update(event.data.id, { is_read: true }).catch(() => {});
        }
      }
    });

    return () => unsub();
  }, [convId, user?.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending || !activeLoad) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      await base44.entities.Message.create({
        conversation_id: convId,
        load_id: activeLoad.id,
        sender_id: user?.id,
        sender_name: user?.full_name || "Driver",
        sender_role: "driver",
        content,
        message_type: "text",
        is_read: false,
      });
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const selectLoad = (l) => {
    setActiveLoad(l);
    setMessages([]);
    setShowPicker(false);
  };

  return (
    <div className="flex flex-col h-full -m-4 lg:-m-6">

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/5" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Dispatch Chat</div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-slate-500 text-xs">Live</span>
            </div>
          </div>
        </div>

        {/* Load picker */}
        {loads.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setShowPicker(p => !p)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 transition-colors hover:border-orange-500/30"
            >
              {activeLoad ? (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-orange-400 font-mono text-xs font-bold flex-shrink-0">
                    {activeLoad.load_number || `#LD${activeLoad.id?.slice(-6).toUpperCase()}`}
                  </span>
                  <span className="text-slate-400 text-xs truncate">
                    {activeLoad.origin_city} → {activeLoad.destination_city}
                  </span>
                  <StatusBadge status={activeLoad.status} />
                </div>
              ) : (
                <span className="text-slate-500 text-sm">Select a load…</span>
              )}
              <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${showPicker ? "rotate-180" : ""}`} />
            </button>

            {showPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 glass-card border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                {loads.map(l => (
                  <button
                    key={l.id}
                    onClick={() => selectLoad(l)}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${
                      activeLoad?.id === l.id ? "bg-orange-500/8" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-orange-400 font-mono text-xs font-bold">
                          {l.load_number || `#LD${l.id?.slice(-6).toUpperCase()}`}
                        </span>
                        <StatusBadge status={l.status} />
                      </div>
                      <span className="text-slate-300 text-xs truncate block">
                        {l.origin_city} → {l.destination_city}
                      </span>
                    </div>
                    {activeLoad?.id === l.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="px-3 py-2 rounded-xl bg-white/3 border border-white/5 text-slate-500 text-xs text-center">
            No active loads — accept a load to start chatting
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        onClick={() => showPicker && setShowPicker(false)}
      >
        {!activeLoad ? (
          <div className="text-center py-16">
            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Select a load above</p>
            <p className="text-slate-600 text-xs mt-1">Each load has its own chat thread with dispatch</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No messages yet</p>
            <p className="text-slate-600 text-xs mt-1">
              Chatting about {activeLoad.load_number || `Load #${activeLoad.id?.slice(-6).toUpperCase()}`}
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? "bg-orange-500 text-white rounded-br-sm"
                    : "glass-card text-slate-200 rounded-bl-sm border border-white/5"
                }`}>
                  {!isMe && (
                    <div className="text-orange-400 text-xs font-medium mb-0.5">
                      {msg.sender_name || "Dispatcher"}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className={`text-xs mt-1 ${isMe ? "text-orange-200" : "text-slate-500"}`}>
                    {new Date(msg.created_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/5" style={{ background: "hsl(var(--card))" }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={!activeLoad}
            placeholder={activeLoad ? `Message about ${activeLoad.load_number || "this load"}…` : "Select a load first"}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors disabled:opacity-40"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending || !activeLoad}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}