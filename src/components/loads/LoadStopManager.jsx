import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, MapPin, Clock, AlertCircle } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import StatusBadge from "@/components/hasten/StatusBadge";
import MultiStopMap from "@/components/loads/MultiStopMap";

export default function LoadStopManager({ stops = [], onStopsChange, disabled = false }) {
  const [localStops, setLocalStops] = useState(stops);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedStopIdx, setSelectedStopIdx] = useState(null);

  useEffect(() => {
    setLocalStops(stops);
  }, [stops]);

  const addStop = (type) => {
    const newStop = {
      stop_type: type,
      stop_number: localStops.length + 1,
      status: "pending",
      detention_free_minutes: 120,
      detention_rate_per_hour: 50,
      geofence_radius_meters: 500,
      documents_required: [],
    };
    const updated = [...localStops, newStop];
    setLocalStops(updated);
    onStopsChange(updated);
  };

  const deleteStop = (idx) => {
    const updated = localStops.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stop_number: i + 1 }));
    setLocalStops(updated);
    onStopsChange(updated);
  };

  const updateStop = (idx, field, value) => {
    const updated = [...localStops];
    updated[idx] = { ...updated[idx], [field]: value };
    setLocalStops(updated);
    onStopsChange(updated);
  };

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const updated = Array.from(localStops);
    const [removed] = updated.splice(source.index, 1);
    updated.splice(destination.index, 0, removed);
    const reordered = updated.map((s, i) => ({ ...s, stop_number: i + 1 }));
    setLocalStops(reordered);
    onStopsChange(reordered);
  };

  const pickupCount = localStops.filter(s => s.stop_type === "pickup").length;
  const deliveryCount = localStops.filter(s => s.stop_type === "delivery").length;
  const isValid = pickupCount > 0 && deliveryCount > 0;

  return (
    <div className="space-y-5">
      {/* Route Map */}
      <MultiStopMap
        stops={localStops}
        selectedStopIdx={selectedStopIdx}
        onStopClick={setSelectedStopIdx}
      />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-sm">Load Stops</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {pickupCount} pickup{pickupCount !== 1 ? "s" : ""} · {deliveryCount} delivery{deliveryCount !== 1 ? "ies" : ""}
          </p>
        </div>
        {!isValid && localStops.length > 0 && (
          <div className="flex items-center gap-1 text-amber-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Need at least 1 pickup & 1 delivery</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => addStop("pickup")}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/25 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Pickup
        </button>
        <button
          onClick={() => addStop("delivery")}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/25 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Delivery
        </button>
      </div>

      {localStops.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">No stops yet. Add at least one pickup and one delivery.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="stops">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {localStops.map((stop, idx) => (
                  <Draggable key={idx} draggableId={`stop-${idx}`} index={idx} isDragDisabled={disabled}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        onClick={() => setSelectedStopIdx(idx)}
                        className={`glass-card rounded-lg p-4 border cursor-pointer transition-colors ${
                          snapshot.isDragging ? "bg-orange-500/10 border-orange-500/30" : ""
                        } ${
                          selectedStopIdx === idx ? "border-orange-500/30 bg-orange-500/5" : "border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div {...provided.dragHandleProps} className="text-slate-600 hover:text-white cursor-grab">
                            <GripVertical className="w-4 h-4 mt-1" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold">
                                  {stop.stop_number}
                                </div>
                                <StatusBadge status={stop.stop_type === "pickup" ? "open" : "completed"} />
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3 text-xs">
                              <input
                                type="text"
                                placeholder="Facility name"
                                value={stop.facility_name || ""}
                                onChange={e => updateStop(idx, "facility_name", e.target.value)}
                                disabled={disabled}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/40"
                              />
                              <input
                                type="text"
                                placeholder="Address"
                                value={stop.address || ""}
                                onChange={e => updateStop(idx, "address", e.target.value)}
                                disabled={disabled}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/40"
                              />
                              <input
                                type="text"
                                placeholder="City"
                                value={stop.city || ""}
                                onChange={e => updateStop(idx, "city", e.target.value)}
                                disabled={disabled}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/40"
                              />
                              <input
                                type="text"
                                placeholder="State"
                                value={stop.state || ""}
                                onChange={e => updateStop(idx, "state", e.target.value)}
                                disabled={disabled}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/40"
                              />
                              <input
                                type="text"
                                placeholder="Contact name"
                                value={stop.contact_name || ""}
                                onChange={e => updateStop(idx, "contact_name", e.target.value)}
                                disabled={disabled}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/40"
                              />
                              <input
                                type="tel"
                                placeholder="Contact phone"
                                value={stop.contact_phone || ""}
                                onChange={e => updateStop(idx, "contact_phone", e.target.value)}
                                disabled={disabled}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/40"
                              />
                              <input
                                type="datetime-local"
                                placeholder="Appt start"
                                value={stop.appointment_start ? new Date(stop.appointment_start).toISOString().slice(0, 16) : ""}
                                onChange={e => updateStop(idx, "appointment_start", new Date(e.target.value).toISOString())}
                                disabled={disabled}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-orange-500/40 text-xs"
                              />
                              <input
                                type="datetime-local"
                                placeholder="Appt end"
                                value={stop.appointment_end ? new Date(stop.appointment_end).toISOString().slice(0, 16) : ""}
                                onChange={e => updateStop(idx, "appointment_end", new Date(e.target.value).toISOString())}
                                disabled={disabled}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-orange-500/40 text-xs"
                              />
                            </div>

                            {stop.notes && (
                              <p className="text-slate-400 text-xs mt-2 italic">{stop.notes}</p>
                            )}
                          </div>

                          <button
                            onClick={() => deleteStop(idx)}
                            disabled={disabled}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}