import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Edit, AlertCircle, Calendar, CreditCard, Truck, Award, Shield, FileText, Mail, Phone, MapPin, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import DriverDocumentsSection from "@/components/driver/DriverDocumentsSection";

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const daysLeft = Math.floor((d - now) / (1000 * 60 * 60 * 24));
  return daysLeft >= 0 && daysLeft <= 30;
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function DriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [truck, setTruck] = useState(null);
  const [loads, setLoads] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Driver.get(id),
      base44.entities.Load.filter({ driver_id: id }, "-created_date", 10),
      base44.entities.Expense.filter({ driver_id: id }, "-created_date", 10),
    ]).then(([drv, lds, exps]) => {
      setDriver(drv);
      setLoads(lds);
      setExpenses(exps);
      if (drv.truck_id) {
        return base44.entities.Truck.get(drv.truck_id).then(t => setTruck(t));
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="skeleton h-64 rounded-xl animate-pulse" />;
  }

  if (!driver) {
    return <div className="text-center py-12"><p className="text-slate-400">Driver not found</p></div>;
  }

  const licenseExpired = isExpired(driver.license_expiry);
  const licenseExpiring = isExpiringSoon(driver.license_expiry);
  const medicalExpired = isExpired(driver.medical_expiry);
  const medicalExpiring = isExpiringSoon(driver.medical_expiry);

  const completedLoads = loads.filter(l => l.status === "completed").length;
  const totalEarnings = loads.filter(l => l.status === "completed").reduce((s, l) => s + (l.rate || 0), 0);
  const pendingExpenses = expenses.filter(e => e.status === "pending").length;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/drivers")} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-white font-heading font-bold text-2xl">{driver.first_name} {driver.last_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={driver.status} />
              {driver.status !== "inactive" && (
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/drivers/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold hover:border-white/20 transition-colors"
        >
          <Edit className="w-4 h-4" /> Edit
        </button>
      </div>

      {/* Critical Alerts */}
      {(licenseExpired || medicalExpired) && (
        <div className="glass-card rounded-xl border border-red-500/25 bg-red-500/10 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-red-300 font-semibold text-sm">Certification Expired</div>
            <div className="text-red-200 text-xs mt-1 space-y-0.5">
              {licenseExpired && <div>• CDL License expired on {new Date(driver.license_expiry).toLocaleDateString()}</div>}
              {medicalExpired && <div>• Medical certificate expired on {new Date(driver.medical_expiry).toLocaleDateString()}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Warning Alerts */}
      {(licenseExpiring || medicalExpiring) && !licenseExpired && !medicalExpired && (
        <div className="glass-card rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-amber-300 font-semibold text-sm">Certifications Expiring Soon</div>
            <div className="text-amber-200 text-xs mt-1 space-y-0.5">
              {licenseExpiring && <div>• CDL License expires {new Date(driver.license_expiry).toLocaleDateString()}</div>}
              {medicalExpiring && <div>• Medical expires {new Date(driver.medical_expiry).toLocaleDateString()}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Completed Loads</div>
              <div className="text-white font-bold text-2xl mt-1">{completedLoads}</div>
            </div>
            <Truck className="w-8 h-8 text-orange-400 opacity-20" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Earnings YTD</div>
              <div className="text-green-400 font-bold text-2xl mt-1">${(totalEarnings / 1000).toFixed(0)}k</div>
            </div>
            <CreditCard className="w-8 h-8 text-green-400 opacity-20" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Safety Score</div>
              <div className="text-blue-400 font-bold text-2xl mt-1">{driver.safety_score || 100}</div>
            </div>
            <Award className="w-8 h-8 text-blue-400 opacity-20" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider">Pending Expenses</div>
              <div className="text-amber-400 font-bold text-2xl mt-1">{pendingExpenses}</div>
            </div>
            <FileText className="w-8 h-8 text-amber-400 opacity-20" />
          </div>
        </div>
      </div>

      {/* Contact & Personal Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Contact Information</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-slate-500 text-xs">Email</div>
                <a href={`mailto:${driver.email}`} className="text-orange-400 hover:text-orange-300 transition-colors text-sm">{driver.email}</a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-slate-500 text-xs">Phone</div>
                <a href={`tel:${driver.phone}`} className="text-orange-400 hover:text-orange-300 transition-colors text-sm">{driver.phone}</a>
              </div>
            </div>
            {driver.home_city && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-slate-500" />
                <div>
                  <div className="text-slate-500 text-xs">Home Base</div>
                  <div className="text-white text-sm">{driver.home_city}, {driver.home_state}</div>
                </div>
              </div>
            )}
            {driver.emergency_contact_name && (
              <div className="pt-2 border-t border-white/5">
                <div className="text-slate-500 text-xs mb-1">Emergency Contact</div>
                <div className="text-white font-medium text-sm">{driver.emergency_contact_name}</div>
                <div className="text-slate-400 text-xs">{driver.emergency_contact_phone}</div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">License & Pay</h2>
          <div className="space-y-3">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">License</div>
              <div className="text-white font-mono text-sm">{driver.license_number}</div>
              <div className="text-slate-400 text-xs mt-1">
                Class {driver.license_class} • {driver.license_state}
                {licenseExpired && <span className="text-red-400 ml-2">EXPIRED</span>}
                {licenseExpiring && !licenseExpired && <span className="text-amber-400 ml-2">EXPIRING SOON</span>}
              </div>
            </div>
            <div className="pt-2 border-t border-white/5">
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Pay Rate</div>
              <div className="text-white font-semibold text-sm capitalize">
                {driver.pay_rate || "—"} ({driver.pay_type?.replace("_", " ")})
              </div>
            </div>
            {driver.hazmat_cert && (
              <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">HAZMAT Certified</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <DriverDocumentsSection driverId={id} />

      {/* Assigned Truck */}
      {truck && (
        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Assigned Truck</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <Truck className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Unit {truck.unit_number}</div>
                <div className="text-slate-400 text-xs">{truck.year} {truck.make} {truck.model}</div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/fleet`)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* HOS Summary */}
      <div className="glass-card rounded-xl border border-white/5 p-5">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Hours of Service</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white/3 rounded-lg p-3">
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Today Driving</div>
            <div className="text-white font-bold text-lg">{(driver.hours_driving_today || 0).toFixed(1)} hrs</div>
          </div>
          <div className="bg-white/3 rounded-lg p-3">
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Today On Duty</div>
            <div className="text-white font-bold text-lg">{(driver.hours_on_duty_today || 0).toFixed(1)} hrs</div>
          </div>
          <div className="bg-white/3 rounded-lg p-3">
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">HOS Status</div>
            <div className="text-white font-bold text-sm capitalize">{driver.hos_status || "Off Duty"}</div>
          </div>
          <div className="bg-white/3 rounded-lg p-3">
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">YTD Miles</div>
            <div className="text-white font-bold text-lg">{(driver.miles_ytd || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">Recent Loads</h2>
          {loads.length === 0 ? (
            <p className="text-slate-500 text-xs">No loads</p>
          ) : (
            <div className="space-y-2">
              {loads.slice(0, 5).map(l => (
                <div key={l.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 truncate">{l.origin_city} → {l.destination_city}</span>
                  <StatusBadge status={l.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl border border-white/5 p-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">Recent Expenses</h2>
          {expenses.length === 0 ? (
            <p className="text-slate-500 text-xs">No expenses</p>
          ) : (
            <div className="space-y-2">
              {expenses.slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 capitalize">{e.category.replace("_", " ")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">${e.amount}</span>
                    <StatusBadge status={e.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}