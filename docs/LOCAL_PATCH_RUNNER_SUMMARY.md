# Local Patch Runner Summary

Run this when connector-safe large file rewrites are needed locally:

```bash
node scripts/applyRecommendedPatches.mjs
```

## Included local patches

- Driver Load Detail access gate in `App.jsx`.
- Sidebar Bid Review shortcut in `HastenLayout.jsx`.
- Compliance Driver Readiness shortcut in `Compliance.jsx`.
- Settlement approval confirmation in `OwnerOperatorSettlement.jsx`.
- Camera upload validation in `CameraUpload.jsx`.

## After running

```bash
node scripts/reportPendingPatches.mjs
node scripts/verifyAllHelpers.mjs
npm run build
git diff
```

Then commit the changed app files.
