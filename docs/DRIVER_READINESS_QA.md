# Driver Readiness QA

## Purpose

Verify HASTEN driver readiness logic matches the Base44 Driver schema.

## Manual command

```bash
node scripts/verifyDriverReadiness.mjs
```

Expected output:

```text
Driver readiness verification passed.
```

## Runtime checks

- Open `/drivers/readiness`.
- Ready drivers show Ready.
- Drivers with `compliance_status = at_risk` do not show Ready.
- Drivers with missing equipment or payload show Setup/Needs Setup.
- Drivers with `w9_status = uploaded` or `verified` can pass W-9 readiness.
- Drivers with `agreement_signed = true` can pass contract readiness.
