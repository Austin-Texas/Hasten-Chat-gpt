import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import MobileEmptyState from "@/components/driver/MobileEmptyState";
import DriverAccessDenied from "@/components/driver/DriverAccessDenied";
import DriverLoadDetail from "@/pages/driver/DriverLoadDetail";
import { loadBelongsToDriver } from "@/lib/driverLoadAccess";

async function fetchLoadById(id) {
  if (!id) return null;
  try {
    return await base44.entities.Load.get(id);
  } catch {
    const loads = await base44.entities.Load.filter({ id }, "-created_date", 1).catch(() => []);
    return loads?.[0] || null;
  }
}

export default function DriverLoadDetailAccessGate({ user }) {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, allowed: false, found: true });

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        const [load, drivers] = await Promise.all([
          fetchLoadById(id),
          user?.id ? base44.entities.Driver.filter({ user_id: user.id }, "-created_date", 1) : Promise.resolve([]),
        ]);
        const driverRecord = drivers?.[0] || null;
        if (!mounted) return;
        setState({
          loading: false,
          found: Boolean(load),
          allowed: Boolean(load && loadBelongsToDriver(load, user, driverRecord)),
        });
      } catch (error) {
        console.error("Driver load access check failed", error);
        if (mounted) setState({ loading: false, found: false, allowed: false });
      }
    };

    checkAccess();
    return () => { mounted = false; };
  }, [id, user?.id, user?.linkedDriverId, user?.driver_id]);

  if (state.loading) {
    return (
      <div className="space-y-4 animate-slide-up">
        <div className="skeleton h-12 rounded-xl" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    );
  }

  if (!state.found) {
    return <MobileEmptyState title="Load not found" message="This load could not be found." />;
  }

  if (!state.allowed) {
    return <DriverAccessDenied />;
  }

  return <DriverLoadDetail user={user} />;
}
