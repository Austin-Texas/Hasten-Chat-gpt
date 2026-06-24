import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  MapPin, Clock, Phone, AlignLeft, CheckCircle2, AlertTriangle,
  Camera, FileText, Loader2, ChevronDown, ChevronUp, Navigation
} from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function DriverStopWorkflow({ load, stops, currentStopIdx = 0 }) {
  const [expandedStopIdx, setExpandedStopIdx] = useState(0);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [stopDocuments, setStopDocuments] = useState({});

  const currentStop = stops[currentStopIdx];

  const markStopArrived = async () => {
    if (!currentStop || !load?.driver_id) return;
    setActionInProgress(true);
    try {
      await base44.entities.LoadStop.update(currentStop.id, {
        status: "arrived",
        arrived_at: new Date().toISOString(),
      });

      // Create manifest event
      await base44.entities.Manifest.create({
        load_id: load.id,
        event_type: "stop_arrived",
        event_title: `Arrived at Stop ${currentStop.stop_number}`,
        event_description: `${currentStop.facility_name || currentStop.city}, ${currentStop.state}`,
        event_timestamp: new Date().toISOString(),
        performed_by: load.driver_id,
        performed_by_role: "driver",
      }).catch(() => {});

      // Notify dispatcher of arrival
      await base44.entities.Notification.create({
        user_id: load.dispatcher_id,
        role: "dispatcher",
        title: "Stop Arrival Alert",
        message: `Driver arrived at Stop ${currentStop.stop_number}: ${currentStop.facility_name || currentStop.city}, ${currentStop.state}`,
        type: "custom",
        priority: "normal",
        related_entity_type: "Load",
        related_entity_id: load.id,
        delivery_channels: ["in_app"],
        action_url: `/loads/${load.id}`,
        cta_label: "View Load",
      }).catch(() => {});

      // Audit log
      await base44.entities.AuditLog.create({
        action: "stop_arrived",
        user_id: load.driver_id,
        user_role: "driver",
        entity_type: "LoadStop",
        entity_id: currentStop.id,
        action_details: `Driver arrived at stop ${currentStop.stop_number}`,
        result: "success",
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      alert("Stop marked as arrived");
    } catch (err) {
      console.error(err);
      alert("Failed to mark arrival");
    } finally {
      setActionInProgress(false);
    }
  };

  const markStopDeparted = async () => {
    if (!currentStop || !load?.driver_id) return;
    setActionInProgress(true);
    try {
      await base44.entities.LoadStop.update(currentStop.id, {
        status: "completed",
        departed_at: new Date().toISOString(),
      });

      // Auto-transition load to 'in_transit' if this is the first pickup stop
      const isFirstPickup = currentStop.stop_type === "pickup" && currentStop.stop_number === 1;
      if (isFirstPickup && load.status !== "in_transit") {
        await base44.entities.Load.update(load.id, {
          status: "in_transit",
        });

        // Manifest event for status change
        await base44.entities.Manifest.create({
          load_id: load.id,
          event_type: "load_status_changed",
          event_title: "Load In Transit",
          event_description: "Load automatically transitioned to In Transit after first pickup completion",
          event_timestamp: new Date().toISOString(),
          performed_by: load.driver_id,
          performed_by_role: "driver",
        }).catch(() => {});

        // Audit log for auto-transition
        await base44.entities.AuditLog.create({
          action: "load_status_changed",
          user_id: load.driver_id,
          user_role: "driver",
          entity_type: "Load",
          entity_id: load.id,
          action_details: "Load auto-transitioned to 'in_transit' after first pickup completion",
          result: "success",
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      // Create manifest event
      await base44.entities.Manifest.create({
        load_id: load.id,
        event_type: "stop_departed",
        event_title: `Departed Stop ${currentStop.stop_number}`,
        event_description: `${currentStop.facility_name || currentStop.city}, ${currentStop.state}`,
        event_timestamp: new Date().toISOString(),
        performed_by: load.driver_id,
        performed_by_role: "driver",
      }).catch(() => {});

      // Audit log
      await base44.entities.AuditLog.create({
        action: "stop_departed",
        user_id: load.driver_id,
        user_role: "driver",
        entity_type: "LoadStop",
        entity_id: currentStop.id,
        action_details: `Driver departed stop ${currentStop.stop_number}`,
        result: "success",
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      alert("Stop marked as completed" + (isFirstPickup && load.status !== "in_transit" ? " — Load now in transit" : ""));
    } catch (err) {
      console.error(err);
      alert("Failed to mark departure");
    } finally {
      setActionInProgress(false);
    }
  };

  const reportStopIssue = async (issue) => {
    if (!currentStop || !load?.driver_id) return;
    setActionInProgress(true);
    try {
      await base44.entities.LoadStop.update(currentStop.id, {
        status: "issue",
        issue_reported: issue,
        issue_reported_at: new Date().toISOString(),
      });

      // Notify dispatcher
      await base44.entities.Notification.create({
        user_id: load.dispatcher_id,
        role: "dispatcher",
        title: "Stop Issue Reported",
        message: `Driver reported issue at stop ${currentStop.stop_number}: ${issue}`,
        type: "custom",
        priority: "high",
        related_entity_type: "Load",
        related_entity_id: load.id,
        delivery_channels: ["in_app"],
      }).catch(() => {});

      alert("Issue reported to dispatcher");
    } catch (err) {
      console.error(err);
      alert("Failed to report issue");
    } finally {
      setActionInProgress(false);
    }
  };

  if (!currentStop) {
    return (
      <div className="text-center py-8 text-slate-400">
        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">No stops available for this load</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Stop Highlight */}
      <div className="glass-card rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
                {currentStop.stop_number}
              </div>
              <h3 className="text-white font-semibold">{currentStop.facility_name || `${currentStop.city}, ${currentStop.state}`}</h3>
              <StatusBadge status={currentStop.status} />
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
              <MapPin className="w-4 h-4" />
              <span>{currentStop.address || "—"}</span>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/25 transition-colors">
            <Navigation className="w-3.5 h-3.5" />
            Navigate
          </button>
        </div>

        {currentStop.appointment_start && (
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {new Date(currentStop.appointment_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} —{" "}
              {new Date(currentStop.appointment_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}

        {currentStop.contact_name && (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Phone className="w-3.5 h-3.5" />
            <span>{currentStop.contact_name}</span>
            {currentStop.contact_phone && <span className="text-slate-500">({currentStop.contact_phone})</span>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        {currentStop.status === "pending" && (
          <button
            onClick={markStopArrived}
            disabled={actionInProgress}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors col-span-2"
          >
            {actionInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {actionInProgress ? "Marking..." : "Mark Arrived"}
          </button>
        )}

        {(currentStop.status === "arrived" || currentStop.status === "loading") && (
          <button
            onClick={markStopDeparted}
            disabled={actionInProgress}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600 disabled:opacity-50 transition-colors col-span-2"
          >
            {actionInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {actionInProgress ? "Completing..." : "Mark Completed"}
          </button>
        )}

        {currentStop.status !== "completed" && (
          <button
            onClick={() => reportStopIssue("Delay/issue at stop")}
            disabled={actionInProgress}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/25 disabled:opacity-50 transition-colors"
          >
            {actionInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Report Issue
          </button>
        )}

        <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/25 transition-colors">
          <Camera className="w-4 h-4" />
          Photo
        </button>
      </div>

      {/* Issue Alert */}
      {currentStop.status === "issue" && currentStop.issue_reported && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <div className="flex gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-red-400 text-xs font-semibold">Issue Reported</div>
              <div className="text-red-200/80 text-xs mt-1">{currentStop.issue_reported}</div>
            </div>
          </div>
        </div>
      )}

      {/* All Stops Timeline */}
      <div className="space-y-2">
        <h4 className="text-white font-semibold text-xs uppercase tracking-wider">All Stops</h4>
        {stops.map((stop, idx) => (
          <button
            key={stop.id}
            onClick={() => setExpandedStopIdx(expandedStopIdx === idx ? -1 : idx)}
            className={`w-full text-left glass-card rounded-lg p-3 border transition-colors ${
              idx === currentStopIdx
                ? "border-orange-500/30 bg-orange-500/5"
                : "border-white/5 hover:border-white/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {stop.stop_number}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-medium truncate">{stop.facility_name || `${stop.city}, ${stop.state}`}</p>
                  <p className="text-slate-500 text-xs">{stop.stop_type}</p>
                </div>
                <StatusBadge status={stop.status} />
              </div>
              {expandedStopIdx === idx ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
            </div>

            {expandedStopIdx === idx && (
              <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs">
                {stop.address && <p className="text-slate-400"><span className="text-slate-500">Address:</span> {stop.address}</p>}
                {stop.contact_name && <p className="text-slate-400"><span className="text-slate-500">Contact:</span> {stop.contact_name}</p>}
                {stop.appointment_start && (
                  <p className="text-slate-400">
                    <span className="text-slate-500">Appt:</span> {new Date(stop.appointment_start).toLocaleString()}
                  </p>
                )}
                {stop.arrived_at && (
                  <p className="text-green-400">
                    <span className="text-slate-500">Arrived:</span> {new Date(stop.arrived_at).toLocaleTimeString()}
                  </p>
                )}
                {stop.departed_at && (
                  <p className="text-slate-400">
                    <span className="text-slate-500">Departed:</span> {new Date(stop.departed_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}