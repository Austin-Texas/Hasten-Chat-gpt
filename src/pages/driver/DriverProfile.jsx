import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import {
  Edit2, FileText, Loader2, AlertCircle, Truck, Shield,
  ChevronRight, Settings, HelpCircle, MessageSquare, LogOut,
  Trash2, Star, User, Building2, MapPin, Radio, CheckCircle,
  Clock, Bell, Info, Camera
} from "lucide-react";
import CameraUpload from "@/components/driver/CameraUpload";

// ── Status options ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "available",     label: "Available",         sub: "Ready for loads",          dotColor: "bg-green-400",  textColor: "text-green-400",  cardStyle: "border-green-500/30 bg-green-500/5" },
  { value: "off_duty",      label: "Not Available",     sub: "Off duty",                 dotColor: "bg-slate-500",  textColor: "text-slate-400",  cardStyle: "border-slate-500/30 bg-slate-500/5" },
  { value: "will_available",label: "Will Be Available", sub: "Available soon",           dotColor: "bg-amber-400",  textColor: "text-amber-400",  cardStyle: "border-amber-500/30 bg-amber-500/5" },
];

function StatusPicker({ current, onSelect, saving }) {
  return (
    <div className="space-y-2">
      {STATUS_OPTIONS.map(opt => {
        const isActive = current === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            disabled={saving}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all active:scale-[0.98] ${
              isActive ? opt.cardStyle + " ring-1 ring-white/10" : "border-white/5 bg-white/3 hover:bg-white/5"
            }`}
          >
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.dotColor} ${isActive ? "animate-pulse" : "opacity-40"}`} />
            <div className="flex-1 text-left">
              <div className={`font-semibold text-sm ${isActive ? opt.textColor : "text-white"}`}>{opt.label}</div>
              <div className="text-slate-500 text-xs">{opt.sub}</div>
            </div>
            {isActive && <CheckCircle className={`w-4 h-4 flex-shrink-0 ${opt.textColor}`} />}
            {saving && isActive && <Loader2 className="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

// ── Menu row ──────────────────────────────────────────────────────────────────
function MenuRow({ icon: Icon, label, sub, to, onClick, color = "slate", danger = false, badge }) {
  const colorMap = {
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    blue:   "bg-blue-500/10 border-blue-500/20 text-blue-400",
    green:  "bg-green-500/10 border-green-500/20 text-green-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    cyan:   "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    amber:  "bg-amber-500/10 border-amber-500/20 text-amber-400",
    slate:  "bg-slate-500/10 border-slate-500/20 text-slate-400",
    red:    "bg-red-500/10 border-red-500/20 text-red-400",
  };
  const inner = (
    <div className="flex items-center gap-3 p-4 hover:bg-white/3 active:bg-white/5 transition-colors cursor-pointer">
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorMap[color] || colorMap.slate}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${danger ? "text-red-400" : "text-white"}`}>{label}</div>
        {sub && <div className="text-slate-500 text-xs">{sub}</div>}
      </div>
      {badge && (
        <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-400 text-[10px] font-bold">{badge}</span>
      )}
      <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
    </div>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  return <button className="w-full text-left" onClick={onClick}>{inner}</button>;
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label }) {
  return <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</div>;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DriverProfile({ user }) {
  const navigate = useNavigate();
  const [driver, setDriver]         = useState(null);
  const [truck, setTruck]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [uploadingSaving, setUploadingSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const drivers = await base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1);
        if (drivers.length > 0) {
          const d = drivers[0];
          setDriver(d);
          if (d.truck_id) {
            const trucks = await base44.entities.Truck.filter({ id: d.truck_id }, "", 1);
            if (trucks.length > 0) setTruck(trucks[0]);
          }
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [user?.id]);

  const handleStatusChange = async (newStatus) => {
    if (!driver || statusSaving || driver.status === newStatus) return;
    setStatusSaving(true);
    try {
      await base44.entities.Driver.update(driver.id, { status: newStatus });
      // Manifest event
      await base44.entities.Manifest.create({
        load_id: driver.current_load_id || "no-load",
        event_type: "note_added",
        event_title: "Driver Status Changed",
        event_description: `Driver ${driver.first_name} ${driver.last_name} changed status to ${newStatus}`,
        event_timestamp: new Date().toISOString(),
        performed_by: user?.full_name || driver.first_name,
        performed_by_role: "driver",
        is_system_event: true,
      }).catch(() => {}); // non-blocking
      setDriver(prev => ({ ...prev, status: newStatus }));
    } catch (err) { console.error(err); }
    finally { setStatusSaving(false); }
  };

  const handlePhotoSaved = async (file_url) => {
    if (!driver) return;
    setUploadingSaving(true);
    try {
      await base44.entities.Driver.update(driver.id, { profile_photo_url: file_url, avatar_url: file_url });
      setDriver(prev => ({ ...prev, profile_photo_url: file_url, avatar_url: file_url }));
      setShowPhotoUpload(false);
    } catch (err) { console.error(err); }
    finally { setUploadingSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>;
  }

  if (!driver) {
    return (
      <div className="space-y-4 pb-24">
        <div className="glass-card rounded-xl p-6 border border-red-500/20 bg-red-500/5 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-semibold text-sm">No driver profile found</p>
          <p className="text-red-300/70 text-xs mt-1">Please contact your dispatcher to be added to the system</p>
        </div>
      </div>
    );
  }

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === driver.status) || STATUS_OPTIONS[1];
  const photoUrl = driver.profile_photo_url || driver.avatar_url;

  return (
    <div className="space-y-4 pb-28 animate-slide-up">

      {/* ── Profile Hero ── */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(234,88,12,0.1) 0%, rgba(14,22,46,0.95) 60%, rgba(20,30,60,0.9) 100%)",
          border: "1px solid rgba(234,88,12,0.15)",
        }}
      >
        {/* Background truck watermark */}
        <div className="absolute right-0 bottom-0 opacity-[0.04] pointer-events-none">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-40 h-40 text-orange-400">
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5l1.96 2.5H17V9.5h2.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2.22-3c-.55-.61-1.33-1-2.22-1s-1.67.39-2.22 1H3V6h12v9H8.22zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
          </svg>
        </div>

        <div className="flex items-start gap-4">
          {/* Avatar with camera tap */}
          <div className="relative flex-shrink-0">
            <button onClick={() => setShowPhotoUpload(true)} className="relative block group">
              {photoUrl ? (
                <img src={photoUrl} alt={driver.first_name} className="w-20 h-20 rounded-2xl object-cover border-2 border-orange-500/50" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-blue-500/20 border-2 border-orange-500/40 flex items-center justify-center">
                  <span className="text-orange-400 font-bold text-2xl">{(driver.first_name?.[0] || "D").toUpperCase()}</span>
                </div>
              )}
              {/* Camera overlay on hover/tap */}
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-orange-500 border-2 border-background flex items-center justify-center">
                <Camera className="w-3 h-3 text-white" />
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-xl leading-tight">{driver.first_name} {driver.last_name}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{user?.email}</p>
            {driver.phone && <p className="text-slate-500 text-xs mt-0.5">{driver.phone}</p>}

            {/* Driver type badge */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {driver.driver_type && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                  {driver.driver_type === "owner_driver" ? "Owner-Operator" : "Company Driver"}
                </span>
              )}
              {truck && (
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
                  Unit #{truck.unit_number}
                </span>
              )}
            </div>
          </div>

          {/* Edit */}
          <Link
            to="/driver/profile/edit"
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-colors flex-shrink-0"
          >
            <Edit2 className="w-4 h-4" />
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: "Safety",   value: driver.safety_score ?? "—",              color: "text-green-400" },
            { label: "Loads",    value: driver.loads_completed ?? 0,             color: "text-blue-400" },
            { label: "Miles YTD",value: driver.miles_ytd ? `${(driver.miles_ytd/1000).toFixed(0)}k` : "—", color: "text-cyan-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/3 border border-white/5 p-2.5 text-center">
              <div className={`font-bold text-lg font-mono ${s.color}`}>{s.value}</div>
              <div className="text-slate-600 text-[10px] uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status / Availability ── */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <Radio className="w-4 h-4 text-orange-400" />
          <h2 className="text-white font-semibold text-sm">Availability Status</h2>
          <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentStatusOption.cardStyle} ${currentStatusOption.textColor}`}>
            {currentStatusOption.label}
          </span>
        </div>
        <div className="p-4">
          <StatusPicker current={driver.status} onSelect={handleStatusChange} saving={statusSaving} />
        </div>
      </div>

      {/* ── Account Menu ── */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
        <SectionHeader label="Profile" />
        <MenuRow icon={User}      label="About Me"            sub="License, personal info, certifications"     to="/driver/profile/about-me"       color="orange" />
        <MenuRow icon={Truck}     label="About Vehicle"       sub="Truck details, compliance, insurance"        to="/driver/profile/about-vehicle"  color="cyan" />
        <MenuRow icon={FileText}  label="My Documents"        sub="BOL, POD, compliance documents"             to="/driver/profile/documents"      color="amber" />
        <MenuRow icon={Building2} label="My Companies"        sub="Assigned carrier & broker info"             to="/driver/profile/companies"      color="blue" />
        <MenuRow icon={MapPin}    label="Home Location / ZIP" sub={driver.home_city ? `${driver.home_city}, ${driver.home_state} ${driver.home_zip || ""}` : "Set preferred location"} to="/driver/profile/edit" color="green" />
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
        <SectionHeader label="App" />
        <MenuRow icon={Settings}  label="App Settings"        sub="Language, units, display preferences"      to="/driver/settings"               color="slate" />
        <MenuRow icon={Bell}      label="Notifications"       sub="Load alerts, messages, reminders"           to="/driver/settings"               color="purple" />
        <MenuRow icon={Shield}    label="HOS Monitor"         sub="Hours of service tracking"                  to="/driver/hos"                    color="amber" />
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
        <SectionHeader label="Support" />
        <MenuRow icon={HelpCircle}    label="Help Center"     sub="How to use the HASTEN driver app"           to="/help"                          color="blue" />
        <MenuRow icon={MessageSquare} label="Contact Support" sub="Create ticket, call, email, WhatsApp"        to="/driver/support"                color="green" />
        <MenuRow icon={Star}          label="App Feedback"    sub="Rate features, report issues"               to="/driver/feedback"               color="amber" />
        <MenuRow icon={Info}          label="About HASTEN"    sub="Version 1.0.0 · hasten.io"                  onClick={() => {}}                  color="slate" />
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
        <SectionHeader label="Account" />
        <MenuRow icon={LogOut} label="Sign Out"         sub="Log out of the driver app"   onClick={() => setShowLogoutModal(true)} color="slate" />
        <MenuRow icon={Trash2} label="Delete Account"   sub="Permanently remove account"  onClick={() => setShowDeleteModal(true)} danger color="red" />
      </div>

      {/* ── Photo Upload Sheet ── */}
      {showPhotoUpload && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowPhotoUpload(false)}>
          <div
            className="w-full glass-card rounded-t-3xl p-6 border-t border-white/10 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-2" />
            <h2 className="text-white font-bold text-lg">Profile Photo</h2>
            <p className="text-slate-400 text-sm">Take a new photo or upload from your library.</p>
            {uploadingSaving ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
            ) : (
              <CameraUpload label="Upload Photo" accept="image/*" docType="profile_photo" onUploaded={handlePhotoSaved} />
            )}
            <button
              onClick={() => setShowPhotoUpload(false)}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Logout Modal ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50">
          <div className="w-full glass-card rounded-t-3xl p-6 border-t border-white/10 space-y-4 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-2" />
            <h2 className="text-white font-bold text-lg">Sign Out?</h2>
            <p className="text-slate-400 text-sm">You'll be logged out. You can log back in anytime with your credentials.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm">Cancel</button>
              <button onClick={() => base44.auth.logout("/login")} className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm hover:border-red-500/60 transition-colors">Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50">
          <div className="w-full glass-card rounded-t-3xl p-6 border-t border-white/10 space-y-4 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-2" />
            <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-white font-bold text-lg text-center">Delete Account?</h2>
            <p className="text-slate-400 text-sm text-center">This will permanently remove your driver profile and all associated data. This action cannot be undone.</p>
            <p className="text-slate-500 text-xs text-center">Contact your dispatcher or admin to process account deletion.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm">Cancel</button>
              <button
                onClick={() => {
                  window.location.href = "mailto:support@hasten.io?subject=Account Deletion Request";
                  setShowDeleteModal(false);
                }}
                className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm"
              >
                Request Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}