# Driver Access QA

## Purpose

Verify that driver mobile pages only expose loads belonging to the current driver.

## Manual command

```bash
node scripts/verifyDriverLoadAccess.mjs
```

Expected output:

```text
Driver load access verification passed.
```

## Runtime checks

- Login as a driver.
- Open `/driver/scan`.
- Confirm only that driver's active loads appear.
- Open `/driver/loads`.
- Confirm assigned loads belong to the current driver.
- Open `/driver/loads/:id`.
- Confirm driver cannot access another driver's load by guessing the URL.
