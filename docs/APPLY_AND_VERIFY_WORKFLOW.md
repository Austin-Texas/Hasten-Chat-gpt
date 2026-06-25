# Apply and Verify Workflow

Use this when working locally after pulling the latest GitHub changes.

## One-command local hardening

```bash
git pull
node scripts/applyAndVerifyRecommendedPatches.mjs
npm run build
```

## Review and commit

```bash
git diff
git add .
git commit -m "Apply and verify recommended HASTEN patches"
git push
```

## What the command does

- Applies recommended local patches.
- Runs helper verification.
- Reports pending patches.

## After build passes

Test these pages:

- `/drivers/readiness`
- `/driver/dashboard`
- `/driver/loads`
- `/driver/loads/:id`
- `/driver/scan`
- `/dispatch/load-marketplace`
- `/dispatch/bid-review`
- `/finance/settlements`
