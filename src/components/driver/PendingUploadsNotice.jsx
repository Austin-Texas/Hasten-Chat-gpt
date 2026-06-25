import { useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import { listPendingUploads } from "@/lib/pendingUploads";

export default function PendingUploadsNotice() {
  const [count, setCount] = useState(() => listPendingUploads().length);

  useEffect(() => {
    const refresh = () => setCount(listPendingUploads().length);
    window.addEventListener("hasten_pending_uploads_changed", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener("hasten_pending_uploads_changed", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);

  if (!count) return null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2">
      <UploadCloud className="h-4 w-4 flex-shrink-0" />
      <span>{count} upload{count === 1 ? "" : "s"} waiting for connection.</span>
    </div>
  );
}
