# Base44 Prompt — Phase 2D Marketplace Guards

Use this prompt inside Base44 if the GitHub connector cannot safely patch `src/pages/LoadMarketplace.jsx` directly.

---

## Prompt

Continue HASTEN Cargo LLC Phase 2D. Do not rebuild working pages. Only update the existing Load Marketplace workflow and keep all current styling consistent.

Use the helper already added:

```js
import {
  filterNewDriverMatches,
  getAuctionGuardMessage,
  getExternalLoadStatus,
  isExternalLoadLocked,
} from "@/lib/phase2dGuards";
```

Update `src/pages/LoadMarketplace.jsx` with these changes only:

### 1. Add Bid Review shortcut

Near the existing `API Sources` button, add a link:

```jsx
<Link
  to="/dispatch/bid-review"
  className="rounded-lg border border-green-500/25 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-300 hover:bg-green-500/15"
>
  Bid Review
</Link>
```

### 2. Add locked load status

For each external load row, calculate:

```js
const locked = isExternalLoadLocked(load);
const status = getExternalLoadStatus(load);
```

Show a small badge:

- `available`
- `auction`
- `locked`

Locked means the external load already has one of these:

- `imported_load_id`
- `assigned_driver_id`
- `normalized_status === "imported"`

### 3. Block Auction for locked loads

At the top of `handleSendToAuction(load)`, add:

```js
if (isExternalLoadLocked(load)) {
  setNotice("Auction blocked: this external load is already imported or assigned.");
  return;
}
```

### 4. Prevent duplicate DriverLoadBid records

After matching drivers, filter out drivers who already have a bid for that external load:

```js
const matchedDrivers = await findMatches(load);
const newMatches = (await filterNewDriverMatches(base44, load.id, matchedDrivers)).slice(0, 10);
const guardMessage = getAuctionGuardMessage(load, newMatches);

if (guardMessage) {
  setNotice(guardMessage);
  return;
}
```

Then create DriverLoadBid records only for `newMatches`, not `matchedDrivers`.

Update success notice to:

```js
setNotice(`Sent ${newMatches.length} new offer${newMatches.length === 1 ? "" : "s"}. Duplicate offers skipped.`);
```

### 5. Block Import for locked loads

At the top of `handleImport(load)`, add:

```js
if (isExternalLoadLocked(load)) {
  setNotice("Import blocked: this external load is already imported or assigned.");
  return;
}
```

### 6. Disable buttons for locked loads

For each load row:

- Disable `Auction` when `locked === true`.
- Disable `Import` when `locked === true`.
- Change button text to `Locked` when locked.

### 7. Keep current functionality

Do not remove:

- Sync Loads
- API Sources
- Match modal
- Import action
- Auction action
- filters/search
- local demo fallback
- equipment matching

### 8. Runtime proof required

After patching, run the app and verify:

- `/dispatch/load-marketplace` opens
- `/dispatch/bid-review` opens
- Auction skips duplicate DriverLoadBid records
- locked loads cannot be auctioned
- locked loads cannot be imported
- existing demo data still works

Mark Phase 2D as PARTIAL PASS only after runtime proof.

---

## Expected result

The dispatcher can safely work from Load Marketplace without accidentally sending duplicate offers or importing/assigning the same external load twice.
