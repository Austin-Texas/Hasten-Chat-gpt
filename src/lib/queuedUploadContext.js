export function buildQueuedUploadContext({ targetId, targetType, fileRole, source, extra } = {}) {
  return {
    target_id: targetId || null,
    target_type: targetType || null,
    file_role: fileRole || null,
    source: source || "driver_upload",
    extra: extra || {},
  };
}

export function mergeQueuedUploadContext(item = {}, context = {}) {
  return {
    ...item,
    context: {
      ...(item.context || {}),
      ...context,
    },
  };
}

export function getQueuedUploadContext(item = {}) {
  return item.context || {};
}

export function hasQueuedUploadTarget(item = {}) {
  const context = getQueuedUploadContext(item);
  return Boolean(context.target_id && context.target_type);
}
