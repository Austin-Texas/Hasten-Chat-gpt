# Driver Load Access Fields

`src/lib/driverLoadAccess.js` protects driver-facing load pages by comparing driver lookup IDs against load assignment fields.

## Driver lookup fields

- `user.id`
- `user.linkedDriverId`
- `user.driver_id`
- `driverRecord.id`
- `driverRecord.user_id`
- `driverRecord.linked_user_id`

## Load assignment fields

- `load.driver_id`
- `load.assigned_driver_id`
- `load.driver_user_id`
- `load.assigned_driver_user_id`

## Why this matters

Different HASTEN entities may store driver assignment under different field names. The helper prevents driver pages from exposing another driver's load when URL IDs are guessed or copied.

## Verification

```bash
node scripts/verifyDriverLoadAccess.mjs
```
