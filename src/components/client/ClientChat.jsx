import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Paperclip } from "lucide-react";

export default function ClientChat({ client, user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!client?.id || !user?.id) return;

    const fetchMessages = async () => {
      try {
        const conversationId = `client-${client.id}`;
        const msgs = await base44.entities.Message.filter(
          { conversation_id: conversationId },
          "created_date",
          100
        );
        setMessages(msgs);
        setLoading(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } catch (err) {
        console.error("Error fetching messages:", err);
        setLoading(false);
      }
    };

    fetchMessages();
    const unsub = base44.entities.Message.subscribe(() => fetchMessages());
    return () => unsub();
  }, [client?.id, user?.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await base44.entities.Message.create({
        conversation_id: `client-${client.id}`,
        sender_id: user.id,
        sender_name: user.full_name,
        sender_role: "client",
        content: newMessage,
        is_read: false,
        message_type: "text",
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up h-[calc(100vh-120px)] flex flex-col">
      <div>
        <h1 className="text-white font-heading font-bold text-2xl">Message Dispatch</h1>
        <p className="text-slate-400 text-sm mt-0.5">Communication with your dedicated dispatcher</p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 glass-card rounded-xl border border-white/5 flex flex-col min-h-0 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p>No messages yet. Start a conversation!</p>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-lg ${
                    msg.sender_id === user?.id
                      ? "bg-orange-500 text-white"
                      : "bg-white/10 text-slate-200"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <span className={`text-xs mt-1 block ${
                    msg.sender_id === user?.id ? "text-orange-100" : "text-slate-500"
                  }`}>
                    {new Date(msg.created_date).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="border-t border-white/5 p-4 flex gap-2">
          <button
            type="button"
            className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500/40"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}