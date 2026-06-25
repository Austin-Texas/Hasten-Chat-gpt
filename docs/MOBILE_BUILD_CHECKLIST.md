# HASTEN Mobile Build Checklist

## Driver routes

- `/driver/dashboard`
- `/driver/loads`
- `/driver/loads/:id`
- `/driver/scan`
- `/driver/messages`
- `/driver/profile`
- `/driver/profile/about-vehicle`
- `/driver/settlement-preview`

## Checks before mobile packaging

- Dashboard shows readiness.
- Loads page shows offers and assigned loads.
- Load detail page uses access gate after local patch runner is applied.
- Scan page shows only current driver's loads.
- Document upload works.
- Earnings page links to settlement preview.
- Settlement preview handles missing driver profile.
- Bottom nav remains Home, Loads, Scan, Chat, Profile.

## Build commands

```bash
git pull
node scripts/applyRecommendedPatches.mjs
node scripts/verifyAllHelpers.mjs
npm run build
npm run dev
```

## Release rule

Do not package mobile until the web driver workflow passes runtime checks.
