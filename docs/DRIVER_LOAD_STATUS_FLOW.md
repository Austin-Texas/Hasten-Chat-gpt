# Driver Load Status Flow

`src/lib/driverLoadStatusFlow.js` defines the driver-facing load status sequence.

## Sequence

1. `assigned`
2. `accepted`
3. `en_route`
4. `arrived_pickup`
5. `loaded`
6. `in_transit`
7. `arrived_delivery`
8. `delivered`
9. `pod_uploaded`
10. `completed`

## Rules

- Drivers should only move one step forward.
- Completed and cancelled loads are terminal.
- Skipping ahead should be blocked.
- Progress percentage should come from the helper, not duplicated page logic.

## Verification

```bash
node scripts/verifyDriverLoadStatusFlow.mjs
```

## Recommended next wiring

Use this helper inside `DriverLoadDetail.jsx` for status buttons and progress display.
