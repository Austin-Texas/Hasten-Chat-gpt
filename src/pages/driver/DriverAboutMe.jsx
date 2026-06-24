import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";

export default function DriverAboutMe({ user }) {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        const drivers = await base44.entities.Driver.filter({ user_id: user?.id }, "-created_date", 1);
        if (drivers.length > 0) setDriver(drivers[0]);
      } catch (err) {
        console.error("Error fetching driver:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchDriver();
  }, [user?.id]);

  const expiryStatus = (expiry) => {
    if (!expiry) return null;
    const date = new Date(expiry);
    const today = new Date();
    const daysUntil = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    let color = "text-green-400";
    if (daysUntil < 0) color = "text-red-400";
    else if (daysUntil < 30) color = "text-amber-400";
    return { color, date: date.toLocaleDateString(), expired: daysUntil < 0 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 pb-24">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center justify-between px-4 pt-2 pb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white font-bold text-lg">About Me</h1>
          <div className="w-9" />
        </div>
        <div className="px-4">
          <div className="glass-card rounded-xl p-6 border border-red-500/20 bg-red-500/5 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-400 font-semibold">No profile found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">About Me</h1>
        <div className="w-9" />
      </div>

      {/* Personal Info */}
      <div className="px-4 glass-card rounded-xl p-5 border border-white/5 space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Personal Information</h3>
        
        <div className="flex justify-between items-start pb-3 border-b border-white/5">
          <span className="text-slate-400 text-sm">Full Name</span>
          <span className="text-white font-semibold text-sm text-right">{driver.first_name} {driver.last_name}</span>
        </div>

        <div className="flex justify-between items-start pb-3 border-b border-white/5">
          <span className="text-slate-400 text-sm">Email</span>
          <span className="text-white text-sm text-right break-all">{driver.email}</span>
        </div>

        {driver.phone && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">Phone</span>
            <span className="text-white font-mono text-sm">{driver.phone}</span>
          </div>
        )}

        {driver.driver_type && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">Driver Type</span>
            <span className="text-white text-sm capitalize">
              {driver.driver_type === "company_driver" ? "Company Driver" : driver.driver_type === "owner_driver" ? "Owner-Driver" : "Contractor"}
            </span>
          </div>
        )}

        {driver.home_city && (
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-sm">Home Base</span>
            <div className="text-right">
              <div className="text-white text-sm font-semibold">{driver.home_city}, {driver.home_state}</div>
              <div className="text-slate-500 text-xs">{driver.home_zip}</div>
            </div>
          </div>
        )}
      </div>

      {/* License & Certifications */}
      <div className="px-4 glass-card rounded-xl p-5 border border-white/5 space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">License & Certifications</h3>

        {driver.license_number && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">CDL #</span>
            <div className="text-right">
              <div className="text-white font-mono text-sm">{driver.license_number}</div>
              <div className="text-slate-500 text-xs">Class {driver.license_class || "?"}</div>
            </div>
          </div>
        )}

        {driver.license_expiry && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">License Expiry</span>
            <div className="text-right">
              <div className={`font-bold text-sm ${expiryStatus(driver.license_expiry).color}`}>
                {expiryStatus(driver.license_expiry).date}
              </div>
              {expiryStatus(driver.license_expiry).expired && (
                <div className="text-red-400 text-xs mt-0.5">⚠️ EXPIRED</div>
              )}
            </div>
          </div>
        )}

        {driver.medical_expiry && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">Medical Card</span>
            <div className="text-right">
              <div className={`font-bold text-sm ${expiryStatus(driver.medical_expiry).color}`}>
                {expiryStatus(driver.medical_expiry).date}
              </div>
              {expiryStatus(driver.medical_expiry).expired && (
                <div className="text-red-400 text-xs mt-0.5">⚠️ EXPIRED</div>
              )}
            </div>
          </div>
        )}

        {driver.twic_expiry && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">TWIC Card</span>
            <div className="text-right">
              <div className={`font-bold text-sm ${expiryStatus(driver.twic_expiry).color}`}>
                {expiryStatus(driver.twic_expiry).date}
              </div>
            </div>
          </div>
        )}

        {driver.work_authorization_expiry && (
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-sm">Work Authorization</span>
            <div className="text-right">
              <div className={`font-bold text-sm ${expiryStatus(driver.work_authorization_expiry).color}`}>
                {expiryStatus(driver.work_authorization_expiry).date}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Contact */}
      {driver.emergency_contact_name && (
        <div className="px-4 glass-card rounded-xl p-5 border border-white/5 space-y-3">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Emergency Contact</h3>
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">Name</span>
            <span className="text-white font-semibold text-sm">{driver.emergency_contact_name}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-sm">Phone</span>
            <span className="text-white font-mono text-sm">{driver.emergency_contact_phone}</span>
          </div>
        </div>
      )}

      {/* Hire Date */}
      {driver.hire_date && (
        <div className="px-4 glass-card rounded-xl p-5 border border-white/5">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-sm">Hire Date</span>
            <span className="text-white font-semibold text-sm">{new Date(driver.hire_date).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}