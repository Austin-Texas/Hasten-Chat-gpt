# Compliance Readiness Shortcut QA

## Purpose

Add a Compliance Center header shortcut to `/drivers/readiness`.

## Apply locally

```bash
node scripts/applyComplianceReadinessShortcut.mjs
```

Then commit:

```bash
git add src/pages/Compliance.jsx
git commit -m "Add compliance readiness shortcut"
git push
```

## Runtime checks

- Open `/compliance`.
- Confirm Driver Readiness button appears beside Export Report.
- Click it and confirm `/drivers/readiness` opens.
- Confirm Export Report still works.
