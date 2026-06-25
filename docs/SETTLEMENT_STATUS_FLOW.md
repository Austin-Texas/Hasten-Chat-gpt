# Settlement Status Flow

`src/lib/settlementStatusFlow.js` defines the finance settlement status sequence.

## Sequence

1. `draft`
2. `pending_review`
3. `approved`
4. `paid`

## Terminal statuses

- `paid`
- `void`
- `cancelled`
- `rejected`

## Rules

- Settlements should move one step at a time.
- Draft should move to Pending Review before Approved.
- Approved should move to Paid.
- Paid/void/cancelled/rejected should not move back into active flow.

## Verification

```bash
node scripts/verifySettlementStatusFlow.mjs
```

## Recommended UI usage

Use this helper in finance pages to show settlement progress and avoid skip transitions.
