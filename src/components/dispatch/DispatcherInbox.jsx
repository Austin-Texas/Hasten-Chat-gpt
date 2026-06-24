import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Loader2, Send, ChevronLeft, Search, Paperclip, User, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export default function DispatcherInbox() {
  const [loads, setLoads] = useState([]);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drivers, setDrivers] = useState({});
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch active loads with unread messages
  useEffect(() => {
    Promise.all([
      base44.entities.Load.filter({ status: "assigned" }, "-created_date", 100),
      base44.entities.Load.filter({ status: "accepted" }, "-created_date", 100),
      base44.entities.Load.filter({ status: "en_route" }, "-created_date", 100),
      base44.entities.Load.filter({ status: "in_transit" }, "-created_date", 100),
      base44.entities.Driver.list("-created_date", 500),
    ])
      .then(([assigned, accepted, enRoute, inTransit, allDrivers]) => {
        const active = [...assigned, ...accepted, ...enRoute, ...inTransit];
        setLoads(active);
        // Index drivers by ID for quick lookup
        const driverMap = {};
        allDrivers.forEach(d => driverMap[d.id] = d);
        setDrivers(driverMap);
        setLoading(false);

        // Auto-select first load with messages
        if (active.length > 0) {
          const convId = `load_${active[0].id}`;
          loadMessages(convId, active[0]);
        }
      })
      .catch(console.error);
  }, []);

  const loadMessages = async (convId, loadData) => {
    try {
      const msgs = await base44.entities.Message.filter(
        { conversation_id: convId },
        "-created_date",
        100
      );
      setMessages(msgs);
      setSelectedLoad(loadData);

      // Mark dispatcher's unread as read
      msgs.filter(m => !m.is_read && m.sender_role === "driver")
        .forEach(m => base44.entities.Message.update(m.id, { is_read: true }).catch(() => {}));
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!selectedLoad) return;
    const convId = `load_${selectedLoad.id}`;
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id !== convId) return;
      if (event.type === "create") {
        setMessages(prev => {
          if (prev.find(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
        if (event.data.sender_role === "driver") {
          base44.entities.Message.update(event.data.id, { is_read: true }).catch(() => {});
        }
      }
    });
    return () => unsub();
  }, [selectedLoad?.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedLoad || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      await base44.entities.Message.create({
        conversation_id: `load_${selectedLoad.id}`,
        load_id: selectedLoad.id,
        sender_id: "dispatcher-system",
        sender_name: "Dispatcher",
        sender_role: "dispatcher",
        content,
        message_type: "text",
        is_read: true,
      });
    } catch (err) {
      console.error(err);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const getLoadDisplayName = (load) => {
    return load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`;
  };

  // Count unread per load
  const getUnreadCount = (loadId) => {
    return messages
      .filter(m => m.load_id === loadId && m.sender_role === "driver" && !m.is_read).length;
  };

  // Filter loads by search
  const filteredLoads = loads.filter(load => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const driver = load.driver_id ? drivers[load.driver_id] : null;
    const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : "";
    return (
      load.load_number?.toLowerCase().includes(term) ||
      (load.truck_id?.toLowerCase().includes(term)) ||
      driverName.includes(term) ||
      load.origin_city?.toLowerCase().includes(term) ||
      load.destination_city?.toLowerCase().includes(term)
    );
  });

  // Handle file attachment
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLoad) return;
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setInput(prev => `${prev}\n[Attachment: ${file.name}](${file_url})`);
    } catch (err) {
      console.error("File upload failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Split view: loads list + message thread
  return (
    <div className="flex h-[70vh] gap-4">
      {/* Loads list */}
      <div className="w-80 glass-card rounded-2xl border border-white/5 flex flex-col overflow-hidden flex-shrink-0">
        <div className="px-5 py-4 border-b border-white/5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-400" />
            <h3 className="text-white font-semibold">Conversations</h3>
            <span className="ml-auto text-slate-500 text-xs">{filteredLoads.length}</span>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by driver, load, truck..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 p-2">
          {filteredLoads.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              {search.trim() ? "No matches found" : "No active conversations"}
            </div>
          ) : (
            filteredLoads.map(load => {
              const isSelected = selectedLoad?.id === load.id;
              const unreadCount = getUnreadCount(load.id);
              const driver = load.driver_id ? drivers[load.driver_id] : null;
              return (
                <button
                  key={load.id}
                  onClick={() => loadMessages(`load_${load.id}`, load)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors text-xs ${
                    isSelected
                      ? "bg-orange-500/20 border border-orange-500/30"
                      : "bg-white/5 border border-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-semibold truncate">
                      {getLoadDisplayName(load)}
                    </span>
                    {unreadCount > 0 && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex-shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 truncate">
                    {load.origin_city} → {load.destination_city}
                  </div>
                  {driver && (
                    <div className="text-slate-600 mt-1 truncate">
                      Driver: {driver.first_name} {driver.last_name}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Message thread */}
      {selectedLoad ? (
        <div className="flex-1 glass-card rounded-2xl border border-white/5 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">
                  {getLoadDisplayName(selectedLoad)}
                </div>
                <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {selectedLoad.origin_city}, {selectedLoad.origin_state} → {selectedLoad.destination_city}, {selectedLoad.destination_state}
                </div>
              </div>
              <Link
                to={`/loads/${selectedLoad.id}`}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-orange-400 text-xs font-medium transition-colors flex-shrink-0"
              >
                View Load
              </Link>
            </div>
            {selectedLoad.driver_id && drivers[selectedLoad.driver_id] && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/3">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-slate-400 text-xs">Driver</div>
                    <div className="text-white text-xs font-semibold">
                      {drivers[selectedLoad.driver_id].first_name} {drivers[selectedLoad.driver_id].last_name}
                    </div>
                  </div>
                </div>
                <Link
                  to={`/drivers/${selectedLoad.driver_id}`}
                  className="px-2 py-1 rounded text-orange-400 text-xs hover:bg-white/5 transition-colors flex-shrink-0"
                >
                  Profile
                </Link>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No messages yet</p>
              </div>
            ) : (
              messages.map(msg => {
                const isDriver = msg.sender_role === "driver";
                return (
                  <div key={msg.id} className={`flex ${isDriver ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-xs rounded-2xl px-4 py-2.5 ${
                        isDriver
                          ? "glass-card text-slate-200 border border-white/5 rounded-bl-sm"
                          : "bg-orange-500 text-white rounded-br-sm"
                      }`}
                    >
                      {isDriver && (
                        <div className="text-slate-400 text-xs font-medium mb-0.5">
                          {msg.sender_name || "Driver"}
                        </div>
                      )}
                      <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                      <div
                        className={`text-xs mt-1 ${
                          isDriver ? "text-slate-600" : "text-orange-200"
                        }`}
                      >
                        {new Date(msg.created_date).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-3 border-t border-white/5 flex gap-2 flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all flex-shrink-0"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
            />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Reply to driver…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 glass-card rounded-2xl border border-white/5 flex items-center justify-center text-slate-500">
          <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
        </div>
      )}
    </div>
  );
}