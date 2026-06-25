# Pending Upload Retry QA

## Purpose

Driver document uploads can be queued when the device is offline. These helpers add a visible retry path for queued uploads.

## Files

- `src/lib/pendingUploads.js`
- `src/lib/pendingUploadRetry.js`
- `src/components/driver/PendingUploadsNotice.jsx`
- `src/components/driver/PendingUploadsRetry.jsx`
- `scripts/applyPendingUploadsRetryToScan.mjs`

## Apply local wiring

```bash
node scripts/applyPendingUploadsRetryToScan.mjs
```

Or run all recommended patches:

```bash
node scripts/applyRecommendedPatches.mjs
```

## Automated checks

```bash
node scripts/checkPendingUploadRetryWiring.mjs
node scripts/reportPendingPatches.mjs
```

## Runtime checks

- Open `/driver/scan`.
- Turn off network.
- Try uploading a document.
- Confirm upload is queued.
- Turn network back on.
- Confirm retry UI appears.
- Click retry.
- Confirm pending count decreases after successful upload.
