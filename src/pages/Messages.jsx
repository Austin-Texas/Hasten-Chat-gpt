import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Search, Send, Paperclip, X, Truck, ArrowRight, AlertTriangle } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import usePushNotifications from "@/hooks/usePushNotifications";

const ACTIVE_STATUSES = ["assigned","accepted","en_route","arrived_pickup","loaded","in_transit","arrived_delivery"];

// ── Conversation List Item ──────────────────────────────────────────────────
function ConvItem({ load, messages, unreadCount, active, onClick }) {
  const last = messages[messages.length - 1];
  const loadLabel = load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`;
  const isUrgent = messages.some(m => m.message_type === "alert");

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-white/5 transition-all duration-150 ${
        active
          ? "bg-orange-500/8 border-l-2 border-l-orange-500"
          : "hover:bg-white/3 border-l-2 border-l-transparent"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Load icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isUrgent ? "bg-red-500/15 border border-red-500/25" :
          unreadCount > 0 ? "bg-orange-500/15 border border-orange-500/25" :
          "bg-white/5 border border-white/10"
        }`}>
          <Truck className={`w-4 h-4 ${isUrgent ? "text-red-400" : unreadCount > 0 ? "text-orange-400" : "text-slate-500"}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`font-mono text-xs font-bold ${unreadCount > 0 ? "text-orange-400" : "text-slate-400"}`}>
              {loadLabel}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isUrgent && <AlertTriangle className="w-3 h-3 text-red-400" />}
              {unreadCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          </div>
          <div className="text-slate-300 text-xs flex items-center gap-1 truncate mb-1">
            <span className="truncate">{load.origin_city}</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
            <span className="truncate">{load.destination_city}</span>
          </div>
          {last && (
            <div className="text-slate-500 text-xs truncate">
              <span className={last.sender_role === "driver" ? "text-blue-400" : "text-orange-300"}>
                {last.sender_role === "driver" ? "Driver" : "You"}:
              </span>{" "}
              {last.attachment_url ? "📎 Attachment" : last.content}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe }) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
        isMe
          ? "bg-orange-500 text-white rounded-br-sm"
          : msg.message_type === "alert"
          ? "bg-red-500/15 border border-red-500/25 text-red-300 rounded-bl-sm"
          : "glass-card text-slate-200 border border-white/5 rounded-bl-sm"
      }`}>
        {!isMe && (
          <div className={`text-xs font-semibold mb-0.5 ${msg.message_type === "alert" ? "text-red-400" : "text-blue-400"}`}>
            {msg.sender_name || "Driver"}
            {msg.message_type === "alert" && " 🚨 URGENT"}
          </div>
        )}
        {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
        {msg.attachment_url && (
          <a
            href={msg.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 mt-1.5 text-xs underline underline-offset-2 ${isMe ? "text-orange-200" : "text-blue-400"}`}
          >
            <Paperclip className="w-3 h-3" />
            View Attachment
          </a>
        )}
        <div className={`text-[10px] mt-1 ${isMe ? "text-orange-200" : "text-slate-500"}`}>
          {new Date(msg.created_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function Messages({ user }) {
  const [loads, setLoads]               = useState([]);
  const [allMessages, setAllMessages]   = useState({}); // { [load_id]: Message[] }
  const [activeLoadId, setActiveLoadId] = useState(null);
  const [input, setInput]               = useState("");
  const [sending, setSending]           = useState(false);
  const [search, setSearch]             = useState("");
  const [uploading, setUploading]       = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState(null);
  const [isUrgent, setIsUrgent]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const bottomRef    = useRef(null);
  const fileRef      = useRef(null);
  const unsubRefs    = useRef({});
  const activeLoadIdRef = useRef(activeLoadId);

  const { permission, requestPermission, showLocal } = usePushNotifications();

  // Keep ref in sync so subscription callbacks always see latest value
  useEffect(() => { activeLoadIdRef.current = activeLoadId; }, [activeLoadId]);

  // Request notification permission on first load
  useEffect(() => {
    if (permission === "default") requestPermission();
  }, []);

  // Load all active/recent loads that could have messages
  useEffect(() => {
    base44.entities.Load.list("-updated_date", 100)
      .then(data => {
        // Prioritize active loads, keep up to 50 total
        const active = data.filter(l => ACTIVE_STATUSES.includes(l.status));
        const others = data.filter(l => !ACTIVE_STATUSES.includes(l.status)).slice(0, 30);
        const sorted = [...active, ...others];
        setLoads(sorted);
        if (sorted.length > 0) setActiveLoadId(sorted[0].id);
        // Subscribe to messages for active loads
        sorted.slice(0, 20).forEach(l => subscribeLoad(l.id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => {
      Object.values(unsubRefs.current).forEach(fn => fn?.());
    };
  }, []);

  const subscribeLoad = useCallback((loadId) => {
    if (unsubRefs.current[loadId]) return; // already subscribed

    const convId = `load_${loadId}`;

    // Initial fetch
    base44.entities.Message.filter({ conversation_id: convId }, "created_date", 100)
      .then(msgs => {
        setAllMessages(prev => ({ ...prev, [loadId]: msgs }));
      })
      .catch(() => {});

    // Live subscription
    const unsub = base44.entities.Message.subscribe((event) => {
      if (!event.data || event.data.conversation_id !== convId) return;
      if (event.type === "create") {
        const msg = event.data;
        setAllMessages(prev => {
          const current = prev[loadId] || [];
          if (current.find(m => m.id === msg.id)) return prev;
          return { ...prev, [loadId]: [...current, msg] };
        });

        // Notify dispatcher when a driver sends a message and tab is blurred or conversation not active
        if (msg.sender_role === "driver" && (document.hidden || activeLoadIdRef.current !== loadId)) {
          const isUrgentMsg = msg.message_type === "alert";
          const loadLabel = `Load #${loadId.slice(-6).toUpperCase()}`;
          showLocal(
            isUrgentMsg ? `🚨 URGENT — ${msg.sender_name || "Driver"}` : `${msg.sender_name || "Driver"} — ${loadLabel}`,
            {
              body: msg.content || "Sent an attachment",
              tag: convId, // collapses duplicate notifications per conversation
              renotify: isUrgentMsg,
              data: { url: "/messages" },
            }
          );
        }
      }
    });
    unsubRefs.current[loadId] = unsub;
  }, []);

  // Subscribe when switching to a new load
  useEffect(() => {
    if (activeLoadId) subscribeLoad(activeLoadId);
  }, [activeLoadId]);

  // Auto-scroll + mark read
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!activeLoadId) return;
    const msgs = allMessages[activeLoadId] || [];
    msgs
      .filter(m => !m.is_read && m.sender_id !== user?.id)
      .forEach(m => base44.entities.Message.update(m.id, { is_read: true }).catch(() => {}));
  }, [allMessages, activeLoadId]);

  const activeMessages = (allMessages[activeLoadId] || []);
  const activeLoad     = loads.find(l => l.id === activeLoadId);
  const convId         = activeLoadId ? `load_${activeLoadId}` : null;

  const unreadCount = (loadId) => {
    return (allMessages[loadId] || []).filter(m => !m.is_read && m.sender_id !== user?.id).length;
  };
  const totalUnread = loads.reduce((s, l) => s + unreadCount(l.id), 0);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachmentUrl(file_url);
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !attachmentUrl) || sending || !convId) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    const url = attachmentUrl;
    setAttachmentUrl(null);
    setIsUrgent(false);
    try {
      await base44.entities.Message.create({
        conversation_id: convId,
        load_id: activeLoadId,
        sender_id: user?.id,
        sender_name: user?.full_name || "Dispatcher",
        sender_role: "dispatcher",
        content: content || (url ? "Sent an attachment" : ""),
        attachment_url: url || undefined,
        message_type: isUrgent ? "alert" : "text",
        is_read: false,
      });
    } catch { setInput(content); }
    finally { setSending(false); }
  };

  const filteredLoads = loads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.load_number || "").toLowerCase().includes(q) ||
      (l.origin_city || "").toLowerCase().includes(q) ||
      (l.destination_city || "").toLowerCase().includes(q)
    );
  });

  // Sort: unread first, then active loads, then by last message
  const sortedLoads = [...filteredLoads].sort((a, b) => {
    const ua = unreadCount(a.id), ub = unreadCount(b.id);
    if (ua !== ub) return ub - ua;
    const aa = ACTIVE_STATUSES.includes(a.status) ? 1 : 0;
    const ab = ACTIVE_STATUSES.includes(b.status) ? 1 : 0;
    if (aa !== ab) return ab - aa;
    return 0;
  });

  return (
    <div className="flex gap-0 h-full -m-4 lg:-m-6 animate-slide-up overflow-hidden">

      {/* ── Left: Conversation List ── */}
      <div
        className="w-80 flex-shrink-0 flex flex-col border-r border-white/5 overflow-hidden"
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-heading font-bold text-lg">Messages</h1>
              {totalUnread > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-slate-500 text-xs">Live</span>
              {permission === "default" && (
                <button
                  onClick={requestPermission}
                  className="ml-1 text-[10px] text-orange-400 underline underline-offset-2 hover:text-orange-300 transition-colors"
                  title="Enable push notifications for new driver messages"
                >
                  Enable alerts
                </button>
              )}
              {permission === "denied" && (
                <span className="ml-1 text-[10px] text-red-400" title="Notifications blocked in browser settings">🔕</span>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search loads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : sortedLoads.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">No loads found</p>
            </div>
          ) : sortedLoads.map(load => (
            <ConvItem
              key={load.id}
              load={load}
              messages={allMessages[load.id] || []}
              unreadCount={unreadCount(load.id)}
              active={activeLoadId === load.id}
              onClick={() => setActiveLoadId(load.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Right: Chat Panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        {!activeLoad ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Select a load to view the conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-white/5" style={{ background: "hsl(var(--card))" }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-orange-400 font-mono font-bold text-sm">
                      {activeLoad.load_number || `#LD${activeLoad.id?.slice(-6).toUpperCase()}`}
                    </span>
                    <StatusBadge status={activeLoad.status} />
                  </div>
                  <div className="text-slate-400 text-xs flex items-center gap-1">
                    <span className="truncate">{activeLoad.origin_city}, {activeLoad.origin_state}</span>
                    <ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">{activeLoad.destination_city}, {activeLoad.destination_state}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {activeMessages.length > 0 && (
                  <span className="text-slate-500 text-xs">{activeMessages.length} messages</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {activeMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-slate-700 mb-2" />
                  <p className="text-slate-500 text-sm font-medium">No messages yet</p>
                  <p className="text-slate-600 text-xs mt-1">Send a message to the driver below</p>
                </div>
              ) : (
                <>
                  {activeMessages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMe={msg.sender_id === user?.id || msg.sender_role === "dispatcher"}
                    />
                  ))}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Attachment preview */}
            {attachmentUrl && (
              <div className="flex-shrink-0 px-5 py-2 border-t border-white/5 bg-white/2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 w-fit">
                  <Paperclip className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-slate-300 text-xs">Attachment ready</span>
                  <button onClick={() => setAttachmentUrl(null)} className="text-slate-500 hover:text-red-400 transition-colors ml-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="flex-shrink-0 p-4 border-t border-white/5" style={{ background: "hsl(var(--card))" }}>
              {/* Urgent toggle */}
              <div className="flex items-center gap-2 mb-2.5">
                <button
                  onClick={() => setIsUrgent(u => !u)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    isUrgent
                      ? "bg-red-500/15 border-red-500/25 text-red-400"
                      : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {isUrgent ? "🚨 URGENT" : "Mark Urgent"}
                </button>
                <span className="text-slate-600 text-xs">Urgent messages alert the driver immediately</span>
              </div>

              <div className="flex gap-2">
                {/* File attach */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  title="Attach file"
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all flex-shrink-0 disabled:opacity-50"
                >
                  {uploading
                    ? <div className="w-4 h-4 border-2 border-white/20 border-t-slate-300 rounded-full animate-spin" />
                    : <Paperclip className="w-4 h-4" />}
                </button>

                {/* Text input */}
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Message driver…"
                  className={`flex-1 border rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none transition-colors ${
                    isUrgent
                      ? "bg-red-500/5 border-red-500/30 focus:border-red-500/50"
                      : "bg-white/5 border-white/10 focus:border-orange-500/40"
                  }`}
                />

                {/* Send */}
                <button
                  onClick={sendMessage}
                  disabled={(!input.trim() && !attachmentUrl) || sending}
                  className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0"
                  style={{ background: isUrgent ? "linear-gradient(135deg, #dc2626, #ef4444)" : "linear-gradient(135deg, #EA580C, #F97316)" }}
                >
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Send className="w-4 h-4 text-white" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}