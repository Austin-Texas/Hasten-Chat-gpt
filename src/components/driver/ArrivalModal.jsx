import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * ArrivalModal — adapted from Hastenload-main secondary project.
 * Confirms arrival at pickup/delivery with photo proof.
 * IMPORTANT: Does NOT update Load.status directly. Calls updateLoadStatus backend function.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string} arrivalType - "pickup" | "delivery"
 * @param {object} load - the Load entity
 * @param {string} targetStatus - the status to transition to via updateLoadStatus (e.g. "arrived_pickup" | "arrived_delivery")
 */
export default function ArrivalModal({ isOpen, onClose, arrivalType, load, targetStatus }) {
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const arrivalTitle =
    arrivalType === "pickup" ? "Arrived at Pickup" : "Arrived at Delivery";
  const arrivalAddress =
    arrivalType === "pickup"
      ? `${load?.origin_address || ""}, ${load?.origin_city || ""}, ${load?.origin_state || ""}`
      : `${load?.destination_address || ""}, ${load?.destination_city || ""}, ${load?.destination_state || ""}`;
  const timestamp = new Date().toISOString();

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      setPhotos((prev) => [...prev, uploadResult.file_url]);
    } catch (err) {
      setError("Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmArrival = async () => {
    if (photos.length === 0) {
      setError("Please upload at least one photo for documentation.");
      return;
    }

    setConfirming(true);
    setError("");
    try {
      // Store photo URLs on the load record
      const photoField =
        arrivalType === "pickup" ? "bol_url" : "pod_url";
      const updateData = {};
      // If first photo, set as primary document URL
      if (photos.length > 0 && !load[photoField]) {
        updateData[photoField] = photos[0];
      }

      if (Object.keys(updateData).length > 0) {
        await base44.entities.Load.update(load.id, updateData);
      }

      // CRITICAL: Status transition goes through updateLoadStatus backend function
      await base44.functions.invoke("updateLoadStatus", {
        load_id: load.id,
        new_status: targetStatus,
      });

      // Create timeline event
      await base44.entities.TimelineEvent.create({
        entity_type: "Load",
        entity_id: load.id,
        event_type: "arrival_confirmed",
        description: `Driver confirmed arrival at ${arrivalType} location with ${photos.length} photo(s)`,
        metadata: JSON.stringify({
          arrival_type: arrivalType,
          timestamp,
          photos: photos,
          address: arrivalAddress,
        }),
      });

      onClose();
    } catch (err) {
      setError("Failed to confirm arrival: " + (err.message || "Unknown error"));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-green-400" />
            {arrivalTitle}
          </DialogTitle>
          <DialogDescription className="text-slate-400">{arrivalAddress}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Timestamp */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-sm text-green-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Arrival Time: {new Date(timestamp).toLocaleString()}</span>
            </p>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Freight Condition Photos
            </label>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-white/15 rounded-lg p-6 text-center hover:border-green-500/40 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 mx-auto text-green-400 mb-1 animate-spin" />
              ) : (
                <Camera className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              )}
              <p className="text-sm text-slate-400">
                {uploading ? "Uploading..." : "Tap to take or upload photo"}
              </p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />
          </div>

          {/* Photo Preview */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={photo}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-20 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Warning */}
          {photos.length === 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-400">
                At least one photo is required to confirm arrival.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmArrival}
              disabled={photos.length === 0 || confirming}
              className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold"
            >
              {confirming ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              {confirming ? "Confirming..." : "Confirm Arrival"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}