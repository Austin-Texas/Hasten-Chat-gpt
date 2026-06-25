# Apply Recommended HASTEN Patches

Some large React files are easier to patch locally because the chat connector may block full-file rewrites. Use this runner to apply the safe local rewrites.

## Commands

```bash
git pull
node scripts/applyRecommendedPatches.mjs
node scripts/verifyAllHelpers.mjs
npm run build
```

## Review changes

```bash
git diff
```

## Commit

```bash
git add .
git commit -m "Wire recommended HASTEN hardening patches"
git push
```

## What it applies

- Driver Load Detail access gate.
- Sidebar Bid Review shortcut.
- Compliance Driver Readiness shortcut.
- Settlement approval confirmation.

## Runtime checks

- `/driver/loads/:id` blocks another driver's load.
- Sidebar Dispatch includes Bid Review.
- `/compliance` links to `/drivers/readiness`.
- `/finance/settlements` asks confirmation when warnings exist.
