export function summarizeQueuedUploadRetry(result = {}) {
  const completed = Array.isArray(result.completed) ? result.completed : [];
  const remaining = Array.isArray(result.remaining) ? result.remaining : [];
  const actions = Array.isArray(result.actions) ? result.actions : [];

  return {
    completed_count: completed.length,
    remaining_count: remaining.length,
    action_count: actions.length,
    has_failures: remaining.length > 0,
    has_actions: actions.length > 0,
  };
}

export function queuedUploadRetryMessage(result = {}) {
  const summary = summarizeQueuedUploadRetry(result);
  return `${summary.completed_count} upload${summary.completed_count === 1 ? "" : "s"} retried. ${summary.remaining_count} remaining.`;
}
