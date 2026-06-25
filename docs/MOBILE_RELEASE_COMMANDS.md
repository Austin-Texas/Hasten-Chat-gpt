# Mobile Release Commands

Run these before native packaging work.

```bash
node scripts/reportPendingPatches.mjs
node scripts/applyRecommendedPatches.mjs
node scripts/verifyScriptSyntax.mjs
node scripts/verifyAllHelpers.mjs
node scripts/checkMobilePackagingReady.mjs
node scripts/reportNativePackagingStatus.mjs
npm run build
```

After these pass, start Android/iPhone packaging work.

## Notes

- `reportPendingPatches` shows local wiring still needed.
- `applyRecommendedPatches` applies large-file patches.
- `verifyAllHelpers` runs the main helper checks.
- `checkMobilePackagingReady` confirms driver mobile files exist.
- `reportNativePackagingStatus` reports whether Capacitor/native folders exist yet.
