import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User, Truck, Check, Loader2, X, Search, MessageSquare, Send } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function DriverAssignPanel({ load, onAssigned, onClose }) {
  const [drivers, setDrivers]   = useState([]);
  const [trucks, setTrucks]     = useState([]);
  const [search, setSearch]     = useState("");
  const [selectedDriver, setSelectedDriver] = useState(load.driver_id || "");
  const [selectedTruck, setSelectedTruck]   = useState(load.truck_id || "");
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState("driver");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Driver.list("-created_date", 100),
      base44.entities.Truck.list("-created_date", 100),
      base44.entities.Message.filter({ load_id: load.id }, "-created_date", 50),
    ]).then(([d, t, m]) => { setDrivers(d); setTrucks(t); setMessages(m); }).catch(console.error);

    // Subscribe to new messages
    const unsub = base44.entities.Message.subscribe(event => {
      if (event.data?.load_id === load.id && event.type === "create") {
        setMessages(prev => [event.data, ...prev]);
      }
    });
    return unsub;
  }, [load.id]);

  const filteredDrivers = drivers.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
      (d.phone || "").includes(q) || (d.email || "").toLowerCase().includes(q);
  });

  const filteredTrucks = trucks.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (t.unit_number || "").toLowerCase().includes(q) ||
      `${t.year} ${t.make} ${t.model}`.toLowerCase().includes(q);
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = { driver_id: selectedDriver || null, truck_id: selectedTruck || null };
      if (selectedDriver && load.status === "available") updates.status = "assigned";
      await base44.entities.Load.update(load.id, updates);

      // Manifest event
      if (selectedDriver) {
        await base44.entities.Manifest.create({
          load_id: load.id,
          event_type: "driver_assigned",
          event_title: "Driver Assigned",
          event_timestamp: new Date().toISOString(),
          is_system_event: true,
        }).catch(() => {});
        // Update driver status
        await base44.entities.Driver.update(selectedDriver, {
          status: "on_load", current_load_id: load.id,
          ...(selectedTruck ? { truck_id: selectedTruck } : {})
        }).catch(() => {});
      }
      onAssigned?.({ ...load, ...updates });
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const statusColor = (s) => {
    if (s === "available") return "text-green-400";
    if (s === "on_load") return "text-orange-400";
    return "text-slate-500";
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedDriver) return;
    setSendingMsg(true);
    try {
      const driver = drivers.find(d => d.id === selectedDriver);
      await base44.entities.Message.create({
        load_id: load.id,
        conversation_id: `load-${load.id}`,
        sender_id: "dispatcher",
        sender_name: "Dispatcher",
        sender_role: "dispatcher",
        recipient_id: selectedDriver,
        content: messageText,
        message_type: "text",
      });
      setMessageText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h2 className="text-white font-semibold">Assign Driver & Truck</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Load: {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`} · {load.origin_city} → {load.destination_city}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 p-2 border-b border-white/5">
          {[
            { key: "driver", label: "Driver", icon: User },
            { key: "truck",  label: "Truck",  icon: Truck },
            { key: "messages", label: "Messages", icon: MessageSquare },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
              }`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input type="text" placeholder={`Search ${tab}s…`} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors" />
          </div>
        </div>

        {/* Messages Tab */}
        {tab === "messages" && (
          <div className="flex flex-col h-96 border-b border-white/5">
            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  No messages yet
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.sender_role === "dispatcher" ? "justify-end" : ""}`}>
                    <div className={`max-w-xs rounded-lg px-3 py-2 text-sm ${msg.sender_role === "dispatcher" ? "bg-orange-500/20 border border-orange-500/30 text-white" : "bg-white/5 border border-white/10 text-slate-300"}`}>
                      {msg.content}
                      <div className="text-xs mt-1 opacity-70">{new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Message Input */}
            {selectedDriver ? (
              <div className="p-3 border-t border-white/5 flex gap-2">
                <input
                  type="text"
                  placeholder="Send a quick update..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyPress={e => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendingMsg}
                  className="p-2.5 rounded-lg bg-orange-500 text-white disabled:opacity-50 hover:bg-orange-600 transition-colors"
                >
                  {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="p-3 border-t border-white/5 text-slate-500 text-xs text-center">Select a driver to send messages</div>
            )}
          </div>
        )}

        {/* List */}
        {tab !== "messages" && (
        <div className="overflow-y-auto max-h-64 p-2 space-y-1">
          {/* Clear option */}
          {tab === "driver" && (
            <button onClick={() => setSelectedDriver("")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                !selectedDriver ? "bg-white/8 border border-white/10" : "hover:bg-white/5"
              }`}>
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-slate-400 text-sm">— Unassigned —</span>
              {!selectedDriver && <Check className="w-4 h-4 text-orange-400 ml-auto" />}
            </button>
          )}

          {tab === "driver" && filteredDrivers.map(d => {
            const isSelected = selectedDriver === d.id;
            return (
              <button key={d.id} onClick={() => setSelectedDriver(d.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                  isSelected ? "bg-orange-500/10 border border-orange-500/20" : "hover:bg-white/5 border border-transparent"
                }`}>
                <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-400 text-xs font-bold">{d.first_name?.[0]}{d.last_name?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{d.first_name} {d.last_name}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={statusColor(d.status)}>{d.status?.replace("_"," ")}</span>
                    {d.license_class && <span className="text-slate-600">· CDL-{d.license_class}</span>}
                    {d.phone && <span className="text-slate-600">· {d.phone}</span>}
                  </div>
                </div>
                {d.status === "available" && <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">Available</span>}
                {isSelected && <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />}
              </button>
            );
          })}

          {tab === "truck" && (
            <button onClick={() => setSelectedTruck("")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                !selectedTruck ? "bg-white/8 border border-white/10" : "hover:bg-white/5"
              }`}>
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Truck className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-slate-400 text-sm">— No Truck —</span>
              {!selectedTruck && <Check className="w-4 h-4 text-orange-400 ml-auto" />}
            </button>
          )}

          {tab === "truck" && filteredTrucks.map(t => {
            const isSelected = selectedTruck === t.id;
            return (
              <button key={t.id} onClick={() => setSelectedTruck(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                  isSelected ? "bg-orange-500/10 border border-orange-500/20" : "hover:bg-white/5 border border-transparent"
                }`}>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">#{t.unit_number} — {t.year} {t.make} {t.model}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <StatusBadge status={t.status} />
                    {t.odometer && <span className="text-slate-600">{t.odometer.toLocaleString()} mi</span>}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />}
              </button>
            );
            })}
            </div>
            )}

            {/* Footer */}
        <div className="px-4 py-3 border-t border-white/5 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-medium hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving…" : "Confirm Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}