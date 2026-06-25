import { listPendingUploads, savePendingUploads } from "@/lib/pendingUploads";
import { buildQueuedUploadRecordActions } from "@/lib/queuedUploadRecordActions";

export function dataUrlToFile(dataUrl, filename = "upload", mimeType = "application/octet-stream") {
  const [meta, data] = String(dataUrl || "").split(",");
  if (!meta || !data) throw new Error("Invalid queued upload data");
  const resolvedType = meta.match(/data:(.*?);base64/)?.[1] || mimeType;
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], filename, { type: resolvedType });
}

function publishRetryResult(result) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hasten_pending_uploads_retried", { detail: result }));
}

export async function retryPendingUploads(uploadFile) {
  if (typeof uploadFile !== "function") throw new Error("uploadFile function is required");
  const pending = listPendingUploads();
  const remaining = [];
  const completed = [];

  for (const item of pending) {
    try {
      const file = dataUrlToFile(item.data, item.name, item.type);
      const result = await uploadFile(file, item);
      completed.push({ ...item, file_url: result?.file_url || result?.url, uploadedAt: Date.now() });
    } catch (error) {
      remaining.push({ ...item, lastError: error?.message || "Upload retry failed", lastTriedAt: Date.now() });
    }
  }

  const actions = buildQueuedUploadRecordActions(completed);
  const retryResult = { completed, remaining, actions };
  savePendingUploads(remaining);
  publishRetryResult(retryResult);
  return retryResult;
}
