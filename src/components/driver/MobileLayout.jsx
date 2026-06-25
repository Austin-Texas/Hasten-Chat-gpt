import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Package, MessageSquare, Wifi, WifiOff, User, ScanLine } from "lucide-react";
import { useState, useEffect } from "react";
import { DriverThemeProvider } from "@/lib/DriverThemeContext";

const TABS = [
  { label: "Home", icon: LayoutDashboard, path: "/driver/dashboard" },
  { label: "Loads", icon: Package, path: "/driver/loads" },
  { label: "Scan", icon: ScanLine, path: "/driver/scan", center: true },
  { label: "Chat", icon: MessageSquare, path: "/driver/messages" },
  { label: "Profile", icon: User, path: "/driver/profile" },
];

function TruckIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5l1.96 2.5H17V9.5h2.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2.22-3c-.55-.61-1.33-1-2.22-1s-1.67.39-2.22 1H3V6h12v9H8.22zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
    </svg>
  );
}

export default function MobileLayout({ children, user }) {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const isDriverRoute = location.pathname.startsWith("/driver");
  if (!isDriverRoute) return <>{children}</>;

  const initials = (user?.full_name || "D")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DriverThemeProvider user={user}>
      <div
        className="flex flex-col bg-background overflow-hidden"
        style={{ height: "100dvh", maxWidth: "100vw" }}
      >
        <header
          className="flex-shrink-0 flex items-center justify-between px-4 border-b border-white/5"
          style={{
            background: "linear-gradient(135deg, hsl(210 21% 5%) 0%, hsl(214 25% 11%) 100%)",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
            paddingBottom: "10px",
            minHeight: "54px",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #00E678, #00C865)", boxShadow: "0 2px 12px rgba(0,230,120,0.4)" }}
            >
              <TruckIcon className="w-4 h-4 text-black" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-white font-heading font-bold text-base tracking-widest">HASTEN</span>
              <span className="text-green-400/70 text-[9px] tracking-widest uppercase font-medium">Driver Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isOnline ? (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <Wifi className="w-3.5 h-3.5 text-green-400" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400 text-[10px] font-semibold">Offline</span>
              </div>
            )}

            <Link
              to="/driver/profile"
              className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-green-500/40 flex-shrink-0 active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, rgba(0,230,120,0.2), rgba(0,200,101,0.1))" }}
            >
              <span className="text-green-300 text-xs font-bold">{initials}</span>
            </Link>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="px-4 py-4 pb-28">{children}</div>
        </main>

        <nav
          className="flex-shrink-0 border-t border-white/8"
          style={{
            background: "linear-gradient(180deg, hsl(210 21% 5%) 0%, hsl(210 21% 4%) 100%)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="flex items-stretch px-1">
            {TABS.map((tab) => {
              const isActive =
                location.pathname === tab.path ||
                (tab.path !== "/driver/dashboard" && location.pathname.startsWith(tab.path));

              if (tab.center) {
                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className="flex-1 flex flex-col items-center justify-center gap-1 -mt-6 pb-2 relative active:scale-95 transition-transform"
                    aria-label="Scan documents"
                  >
                    <div
                      className={`relative h-14 w-14 rounded-2xl flex items-center justify-center border transition-all duration-200 ${
                        isActive ? "border-green-300/80" : "border-green-400/40"
                      }`}
                      style={{
                        background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.22), transparent 32%), linear-gradient(135deg, #00E678, #00C865)",
                        boxShadow: isActive
                          ? "0 0 34px rgba(0,230,120,0.72), 0 10px 28px rgba(0,0,0,0.36)"
                          : "0 0 22px rgba(0,230,120,0.48), 0 8px 22px rgba(0,0,0,0.32)",
                      }}
                    >
                      <ScanLine className="w-7 h-7 text-black" strokeWidth={2.7} />
                    </div>
                    <span className={`text-[9px] font-bold tracking-wide uppercase ${isActive ? "text-green-300" : "text-green-500/80"}`}>
                      Scan
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative transition-colors"
                >
                  {isActive && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                      style={{ background: "linear-gradient(90deg, #00E678, #00C865)" }}
                    />
                  )}
                  <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${isActive ? "bg-green-500/15" : "bg-transparent"}`}>
                    <tab.icon
                      className={`w-5 h-5 transition-colors duration-200 ${isActive ? "text-green-400" : "text-slate-500"}`}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                    {tab.path === "/driver/messages" && !isActive && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-background" />
                    )}
                  </div>
                  <span className={`text-[9px] font-semibold tracking-wide uppercase transition-colors duration-200 ${isActive ? "text-green-400" : "text-slate-600"}`}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </DriverThemeProvider>
  );
}
