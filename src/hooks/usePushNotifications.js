import { useState, useEffect } from "react";

export default function usePushNotifications() {
  const [permission, setPermission] = useState(Notification.permission);
  const [isSupported] = useState("Notification" in window && "serviceWorker" in navigator);

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission);
  }, [isSupported]);

  const requestPermission = async () => {
    if (!isSupported) return "unsupported";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const showLocal = (title, options = {}) => {
    if (permission !== "granted") return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [200, 100, 200],
        ...options,
      });
    });
  };

  return { permission, isSupported, requestPermission, showLocal };
}