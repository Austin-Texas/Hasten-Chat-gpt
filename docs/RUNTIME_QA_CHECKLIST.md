# HASTEN Runtime QA Checklist

Use after each pull.

## Commands

```bash
npm ci
npm run build
npm run dev
```

## Pages

- `/dashboard`
- `/drivers`
- `/drivers/readiness`
- `/driver/dashboard`
- `/driver/profile/about-vehicle`
- `/driver/loads`
- `/dispatch/load-marketplace`
- `/dispatch/bid-review`
- `/finance/settlements`

## Checks

- Driver readiness shows correct Ready / Review / Setup state.
- Marketplace sends auction offers only to ready drivers.
- Duplicate auction invitations are skipped.
- Bid Review blocks not-ready driver assignment.
- Settlement warnings appear before payout actions.
