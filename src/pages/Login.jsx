import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, EyeOff, Mail, Lock, Truck, Shield, Clock, MapPin } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

    const demoUsers = {
    "netzeus20@gmail.com": {
      password: "123456",
      redirect: "/dashboard"
    },
    "driver@hasten.com": {
      password: "driver123",
      redirect: "/dashboard"
    }
  };

  const emailKey = email.trim().toLowerCase();
  const user = demoUsers[emailKey];
  console.log("LOGIN TEST:", emailKey, password.trim(), user);

  if (user && password.trim() === user.password) {
    
    localStorage.setItem(
  "hasten_user",
  JSON.stringify({
    email: emailKey,
    role: "super_admin"
  })
  );
    window.location.href = user.redirect;
    return;
  }

  setError("Invalid email or password. Please try again.");
  setLoading(false);
};
  const handleGoogle = () => base44.auth.loginWithProvider("google", "/dashboard");

  return (
    <div className="min-h-screen flex bg-[#080E1A]">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] xl:w-[50%] relative overflow-hidden p-10"
        style={{ background: "linear-gradient(135deg, #080E1A 0%, #0B1630 50%, #0E1F42 100%)" }}>
        {/* Animated background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(circle, #EA580C, transparent)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8 blur-3xl"
            style={{ background: "radial-gradient(circle, #3B82F6, transparent)" }} />
        </div>

        {/* Animated route SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 800 600" fill="none">
          <path d="M0 400 Q200 200 400 300 Q600 400 800 200" stroke="#EA580C" strokeWidth="2" strokeDasharray="8 4" />
          <path d="M0 500 Q300 300 500 400 Q700 500 800 350" stroke="#3B82F6" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="400" cy="300" r="6" fill="#EA580C" opacity="0.6" />
          <circle cx="200" cy="380" r="4" fill="#EA580C" opacity="0.4" />
          <circle cx="600" cy="360" r="4" fill="#EA580C" opacity="0.4" />
        </svg>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg"
              style={{ boxShadow: "0 0 30px rgba(234,88,12,0.4)" }}>
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-white font-heading font-black text-2xl tracking-tight">HASTEN</div>
              <div className="text-orange-400 text-xs font-medium tracking-widest uppercase">Freight & Transport Solutions</div>
            </div>
          </div>

          {/* Hero text */}
          <div className="mb-12">
            <h1 className="text-5xl xl:text-6xl font-heading font-black text-white leading-tight mb-4">
              Move Fast.<br />
              <span className="text-orange-400">Track Smart.</span><br />
              Deliver Trust.
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              Enterprise-grade logistics platform built for national scale. Real-time tracking, intelligent dispatch, and complete fleet control.
            </p>
          </div>

          {/* Truck visual */}
          <div className="glass-card rounded-2xl p-6 border border-orange-500/10 mb-8"
            style={{ background: "rgba(234,88,12,0.05)", backdropFilter: "blur(20px)" }}>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-orange-400 text-xs font-medium mb-1 uppercase tracking-wider">Current Fleet Status</div>
                <div className="text-white font-bold text-lg">247 Active Trucks</div>
                <div className="text-slate-400 text-sm">Across 48 states</div>
              </div>
              <div className="text-right">
                <div className="text-green-400 text-sm font-medium">↑ 98.4%</div>
                <div className="text-slate-500 text-xs">On-time delivery</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full w-[84%] bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Feature icons */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { icon: Shield, label: "Secure", sub: "Enterprise encryption" },
            { icon: Clock, label: "Real-time", sub: "Live GPS tracking" },
            { icon: MapPin, label: "Nationwide", sub: "48-state coverage" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="text-center">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-2">
                <Icon className="w-5 h-5 text-orange-400" />
              </div>
              <div className="text-white text-sm font-medium">{label}</div>
              <div className="text-slate-500 text-xs">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{ background: "#0A1220" }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-heading font-black text-xl">HASTEN</div>
              <div className="text-orange-400 text-xs">Freight & Transport</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-white font-heading font-bold text-3xl mb-2">Welcome Back</h2>
            <p className="text-slate-400">Sign in to your operations center</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-slate-300 text-sm font-medium mb-2">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@hastencargo.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-slate-300 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 accent-orange-500"
                />
                <span className="text-slate-400 text-sm">Remember me</span>
              </label>
              <a href="/forgot-password" className="text-orange-400 text-sm hover:text-orange-300 transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading ? "#6b2d00" : "linear-gradient(135deg, #EA580C, #F97316)",
                boxShadow: loading ? "none" : "0 4px 20px rgba(234,88,12,0.3)"
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In →"
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-600 text-xs">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogle}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 bg-white/5 text-slate-300 text-sm font-medium hover:bg-white/8 hover:border-white/20 transition-all duration-150"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              onClick={() => base44.auth.loginWithProvider("microsoft", "/dashboard")}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 bg-white/5 text-slate-300 text-sm font-medium hover:bg-white/8 hover:border-white/20 transition-all duration-150"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <path fill="#F25022" d="M1 1h10v10H1z"/>
                <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                <path fill="#FFB900" d="M13 13h10v10H13z"/>
              </svg>
              Microsoft
            </button>
          </div>

          <p className="text-center text-slate-600 text-xs mt-8">
            New driver?{" "}
            <span className="text-orange-400">Ask dispatch to create your account.</span>
          </p>
        </div>
      </div>
    </div>
  );
}