# HASTEN Deployment Readiness Checklist

## Local commands

```bash
npm ci
npm run build
npm run dev
```

## Required pages

- `/dashboard`
- `/drivers`
- `/drivers/readiness`
- `/dispatch/load-marketplace`
- `/dispatch/bid-review`
- `/finance/settlements`
- `/driver/dashboard`
- `/driver/loads`
- `/driver/profile/about-vehicle`

## Environment checks

- Base44 app ID configured.
- Auth redirect works.
- Local demo mode disabled in production.
- Google login settings confirmed.
- Load board integration keys stored securely.
- File upload/document storage configured.
- Map/GPS provider configured.

## Runtime proof

Do not mark a phase complete until it was checked in the running app.

## Release blockers

- Login route fails.
- Driver readiness blocks valid ready drivers.
- Auction creates duplicate driver bids.
- Bid Review can assign not-ready drivers.
- Settlement warnings do not appear when review is needed.
- Driver mobile scan route fails.
