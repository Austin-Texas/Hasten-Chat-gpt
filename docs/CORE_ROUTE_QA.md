# Core Route QA

## Automated check

```bash
node scripts/verifyCoreRoutes.mjs
```

## Runtime pages to open

- `/dashboard`
- `/drivers`
- `/drivers/readiness`
- `/dispatch/load-marketplace`
- `/dispatch/bid-review`
- `/finance/settlements`
- `/driver/dashboard`
- `/driver/loads`
- `/driver/loads/:id`
- `/driver/scan`
- `/driver/messages`
- `/driver/profile`
- `/driver/profile/about-vehicle`
- `/driver/settlement-preview`

## Result

Every route should load without 404 after login with the correct role.
