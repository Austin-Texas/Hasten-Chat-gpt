# HASTEN Phase 2D Recommended Next Patch

Date: 2026-06-25

## Recommendation

Finish Phase 2D in this order:

1. Add Bid Review navigation shortcut.
2. Add duplicate auction prevention to Load Marketplace.
3. Add marketplace lockout for already imported or assigned loads.
4. Add counter modal with amount and dispatcher note.

## What was added now

A reusable guard helper was added:

```text
src/lib/phase2dGuards.js
```

It provides:

- `isExternalLoadLocked(load)`
- `getExternalLoadStatus(load)`
- `getExistingBidDriverIds(base44, externalLoadId)`
- `filterNewDriverMatches(base44, externalLoadId, matches)`
- `getAuctionGuardMessage(load, newMatches)`

## Why this helper matters

The helper keeps protection rules in one place before wiring them into the UI.

The rules protect against:

- sending duplicate DriverLoadBid records to the same driver for the same ExternalLoad
- auctioning or importing an ExternalLoad that is already imported or assigned
- accepting the same ExternalLoad for multiple drivers

## Next file to update

Update:

```text
src/pages/LoadMarketplace.jsx
```

Use `phase2dGuards.js` inside:

- `handleSendToAuction`
- `handleImport`
- load status badges
- Auction and Import button disabled states

## Test after wiring

1. Open Demo Data Center.
2. Seed Phase 1.
3. Seed Phase 2.
4. Seed Phase 2C.
5. Open `/dispatch/load-marketplace`.
6. Try sending a load already offered to a driver.
7. Confirm duplicate DriverLoadBid records do not multiply.
8. Try importing an already imported load.
9. Confirm import is blocked.
10. Open `/dispatch/bid-review`.
11. Confirm locked loads cannot be accepted.

## Current status

Phase 2D helper is ready.

UI wiring is next and should be done as a smaller patch after testing current Phase 2C build.
