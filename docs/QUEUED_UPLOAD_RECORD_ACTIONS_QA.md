# Queued Upload Record Actions QA

## Purpose

When a queued upload retries successfully, the app should know what HASTEN record should receive the uploaded file URL.

## Helpers

- `src/lib/queuedUploadRecordActions.js`
- `src/lib/pendingUploadRetry.js`

## Verification

```bash
node scripts/verifyQueuedUploadRecordActions.mjs
```

## Current behavior

`retryPendingUploads()` now returns:

- `completed`
- `remaining`
- `actions`

It also emits a browser event:

```js
hasten_pending_uploads_retried
```

## Action examples

- BOL upload context maps to `Load` update `{ bol_url }`.
- POD upload context maps to `Load` update `{ pod_url }`.
- Receipt upload context maps to `Expense` update `{ receipt_url }`.

## Next recommended wiring

Add a small handler that listens for `hasten_pending_uploads_retried` and applies the returned action updates through the Base44 entity API.
