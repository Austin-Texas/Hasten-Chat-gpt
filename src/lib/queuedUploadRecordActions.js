import { getQueuedUploadContext, hasQueuedUploadTarget } from "@/lib/queuedUploadContext";

const LOAD_FILE_FIELDS = {
  bol: "bol_url",
  pod: "pod_url",
  receipt: "receipt_url",
};

export function getCompletedUploadUrl(item = {}) {
  return item.file_url || item.url || item.uploaded_url || null;
}

export function buildQueuedUploadRecordAction(item = {}) {
  if (!hasQueuedUploadTarget(item)) return null;
  const context = getQueuedUploadContext(item);
  const fileUrl = getCompletedUploadUrl(item);
  if (!fileUrl) return null;

  if (context.target_type === "load") {
    const field = LOAD_FILE_FIELDS[context.file_role] || `${context.file_role || "document"}_url`;
    return {
      entity: "Load",
      id: context.target_id,
      updates: { [field]: fileUrl },
      context,
    };
  }

  if (context.target_type === "load_expense") {
    return {
      entity: "Expense",
      id: context.target_id,
      updates: { receipt_url: fileUrl },
      context,
    };
  }

  return {
    entity: context.target_type,
    id: context.target_id,
    updates: { file_url: fileUrl },
    context,
  };
}

export function buildQueuedUploadRecordActions(items = []) {
  return items.map(buildQueuedUploadRecordAction).filter(Boolean);
}
