import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, FileText, CheckCircle2, XCircle, AlertTriangle, Eye } from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

export default function DocumentVersionHistory({ documentId, loadId }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) {
      fetchVersions();
    }
  }, [expanded]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      // Get the main document first
      const docs = await base44.entities.LoadDocument.filter(
        { id: documentId },
        "-created_date",
        1
      );

      if (docs.length === 0) {
        setLoading(false);
        return;
      }

      const mainDoc = docs[0];
      const chain = [mainDoc];

      // Follow the version chain backwards
      let currentDoc = mainDoc;
      while (currentDoc.previous_version_id) {
        const prevDocs = await base44.entities.LoadDocument.filter(
          { id: currentDoc.previous_version_id },
          "-created_date",
          1
        );
        if (prevDocs.length === 0) break;
        chain.push(prevDocs[0]);
        currentDoc = prevDocs[0];
      }

      // Reverse to show oldest first
      setVersions(chain.reverse());
    } catch (err) {
      console.error("Failed to fetch version history:", err);
    } finally {
      setLoading(false);
    }
  };

  if (versions.length <= 1) {
    return null; // No history to show
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Version History ({versions.length} versions)
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-slate-600 text-xs">Loading versions...</p>
          ) : (
            versions.map((version, idx) => {
              const isLatest = idx === versions.length - 1;
              return (
                <div
                  key={version.id}
                  className={`border rounded-lg p-2.5 text-xs space-y-1.5 ${
                    isLatest
                      ? "border-blue-500/30 bg-blue-500/5"
                      : "border-white/5 bg-white/[0.01]"
                  }`}
                >
                  {/* Version header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">v{version.version}</span>
                      {isLatest && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                          LATEST
                        </span>
                      )}
                    </div>
                    <StatusBadge status={version.status} />
                  </div>

                  {/* Upload info */}
                  <div className="text-slate-500">
                    Uploaded: {new Date(version.uploaded_at).toLocaleString()}
                  </div>

                  {/* Approval info */}
                  {version.status === "approved" && version.approved_at && (
                    <div className="flex items-center gap-1.5 text-green-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Approved {new Date(version.approved_at).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Rejection info */}
                  {version.status === "rejected" && version.rejection_reason && (
                    <div className="flex items-start gap-1.5 text-red-400">
                      <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <div>Rejected: {version.rejection_reason}</div>
                        <div className="text-red-500/70 text-[10px] mt-0.5">
                          {new Date(version.rejected_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reupload request info */}
                  {version.status === "reupload_requested" && version.reupload_reason && (
                    <div className="flex items-start gap-1.5 text-amber-400">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <div>Reupload Requested: {version.reupload_reason}</div>
                        <div className="text-amber-600/80 text-[10px] mt-0.5">
                          {new Date(version.reupload_requested_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {version.notes && (
                    <div className="bg-white/3 rounded p-1.5">
                      <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Notes</div>
                      <div className="text-slate-300 text-xs">{version.notes}</div>
                    </div>
                  )}

                  {/* View file link */}
                  {version.file_url && (
                    <a
                      href={version.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-blue-400 text-[10px] font-medium transition-colors"
                    >
                      <Eye className="w-2.5 h-2.5" />
                      View v{version.version}
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}