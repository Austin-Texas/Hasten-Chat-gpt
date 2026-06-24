import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Loader2, Check, AlertCircle, ChevronLeft } from "lucide-react";
import CameraUpload from "@/components/driver/CameraUpload";

export default function DriverProfileEdit({ user }) {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        const drivers = await base44.entities.Driver.filter({ user_id: user?.id }, "-created_date", 1);
        if (drivers.length > 0) {
          setDriver(drivers[0]);
          setFormData({
            phone: drivers[0].phone || "",
            home_city: drivers[0].home_city || "",
            home_state: drivers[0].home_state || "",
            home_zip: drivers[0].home_zip || "",
            emergency_contact_name: drivers[0].emergency_contact_name || "",
            emergency_contact_phone: drivers[0].emergency_contact_phone || "",
            preferred_language: drivers[0].preferred_language || "en",
            preferred_distance_unit: drivers[0].preferred_distance_unit || "miles",
            preferred_weight_unit: drivers[0].preferred_weight_unit || "lbs",
          });
        }
      } catch (err) {
        console.error("Error fetching driver:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchDriver();
  }, [user?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const handlePhotoUpload = async (file_url) => {
    try {
      setFormData(prev => ({ ...prev, profile_photo_url: file_url }));
      await base44.entities.Driver.update(driver.id, { profile_photo_url: file_url });
      setSuccess("Photo updated!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      console.error("Error saving photo:", err);
      setError("Failed to save photo");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!driver) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await base44.entities.Driver.update(driver.id, formData);
      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        navigate("/driver/profile");
      }, 1500);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="space-y-4 pb-24">
        <div className="glass-card rounded-xl p-6 border border-red-500/20 bg-red-500/5 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-semibold">No profile found</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 pb-24 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2 pb-4">
        <button
          type="button"
          onClick={() => navigate("/driver/profile")}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">Edit Profile</h1>
        <div className="w-9" />
      </div>

      {/* Messages */}
      {success && (
        <div className="mx-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="mx-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Profile Photo */}
      <div className="glass-card rounded-xl p-5 border border-white/5 mx-4">
        <h3 className="text-white font-semibold text-sm mb-4">Profile Photo</h3>
        <div className="flex justify-center mb-4">
          {driver.profile_photo_url ? (
            <img
              src={driver.profile_photo_url}
              alt="Profile"
              className="w-32 h-32 rounded-xl object-cover border-2 border-orange-500/40"
            />
          ) : (
            <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-orange-500/20 to-blue-500/20 border-2 border-orange-500/40 flex items-center justify-center">
              <span className="text-orange-400 font-bold text-3xl">
                {(driver.first_name?.[0] || "D").toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <CameraUpload
          label="Upload Photo"
          accept="image/*"
          docType="profile_photo"
          onUploaded={handlePhotoUpload}
        />
      </div>

      {/* Contact Info */}
      <div className="glass-card rounded-xl p-5 border border-white/5 mx-4 space-y-4">
        <h3 className="text-white font-semibold text-sm">Contact Information</h3>

        <div>
          <label className="block text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
              City
            </label>
            <input
              type="text"
              name="home_city"
              value={formData.home_city}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
              State
            </label>
            <input
              type="text"
              name="home_state"
              value={formData.home_state}
              onChange={handleInputChange}
              maxLength="2"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors uppercase"
              placeholder="NY"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
              ZIP
            </label>
            <input
              type="text"
              name="home_zip"
              value={formData.home_zip}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
              placeholder="10001"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="glass-card rounded-xl p-5 border border-white/5 mx-4 space-y-4">
        <h3 className="text-white font-semibold text-sm">Emergency Contact</h3>

        <div>
          <label className="block text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
            Name
          </label>
          <input
            type="text"
            name="emergency_contact_name"
            value={formData.emergency_contact_name}
            onChange={handleInputChange}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="block text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
            Phone
          </label>
          <input
            type="tel"
            name="emergency_contact_phone"
            value={formData.emergency_contact_phone}
            onChange={handleInputChange}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            placeholder="+1 (555) 987-6543"
          />
        </div>
      </div>

      {/* Preferences */}
      <div className="glass-card rounded-xl p-5 border border-white/5 mx-4 space-y-4">
        <h3 className="text-white font-semibold text-sm">Preferences</h3>

        <div>
          <label className="block text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
            Language
          </label>
          <select
            name="preferred_language"
            value={formData.preferred_language}
            onChange={handleInputChange}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="pt">Portuguese</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
              Distance Unit
            </label>
            <select
              name="preferred_distance_unit"
              value={formData.preferred_distance_unit}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            >
              <option value="miles">Miles</option>
              <option value="km">Kilometers</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
              Weight Unit
            </label>
            <select
              name="preferred_weight_unit"
              value={formData.preferred_weight_unit}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/40 transition-colors"
            >
              <option value="lbs">Pounds (lbs)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="px-4">
        <button
          type="submit"
          disabled={saving}
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:opacity-50 text-white font-bold transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}