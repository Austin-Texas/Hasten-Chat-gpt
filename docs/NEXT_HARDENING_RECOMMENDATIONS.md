# HASTEN Next Hardening Recommendations

This list tracks the next recommended work after the current readiness, marketplace, settlement, and driver mobile patches.

## Priority 1 — Driver access protection

- Add guard to `/driver/loads/:id` so drivers cannot view another driver's load by URL.
- Reuse `src/lib/driverLoadAccess.js`.
- Show `DriverAccessDenied` when access does not match.

## Priority 2 — Settlement approval protection

- Settlement warnings already display in the list.
- Add a confirmation step before approving any settlement that has policy warnings.
- Add proof fields later for advance/request/approval evidence.

## Priority 3 — Compliance Center wiring

- `/drivers/readiness` is already live.
- Add a shortcut from Compliance page when the large page can be patched safely.
- Add readiness tab directly inside Compliance later.

## Priority 4 — Mobile driver polish

- Keep bottom nav: Home, Loads, Scan, Chat, Profile.
- Keep Scan center tab raised.
- Test camera/file upload on Android.
- Test settlement preview from Earnings.
- Test About Vehicle readiness updates.

## Priority 5 — Release proof

- Run helper verification workflow.
- Run build workflow.
- Run manual QA checklists.
- Do not mark production-ready until runtime tests pass.
