import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, CheckCircle, Clock, DollarSign, ShieldCheck, AlertTriangle } from "lucide-react";

export default function Factoring() {
  const [factoringCompanies, setFactoringCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.FactoringCompany.list("-created_date", 50)
      .then((records) => setFactoringCompanies(records || []))
      .catch((error) => {
        console.warn("[Factoring] Failed to load factoring companies:", error?.message || error);
        setFactoringCompanies([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeCount = factoringCompanies.filter((company) => company.status === "active").length;
  const pendingCount = factoringCompanies.filter((company) => company.status === "pending" || company.status === "review").length;

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white font-heading">
            <Building2 className="h-6 w-6 text-green-400" />
            Factoring
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage factoring partners, payment rules, remittance settings, and risk visibility for HASTEN Cargo LLC.
          </p>
        </div>
        <button className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-300 hover:bg-green-500/15">
          + Add Factoring Partner
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="glass-card rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-500">Partners</span>
            <Building2 className="h-4 w-4 text-green-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{factoringCompanies.length}</div>
        </div>
        <div className="glass-card rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-500">Active</span>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{activeCount}</div>
        </div>
        <div className="glass-card rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-500">Pending</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{pendingCount}</div>
        </div>
        <div className="glass-card rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-500">Driver Deduction Rule</span>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-sm font-semibold text-green-300">Approved advances only</div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-amber-300">Owner-operator settlement protection</h2>
            <p className="mt-1 text-sm text-slate-300">
              Do not deduct fuel, tolls, repairs, maintenance, insurance, or factoring-related charges from a driver unless HASTEN advanced the money, the driver requested/approved it, and the contract allows the deduction.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-xl border border-white/5">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Connected Factoring Partners</h2>
            <p className="text-xs text-slate-500">Compact operational view for finance/admin.</p>
          </div>
          <DollarSign className="h-4 w-4 text-green-400" />
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm text-slate-400">Loading factoring partners...</div>
        ) : factoringCompanies.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="font-medium text-slate-300">No factoring partners configured yet.</p>
            <p className="mt-1 text-sm text-slate-500">Add one when HASTEN is ready to connect factoring payment workflows.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Payment Terms</th>
                  <th className="px-4 py-3">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {factoringCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-medium text-white">{company.name || company.company_name || "Factoring Partner"}</td>
                    <td className="px-4 py-3 text-slate-300">{company.status || "draft"}</td>
                    <td className="px-4 py-3 text-slate-300">{company.fee_percent ? `${company.fee_percent}%` : "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{company.payment_terms || "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{company.contact_email || company.contact_phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
