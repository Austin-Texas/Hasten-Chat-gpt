import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Truck, Loader2, AlertCircle } from "lucide-react";

export default function DriverAboutVehicle({ user }) {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [truck, setTruck] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const drivers = await base44.entities.Driver.filter({ user_id: user?.id }, "-created_date", 1);
        if (drivers.length > 0) {
          setDriver(drivers[0]);
          if (drivers[0].truck_id) {
            const trucks = await base44.entities.Truck.filter({ id: drivers[0].truck_id }, "", 1);
            if (trucks.length > 0) setTruck(trucks[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 pb-24">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!truck) {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center justify-between px-4 pt-2 pb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white font-bold text-lg">Vehicle</h1>
          <div className="w-9" />
        </div>
        <div className="px-4">
          <div className="glass-card rounded-xl p-6 border border-amber-500/20 bg-amber-500/5 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-400 font-semibold">No vehicle assigned</p>
            <p className="text-amber-300/70 text-xs mt-1">Contact your dispatcher to assign a truck</p>
          </div>
        </div>
      </div>
    );
  }

  const statusColors = {
    active: "text-green-400 bg-green-500/10 border-green-500/20",
    idle: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    maintenance: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    out_of_service: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  const expiryStatus = (expiry, label) => {
    if (!expiry) return null;
    const expiryDate = new Date(expiry);
    const today = new Date();
    const daysUntil = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    let color = "text-green-400";
    let statusText = "OK";
    if (daysUntil < 0) {
      color = "text-red-400";
      statusText = "EXPIRED";
    } else if (daysUntil < 30) {
      color = "text-amber-400";
      statusText = `${daysUntil} days left`;
    }
    
    return { color, statusText, date: expiryDate.toLocaleDateString() };
  };

  return (
    <div className="space-y-4 pb-24 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">Vehicle Details</h1>
        <div className="w-9" />
      </div>

      {/* Vehicle Header */}
      <div className="px-4 glass-card rounded-xl p-5 border border-white/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
            <Truck className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-orange-400 font-mono font-bold text-lg">{truck.unit_number}</div>
            <div className="text-white font-semibold text-sm">{truck.year} {truck.make} {truck.model}</div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold mt-2 ${statusColors[truck.status] || statusColors.idle}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {truck.status === "active" ? "Active" : truck.status === "idle" ? "Idle" : truck.status === "maintenance" ? "Maintenance" : "Out of Service"}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="px-4 glass-card rounded-xl p-5 border border-white/5 space-y-3">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Vehicle Information</h3>
        
        {truck.vin && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">VIN</span>
            <span className="text-white font-mono text-sm text-right">{truck.vin}</span>
          </div>
        )}
        
        {truck.license_plate && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">License Plate</span>
            <div className="text-right">
              <div className="text-white font-bold">{truck.license_plate}</div>
              <div className="text-slate-500 text-xs">{truck.license_plate_state}</div>
            </div>
          </div>
        )}

        {truck.fuel_type && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">Fuel Type</span>
            <span className="text-white text-sm capitalize">{truck.fuel_type}</span>
          </div>
        )}

        {truck.odometer && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">Odometer</span>
            <span className="text-white font-bold text-sm">{truck.odometer.toLocaleString()} miles</span>
          </div>
        )}

        {truck.mpg && (
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-sm">Fuel Efficiency</span>
            <span className="text-white font-bold text-sm">{truck.mpg} MPG</span>
          </div>
        )}
      </div>

      {/* Compliance & Expiry */}
      <div className="px-4 glass-card rounded-xl p-5 border border-white/5 space-y-3">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Compliance & Expiry</h3>

        {truck.registration_expiry && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">Registration</span>
            <div className="text-right">
              <div className={`font-bold text-sm ${expiryStatus(truck.registration_expiry).color}`}>
                {expiryStatus(truck.registration_expiry).statusText}
              </div>
              <div className="text-slate-500 text-xs">{expiryStatus(truck.registration_expiry).date}</div>
            </div>
          </div>
        )}

        {truck.insurance_expiry && (
          <div className="flex justify-between items-start pb-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">Insurance</span>
            <div className="text-right">
              <div className={`font-bold text-sm ${expiryStatus(truck.insurance_expiry).color}`}>
                {expiryStatus(truck.insurance_expiry).statusText}
              </div>
              <div className="text-slate-500 text-xs">{expiryStatus(truck.insurance_expiry).date}</div>
            </div>
          </div>
        )}

        {truck.annual_inspection_expiry && (
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-sm">Annual Inspection</span>
            <div className="text-right">
              <div className={`font-bold text-sm ${expiryStatus(truck.annual_inspection_expiry).color}`}>
                {expiryStatus(truck.annual_inspection_expiry).statusText}
              </div>
              <div className="text-slate-500 text-xs">{expiryStatus(truck.annual_inspection_expiry).date}</div>
            </div>
          </div>
        )}
      </div>

      {/* Maintenance Info */}
      {truck.last_service_date && (
        <div className="px-4 glass-card rounded-xl p-5 border border-white/5 space-y-2">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Maintenance</h3>
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-sm">Last Service</span>
            <span className="text-white text-sm">{new Date(truck.last_service_date).toLocaleDateString()}</span>
          </div>
          {truck.next_service_miles && (
            <div className="flex justify-between items-start pt-2 border-t border-white/5">
              <span className="text-slate-400 text-sm">Next Service (miles)</span>
              <span className="text-white font-bold text-sm">{truck.next_service_miles.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Trailer Info */}
      {truck.trailer_id && (
        <div className="px-4 glass-card rounded-xl p-5 border border-white/5">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-2">Assigned Trailer</h3>
          <p className="text-white text-sm">{truck.trailer_id}</p>
        </div>
      )}
    </div>
  );
}