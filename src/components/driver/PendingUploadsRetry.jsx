import { useEffect, useState } from "react";
import { RefreshCw, UploadCloud } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { listPendingUploads } from "@/lib/pendingUploads";
import { retryPendingUploads } from "@/lib/pendingUploadRetry";

export default function PendingUploadsRetry() {
  const [count, setCount] = useState(() => listPendingUploads().length);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = () => setCount(listPendingUploads().length);

  useEffect(() => {
    window.addEventListener("hasten_pending_uploads_changed", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("hasten_pending_uploads_changed", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const retry = async () => {
    if (!count || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await retryPendingUploads((file) => base44.integrations.Core.UploadFile({ file }));
      setCount(result.remaining.length);
      setMessage(`${result.completed.length} upload${result.completed.length === 1 ? "" : "s"} retried. ${result.remaining.length} remaining.`);
    } catch (error) {
      setMessage(error?.message || "Retry failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!count && !message) return null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200 space-y-2">
      <div className="flex items-center gap-2">
        <UploadCloud className="h-4 w-4 flex-shrink-0" />
        <span>{count} upload{count === 1 ? "" : "s"} waiting to retry.</span>
      </div>
      <button
        onClick={retry}
        disabled={!count || busy}
        className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black disabled:opacity-50"
      >
        <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
        Retry uploads
      </button>
      {message && <div className="text-xs text-amber-100/80">{message}</div>}
    </div>
  );
}
