# Settlement Policy QA

## Purpose

Verify settlement review warnings before finance approval.

## Manual command

```bash
node scripts/verifySettlementPolicy.mjs
```

Expected output:

```text
Settlement policy verification passed.
```

## Runtime checks

- Open `/finance/settlements`.
- Create or view a draft settlement.
- Confirm warning panel appears when review fields are present.
- Confirm warning panel is hidden when no review items exist.
- Confirm driver net pay is still visible.
- Confirm PDF action still works.
