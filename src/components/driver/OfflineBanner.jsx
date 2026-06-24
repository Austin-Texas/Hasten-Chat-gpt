import { useState, useEffect } from "react";
import { WifiOff, Wifi, CloudUpload } from "lucide-react";
import useOfflineQueue from "@/hooks/useOfflineQueue";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);
  const { pendingCount } = useOfflineQueue("hasten_offline_queue");

  useEffect(() => {
    const online = () => { setIsOnline(true); setJustReconnected(true); setTimeout(() => setJustReconnected(false), 4000); };
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);

  if (isOnline && !justReconnected && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4 animate-slide-up">
        <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-amber-400 text-sm font-medium">You're offline</p>
          <p className="text-slate-500 text-xs">Actions will sync when you reconnect</p>
        </div>
        {pendingCount > 0 && <span className="text-amber-400 text-xs font-bold">{pendingCount} pending</span>}
      </div>
    );
  }

  if (justReconnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 mb-4 animate-slide-up">
        <Wifi className="w-4 h-4 text-green-400 flex-shrink-0" />
        <p className="text-green-400 text-sm font-medium">Back online — syncing your changes…</p>
      </div>
    );
  }

  return null;
}