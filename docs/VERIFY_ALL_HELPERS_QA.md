# Verify All Helpers QA

## Purpose

Run all current helper checks with one command.

## Command

```bash
node scripts/verifyAllHelpers.mjs
```

Expected output ends with:

```text
All HASTEN helper checks passed.
```

## Includes

- Driver readiness checks
- Driver load access checks
- Settlement policy checks

## Suggested local test sequence

```bash
git pull
node scripts/verifyAllHelpers.mjs
npm run build
```
