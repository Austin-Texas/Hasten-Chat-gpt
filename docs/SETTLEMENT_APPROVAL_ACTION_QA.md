# Settlement Approval Action QA

## Purpose

Add a confirmation step before approving settlements with review warnings.

## Files added

- `src/components/settlement/SettlementApprovalAction.jsx`
- `scripts/applySettlementApprovalAction.mjs`

## Apply page wiring locally

The connector may block large settlement page rewrites. Run:

```bash
node scripts/applySettlementApprovalAction.mjs
```

Then commit the page change:

```bash
git add src/pages/OwnerOperatorSettlement.jsx
git commit -m "Wire settlement approval confirmation"
git push
```

## Runtime checks

- Open `/finance/settlements`.
- Approve a settlement with no warnings. It should approve normally.
- Approve a settlement with warnings. It should ask for confirmation.
- Cancel confirmation. It should not approve.
- Confirm. It should approve.
