const STATUS_CONFIG = {
  // Load statuses
  available: { label: "Available", class: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  assigned: { label: "Assigned", class: "bg-purple-500/15 text-purple-400 border-purple-500/25" },
  accepted: { label: "Accepted", class: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25" },
  en_route: { label: "En Route", class: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
  arrived_pickup: { label: "Arrived Pickup", class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
  loaded: { label: "Loaded", class: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  in_transit: { label: "In Transit", class: "bg-blue-500/15 text-blue-300 border-blue-500/25" },
  arrived_delivery: { label: "Arrived Delivery", class: "bg-teal-500/15 text-teal-400 border-teal-500/25" },
  delivered: { label: "Delivered", class: "bg-green-500/15 text-green-400 border-green-500/25" },
  pod_uploaded: { label: "POD Uploaded", class: "bg-green-500/15 text-green-300 border-green-500/25" },
  completed: { label: "Completed", class: "bg-slate-500/15 text-slate-300 border-slate-500/25" },
  cancelled: { label: "Cancelled", class: "bg-red-500/15 text-red-400 border-red-500/25" },
  // Driver statuses
  on_load: { label: "On Load", class: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
  off_duty: { label: "Off Duty", class: "bg-slate-500/15 text-slate-400 border-slate-500/25" },
  hos_violation: { label: "HOS Violation", class: "bg-red-500/15 text-red-400 border-red-500/25" },
  inactive: { label: "Inactive", class: "bg-slate-600/15 text-slate-500 border-slate-600/25" },
  // Truck statuses
  active: { label: "Active", class: "bg-green-500/15 text-green-400 border-green-500/25" },
  idle: { label: "Idle", class: "bg-slate-500/15 text-slate-400 border-slate-500/25" },
  maintenance: { label: "Maintenance", class: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  out_of_service: { label: "Out of Service", class: "bg-red-500/15 text-red-400 border-red-500/25" },
  // Invoice statuses
  draft: { label: "Draft", class: "bg-slate-500/15 text-slate-400 border-slate-500/25" },
  sent: { label: "Sent", class: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  paid: { label: "Paid", class: "bg-green-500/15 text-green-400 border-green-500/25" },
  overdue: { label: "Overdue", class: "bg-red-500/15 text-red-400 border-red-500/25" },
  pending: { label: "Pending", class: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  approved: { label: "Approved", class: "bg-green-500/15 text-green-400 border-green-500/25" },
  rejected: { label: "Rejected", class: "bg-red-500/15 text-red-400 border-red-500/25" },
  open: { label: "Open", class: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  in_progress: { label: "In Progress", class: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
  resolved: { label: "Resolved", class: "bg-green-500/15 text-green-400 border-green-500/25" },
  // Priority
  critical: { label: "Critical", class: "bg-red-500/15 text-red-400 border-red-500/25" },
  high: { label: "High", class: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
  medium: { label: "Medium", class: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  low: { label: "Low", class: "bg-slate-500/15 text-slate-400 border-slate-500/25" },
};

export default function StatusBadge({ status, className = "" }) {
  const config = STATUS_CONFIG[status] || { label: status, class: "bg-slate-500/15 text-slate-400 border-slate-500/25" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${config.class} ${className}`}>
      {config.label}
    </span>
  );
}