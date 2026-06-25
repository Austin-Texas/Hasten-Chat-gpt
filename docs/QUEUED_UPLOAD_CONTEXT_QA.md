# Queued Upload Context QA

## Purpose

Queued uploads need context so retry logic can later attach the uploaded file to the correct HASTEN record.

## Helper

- `src/lib/queuedUploadContext.js`

## Automated check

```bash
node scripts/verifyQueuedUploadContext.mjs
```

## Expected context fields

- `target_id`
- `target_type`
- `file_role`
- `source`
- `extra`

## Example future usage

A queued driver scan upload can store:

```js
buildQueuedUploadContext({
  targetId: load.id,
  targetType: "load",
  fileRole: "pod",
  source: "driver_scan",
});
```

## Next recommended wiring

Update upload components to include context when queuing files offline.
