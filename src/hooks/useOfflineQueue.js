import { useState, useEffect, useRef } from "react";

/**
 * Persists pending actions to localStorage and replays them when back online.
 */
export default function useOfflineQueue(key = "hasten_offline_queue") {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const processorRef = useRef(null);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    const raw = localStorage.getItem(key);
    setPendingCount(raw ? JSON.parse(raw).length : 0);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [key]);

  const enqueue = (action) => {
    const raw = localStorage.getItem(key);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ ...action, queuedAt: Date.now() });
    localStorage.setItem(key, JSON.stringify(queue));
    setPendingCount(queue.length);
  };

  const flush = async (handler) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (queue.length === 0) return;
    const remaining = [];
    for (const action of queue) {
      try { await handler(action); } catch { remaining.push(action); }
    }
    localStorage.setItem(key, JSON.stringify(remaining));
    setPendingCount(remaining.length);
  };

  const clear = () => { localStorage.removeItem(key); setPendingCount(0); };

  return { isOnline, pendingCount, enqueue, flush, clear };
}