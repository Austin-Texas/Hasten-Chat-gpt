import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { DollarSign, Calendar } from 'lucide-react';
import SettlementPreview from '@/components/driver/SettlementPreview';

export default function DriverSettlementPreview({ user }) {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        let foundDriver = null;

        // Try to fetch using linkedDriverId from UserProfile first
        if (user?.linkedDriverId) {
          try {
            foundDriver = await base44.asServiceRole.entities.Driver.get(user.linkedDriverId);
          } catch (e) {
            console.warn('LinkedDriverId lookup failed, falling back to user_id filter');
          }
        }

        // Fallback: filter by user_id if linkedDriverId didn't work
        if (!foundDriver && user?.id) {
          const drivers = await base44.asServiceRole.entities.Driver.filter(
            { user_id: user.id },
            '-created_date',
            1
          );
          foundDriver = drivers[0] || null;
        }

        if (foundDriver) {
          setDriver(foundDriver);
        }
      } catch (err) {
        console.error('Error fetching driver:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id || user?.linkedDriverId) fetchDriver();
  }, [user?.id, user?.linkedDriverId]);

  if (loading) {
    return (
      <div className="space-y-5 animate-slide-up">
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  // Get week start/end dates
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-white font-heading font-bold text-2xl flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-orange-400" />
          Settlement Preview
        </h1>
        <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Week of {weekStart.toLocaleDateString()} – {weekEnd.toLocaleDateString()}
        </p>
      </div>

      {/* Preview */}
      {driver && <SettlementPreview driver={driver} />}
    </div>
  );
}