# Readiness Export QA

## Automated wiring check

```bash
node scripts/checkReadinessExportWiring.mjs
```

## Runtime check

- Open `/drivers/readiness`.
- Click Export CSV.
- Confirm a CSV downloads.
- Confirm the CSV includes driver name, email, equipment, readiness, message, and missing items.

## Purpose

The export helps clean up driver readiness before dispatching offers.
