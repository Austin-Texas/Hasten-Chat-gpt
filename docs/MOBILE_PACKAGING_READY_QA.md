# Mobile Packaging Readiness QA

## Automated check

```bash
node scripts/checkMobilePackagingReady.mjs
```

This confirms the main driver mobile files exist before native packaging work begins.

## Main command

```bash
node scripts/verifyAllHelpers.mjs
```

## Manual check

Open the driver mobile pages and confirm they render correctly before starting Android or iPhone packaging.
