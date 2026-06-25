const STORAGE_KEY = "hasten_pending_uploads";

export function listPendingUploads() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function savePendingUploads(items = []) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("hasten_pending_uploads_changed", { detail: items }));
}

export function addPendingUpload(item) {
  const next = [...listPendingUploads(), { ...item, queuedAt: item.queuedAt || Date.now() }];
  savePendingUploads(next);
  return next;
}

export function clearPendingUploads() {
  savePendingUploads([]);
}

export function pendingUploadCount() {
  return listPendingUploads().length;
}
