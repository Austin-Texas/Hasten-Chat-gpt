import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Edit, AlertCircle, Calendar, CreditCard, Truck, Award, Shield, FileText, Mail, Phone, MapPin, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import DriverDocumentsSection from "@/components/driver/DriverDocumentsSection";
import { getLocalDriver } from "@/lib/localDriverStore";

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
    let mounted = true;

    const loadDriverDetail = async () => {
      try {
        const [drv, lds, exps] = await Promise.all([
          base44.entities.Driver.get(id),
          base44.entities.Load.filter({ driver_id: id }, "-created_date", 10),
          base44.entities.Expense.filter({ driver_id: id }, "-created_date", 10),
        ]);
        if (!mounted) return;
        setDriver(drv);
        setLoads(lds || []);
        setExpenses(exps || []);
        if (drv?.truck_id) {
          try {
            const t = await base44.entities.Truck.get(drv.truck_id);
            if (mounted) setTruck(t);
          } catch (truckError) {
            console.warn("Truck lookup skipped locally.", truckError?.message || truckError);
          }
        }
      } catch (error) {
        console.warn("Base44 driver detail unavailable locally. Using local demo driver store.", error?.message || error);
        if (mounted) {
          setDriver(getLocalDriver(id));
          setLoads([]);
          setExpenses([]);
          setTruck(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDriverDetail();
    return () => { mounted = false; };
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/drivers")} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-white font-heading font-bold text-2xl">{driver.first_name} {driver.last_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={driver.status} />
              {driver.status !== "inactive" && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            </div>
          </div>
        </div>
        <button onClick={() => navigate(`/drivers/${id}/edit`)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold hover:border-white/20 transition-colors">
          <Edit className="w-4 h-4" /> Edit
        </button>
      </div>

      {(licenseExpired || medicalExpired) && <div className="glass-card rounded-xl border border-red-500/25 bg-red-500/10 p-4 flex gap-3"><AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" /><div><div className="text-red-300 font-semibold text-sm">Certification Expired</div><div className="text-red-200 text-xs mt-1 space-y-0.5">{licenseExpired && <div>• CDL License expired on {new Date(driver.license_expiry).toLocaleDateString()}</div>}{medicalExpired && <div>• Medical certificate expired on {new Date(driver.medical_expiry).toLocaleDateString()}</div>}</div></div></div>}
      {(licenseExpiring || medicalExpiring) && !licenseExpired && !medicalExpired && <div className="glass-card rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 flex gap-3"><AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" /><div><div className="text-amber-300 font-semibold text-sm">Certifications Expiring Soon</div><div className="text-amber-200 text-xs mt-1 space-y-0.5">{licenseExpiring && <div>• CDL License expires {new Date(driver.license_expiry).toLocaleDateString()}</div>}{medicalExpiring && <div>• Medical expires {new Date(driver.medical_expiry).toLocaleDateString()}</div>}</div></div></div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="flex items-center justify-between"><div><div className="text-slate-500 text-xs uppercase tracking-wider">Completed Loads</div><div className="text-white text-2xl font-bold mt-1">{completedLoads}</div></div><Truck className="w-8 h-8 text-slate-600" /></div></div>
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="flex items-center justify-between"><div><div className="text-slate-500 text-xs uppercase tracking-wider">Total Earnings</div><div className="text-white text-2xl font-bold mt-1">${totalEarnings.toLocaleString()}</div></div><CreditCard className="w-8 h-8 text-slate-600" /></div></div>
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="flex items-center justify-between"><div><div className="text-slate-500 text-xs uppercase tracking-wider">Safety Score</div><div className="text-white text-2xl font-bold mt-1">{driver.safety_score || 100}</div></div><Award className="w-8 h-8 text-slate-600" /></div></div>
        <div className="glass-card rounded-xl p-4 border border-white/5"><div className="flex items-center justify-between"><div><div className="text-slate-500 text-xs uppercase tracking-wider">Pending Expenses</div><div className="text-white text-2xl font-bold mt-1">{pendingExpenses}</div></div><FileText className="w-8 h-8 text-slate-600" /></div></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="glass-card rounded-xl border border-white/5 p-5"><h2 className="text-white font-semibold mb-4">Driver Information</h2><div className="grid sm:grid-cols-2 gap-4 text-sm"><div className="flex items-center gap-2 text-slate-400"><Mail className="w-4 h-4" /> {driver.email}</div><div className="flex items-center gap-2 text-slate-400"><Phone className="w-4 h-4" /> {driver.phone}</div><div className="flex items-center gap-2 text-slate-400"><MapPin className="w-4 h-4" /> {driver.home_city || "—"}, {driver.home_state || "—"}</div><div className="flex items-center gap-2 text-slate-400"><Shield className="w-4 h-4" /> CDL {driver.license_class || "A"} • {driver.license_state || "—"}</div></div>{driver.notes && <div className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-slate-300">{driver.notes}</div>}</div>
          <DriverDocumentsSection driver={driver} />
        </div>
        <div className="space-y-5"><div className="glass-card rounded-xl border border-white/5 p-5"><h2 className="text-white font-semibold mb-4">Current Truck</h2>{truck ? <div className="text-sm text-slate-300">{truck.unit_number || truck.name}</div> : <p className="text-sm text-slate-500">No truck assigned</p>}</div><div className="glass-card rounded-xl border border-white/5 p-5"><h2 className="text-white font-semibold mb-4">Recent Loads</h2>{loads.length ? loads.map(load => <div key={load.id} className="flex items-center justify-between py-2 border-b border-white/5"><span className="text-sm text-slate-300">{load.load_number || load.id}</span><ChevronRight className="w-4 h-4 text-slate-600" /></div>) : <p className="text-sm text-slate-500">No recent loads</p>}</div></div>
      </div>
    </div>
  );
}
