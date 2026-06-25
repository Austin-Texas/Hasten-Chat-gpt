import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function DriverAccessDenied({ message = "This load is not assigned to your driver profile." }) {
  return (
    <div className="glass-card rounded-xl border border-red-500/20 bg-red-500/10 p-10 text-center">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
      <p className="font-semibold text-red-100">Access denied</p>
      <p className="mt-1 text-sm text-red-200/80">{message}</p>
      <Link to="/driver/loads" className="mt-4 inline-flex rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white">
        Back to My Loads
      </Link>
    </div>
  );
}
