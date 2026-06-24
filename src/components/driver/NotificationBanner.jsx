import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import usePushNotifications from "@/hooks/usePushNotifications";

export default function NotificationBanner() {
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("hasten_notif_dismissed") === "1");

  if (!isSupported || permission === "granted" || dismissed) return null;

  const handle = async () => {
    const result = await requestPermission();
    if (result !== "granted") {
      localStorage.setItem("hasten_notif_dismissed", "1");
      setDismissed(true);
    }
  };

  const dismiss = () => { localStorage.setItem("hasten_notif_dismissed", "1"); setDismissed(true); };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-orange-500/20 bg-orange-500/8 mb-4 animate-slide-up">
      <Bell className="w-5 h-5 text-orange-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">Enable notifications</p>
        <p className="text-slate-400 text-xs">Get alerts for new loads and dispatch updates</p>
      </div>
      <button onClick={handle} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}>
        Enable
      </button>
      <button onClick={dismiss} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}