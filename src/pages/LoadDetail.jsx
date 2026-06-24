import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  MapPin, Clock, DollarSign, Truck, FileText, ChevronLeft,
  User, ArrowRight, CheckCircle, Circle, Package, Edit, UserPlus,
  Play, Navigation2
} from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";
import DriverAssignPanel from "@/components/dispatch/DriverAssignPanel";
import RCSection from "@/components/rc/RCSection";
import RCSigningPanel from "@/components/rc/RCSigningPanel";
import DriverStopWorkflow from "@/components/driver/DriverStopWorkflow";
import DetentionStopCard from "@/components/detention/DetentionStopCard";
import EntityTimeline from "@/components/timeline/EntityTimeline";

const WORKFLOW = [
  { key: "assigned", label: "Assigned" },
  { key: "accepted", label: "Accepted" },
  { key: "en_route", label: "En Route" },
  { key: "arrived_pickup", label: "Arrived Pickup" },
  { key: "loaded", label: "Loaded" },
  { key: "in_transit", label: "In Transit" },
  { key: "arrived_delivery", label: "Arrived Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "pod_uploaded", label: "POD Uploaded" },
  { key: "completed", label: "Completed" },
];

export default function LoadDetail() {
  const { id } = useParams();
  const [load, setLoad] = useState(null);
  const [rc, setRC] = useState(null);
  const [manifests, setManifests] = useState([]);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("details");
  const [trackStats, setTrackStats] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [stops, setStops] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [loadData, manifestData, stopsData, rcData] = await Promise.all([
        base44.entities.Load.filter({ id }, "-created_date", 1),
        base44.entities.Manifest.filter({ load_id: id }, "event_timestamp", 50),
        base44.entities.LoadStop.filter({ load_id: id }, "stop_number", 20),
        base44.entities.RateConfirmation.filter({ load_id: id }, "-created_date", 1),
      ]);
      const l = loadData[0];
      setLoad(l);
      setRC(rcData[0] || null);
      setManifests(manifestData);
      setStops(stopsData);
      if (l?.driver_id) {
        const drivers = await base44.entities.Driver.filter({ id: l.driver_id }, "-created_date", 1);
        setDriver(drivers[0] || null);
      }
      // Load track point summary for replay badge
      base44.entities.GPSTrackPoint.filter({ load_id: id }, "timestamp", 1)
        .then(pts => setTrackStats({ count: pts.length })).catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="skeleton h-96 rounded-xl" />;
  if (!load) return (
    <div className="text-center py-16">
      <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <p className="text-slate-400">Load not found</p>
      <Link to="/loads" className="text-orange-400 text-sm mt-2 inline-block">← Back to Loads</Link>
    </div>
  );

  const currentIdx = WORKFLOW.findIndex(w => w.key === load.status);

  return (
    <div className="space-y-5 animate-slide-up max-w-4xl">
      {/* Back + Header */}
      <div>
        <Link to="/loads" className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit">
          <ChevronLeft className="w-4 h-4" /> Back to Loads
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-white font-heading font-bold text-2xl">
                {load.load_number || `#LD${load.id?.slice(-6).toUpperCase()}`}
              </h1>
              <StatusBadge status={load.status} />
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span>{load.origin_city}, {load.origin_state}</span>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <MapPin className="w-4 h-4 text-orange-400" />
              <span>{load.destination_city}, {load.destination_state}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right mr-2">
              <div className="text-green-400 font-bold text-2xl">${(load.rate || 0).toLocaleString()}</div>
              <div className="text-slate-500 text-sm">{load.miles ? `${load.miles} miles` : ""}</div>
            </div>
            <button onClick={() => setShowAssign(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-purple-500/20 bg-purple-500/8 text-purple-400 text-sm font-medium hover:bg-purple-500/15 transition-colors">
              <UserPlus className="w-4 h-4" /> Assign
            </button>
            <Link to={`/loads/${load.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-300 text-sm font-medium hover:text-white hover:bg-white/8 transition-colors">
              <Edit className="w-4 h-4" /> Edit
            </Link>
          </div>
        </div>
      </div>

      {showAssign && (
        <DriverAssignPanel
          load={load}
          onAssigned={(updated) => { setLoad(updated); setShowAssign(false); fetchData(); }}
          onClose={() => setShowAssign(false)}
        />
      )}

      {/* Progress Timeline */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        <h2 className="text-white font-medium mb-4">Load Progress</h2>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {WORKFLOW.map((step, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            return (
              <div key={step.key} className="flex items-center flex-shrink-0">
                <div className={`flex flex-col items-center ${active ? "scale-110" : ""}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                    done ? "bg-green-500" : active ? "bg-orange-500 animate-pulse-glow" : "bg-white/10"
                  }`}>
                    {done ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <Circle className="w-3.5 h-3.5 text-white/40" />}
                  </div>
                  <span className={`text-xs mt-1 text-center whitespace-nowrap ${
                    active ? "text-orange-400 font-medium" : done ? "text-green-400" : "text-slate-600"
                  }`} style={{ fontSize: "10px" }}>{step.label}</span>
                </div>
                {idx < WORKFLOW.length - 1 && (
                  <div className={`h-0.5 w-8 flex-shrink-0 mx-1 rounded-full mb-4 ${done ? "bg-green-500" : "bg-white/10"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit flex-wrap">
        {["details", "stops", "rc", "manifest", "documents"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-150 ${
              tab === t ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >{t}</button>
        ))}
        <Link
          to={`/loads/${id}/replay`}
          className="flex items-center gap-1.5 py-2 px-4 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-all duration-150 hover:bg-white/5"
        >
          <Play className="w-3.5 h-3.5" /> Trip Replay
        </Link>
      </div>

      {tab === "details" && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Load Info */}
          <div className="glass-card rounded-xl p-5 border border-white/5">
            <h3 className="text-white font-medium mb-4">Load Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "Equipment", value: load.equipment_type },
                { label: "Weight", value: load.weight ? `${load.weight.toLocaleString()} lbs` : "—" },
                { label: "Commodity", value: load.commodity },
                { label: "BOL #", value: load.bol_number },
                { label: "PO #", value: load.po_number },
                { label: "Pickup", value: load.pickup_date ? new Date(load.pickup_date).toLocaleString() : "—" },
                { label: "Delivery", value: load.delivery_date ? new Date(load.delivery_date).toLocaleString() : "—" },
                { label: "Rate", value: `$${(load.rate || 0).toLocaleString()}` },
                { label: "Fuel Surcharge", value: load.fuel_surcharge ? `$${load.fuel_surcharge}` : "—" },
                { label: "Total Revenue", value: load.total_revenue ? `$${load.total_revenue.toLocaleString()}` : "—" },
              ].map(item => (
                <div key={item.label} className="flex justify-between gap-2">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="text-white font-medium text-right">{item.value || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Driver Info */}
          <div className="glass-card rounded-xl p-5 border border-white/5">
            <h3 className="text-white font-medium mb-4">Assignment</h3>
            {driver ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                    <User className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">{driver.first_name} {driver.last_name}</div>
                    <div className="text-slate-500 text-xs">{driver.phone || driver.email}</div>
                  </div>
                  <StatusBadge status={driver.status} className="ml-auto" />
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <User className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No driver assigned</p>
              </div>
            )}

            {load.notes && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">Notes</div>
                <p className="text-slate-300 text-sm">{load.notes}</p>
              </div>
            )}
          </div>

          {/* Timeline History */}
          <div className="glass-card rounded-xl p-5 border border-white/5">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Event History
            </h3>
            <EntityTimeline entityId={load.id} entityType="Load" compact={false} />
          </div>
          </div>
          )}

      {tab === "stops" && (
        <div className="space-y-5">
          <div className="glass-card rounded-xl p-5 border border-white/5">
            <h3 className="text-white font-medium mb-4">Load Stops</h3>
            {stops.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No stops assigned to this load yet</p>
            ) : (
              <DriverStopWorkflow load={load} stops={stops} currentStopIdx={0} />
            )}
          </div>

          {/* Detention Billing Section */}
          {stops.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-white font-medium">Detention & Waiting Time</h3>
              {stops.map(stop => (
                <DetentionStopCard 
                  key={stop.id} 
                  load={load} 
                  stop={stop}
                  onRefresh={fetchData}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "rc" && (
        <div className="space-y-5">
          <RCSection load={load} />
          {rc && (
            <RCSigningPanel rc={rc} load={load} onUpdate={(updated) => { setRC(updated); fetchData(); }} />
          )}
        </div>
      )}

      {tab === "manifest" && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h3 className="text-white font-medium mb-5">Manifest Timeline</h3>
          {manifests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No manifest events yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {manifests.map((event, idx) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0 mt-1" />
                    {idx < manifests.length - 1 && <div className="w-0.5 flex-1 bg-white/10 mt-1" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{event.event_title || event.event_type}</span>
                      <span className="text-slate-600 text-xs">
                        {new Date(event.event_timestamp).toLocaleString()}
                      </span>
                    </div>
                    {event.event_description && (
                      <p className="text-slate-400 text-sm mt-0.5">{event.event_description}</p>
                    )}
                    {event.performed_by && (
                      <p className="text-slate-600 text-xs mt-1">By: {event.performed_by_role || "system"}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div className="glass-card rounded-xl p-5 border border-white/5">
          <h3 className="text-white font-medium mb-4">Documents</h3>
          <div className="space-y-3">
            {[
              { label: "Bill of Lading (BOL)", url: load.bol_url },
              { label: "Proof of Delivery (POD)", url: load.pod_url },
            ].map(doc => (
              <div key={doc.label} className="flex items-center justify-between p-3 rounded-lg bg-white/3 border border-white/5">
                <div className="flex items-center gap-3">
                  <FileText className={`w-5 h-5 ${doc.url ? "text-green-400" : "text-slate-600"}`} />
                  <span className="text-slate-300 text-sm">{doc.label}</span>
                </div>
                {doc.url ? (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="text-orange-400 text-xs hover:text-orange-300 transition-colors">
                    View →
                  </a>
                ) : (
                  <span className="text-slate-600 text-xs">Not uploaded</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}