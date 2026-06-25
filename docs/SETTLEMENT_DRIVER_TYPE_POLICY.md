# Settlement Driver Type Policy

`src/lib/settlementPolicy.js` treats HASTEN's default payout model as owner-operator / contractor unless a driver is clearly marked as a company driver.

## Review path applies to

- `driver_type = owner_operator`
- `driver_type = contractor`
- `driver_type = 1099_contractor`
- `employment_type = owner_operator`
- `employment_type = contractor`
- `employment_type = 1099_contractor`
- unknown driver type

## Review path does not apply to

- `driver_type = company_driver`
- `employment_type = w2`

## Why

HASTEN primarily works with owner-operator drivers. When driver type is missing, finance should review the settlement instead of assuming company-driver behavior.

## Verification

```bash
node scripts/verifySettlementPolicy.mjs
```
