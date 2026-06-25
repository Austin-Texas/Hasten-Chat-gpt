# Driver Load Detail Guard QA

## Purpose

Protect `/driver/loads/:id` so a driver cannot open another driver's assigned load by guessing the URL.

## Files added

- `src/pages/driver/DriverLoadDetailAccessGate.jsx`
- `src/components/driver/DriverAccessDenied.jsx`
- `src/lib/driverLoadAccess.js`

## Apply route wiring locally

The ChatGPT GitHub connector may block large `App.jsx` rewrites. Run this local patch command after pulling:

```bash
node scripts/applyDriverLoadDetailGate.mjs
```

Then commit the App.jsx change:

```bash
git add src/App.jsx
git commit -m "Wire driver load detail access gate"
git push
```

## Runtime checks

- Login as driver A.
- Open a load assigned to driver A. It should load normally.
- Try opening a load assigned to driver B. It should show Access denied.
- Try opening a missing load ID. It should show Load not found.
