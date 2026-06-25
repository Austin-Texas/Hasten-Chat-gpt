# Driver Load Detail Upload Context QA

## Purpose

Driver Load Detail uploads should carry context when queued offline, so retry logic can later attach the file to the correct HASTEN record.

## Local wiring

```bash
node scripts/applyDriverLoadDetailUploadContext.mjs
```

Or run all recommended patches:

```bash
node scripts/applyRecommendedPatches.mjs
```

## Expected wiring

- BOL upload uses `targetId={load.id}` and `targetType="load"`.
- POD upload uses `targetId={load.id}` and `targetType="load"`.
- Receipt upload uses `targetId={load.id}` and `targetType="load_expense"`.

## Automated check

```bash
node scripts/reportPendingPatches.mjs
```

## Runtime test

- Open `/driver/loads/:id`.
- Turn network off.
- Queue a BOL upload.
- Queue a POD upload.
- Queue a receipt upload.
- Turn network back on.
- Retry uploads.
- Confirm each queued item includes target context before future attachment handling is added.
