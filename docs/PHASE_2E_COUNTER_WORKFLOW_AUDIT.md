# HASTEN Phase 2E — Counter Workflow Audit

Date: 2026-06-25

## Scope

Phase 2E closes the marketplace counter-offer loop:

```text
Marketplace → Bid Review → Dispatcher Counter → Driver Accept/Decline → Dispatcher Create Load → Driver Assigned
```

## Files updated

```text
src/pages/DispatchBidReview.jsx
src/pages/driver/DriverLoads.jsx
src/lib/phase2dGuards.js
```

## Implemented behavior

### Dispatcher Bid Review

- Dispatcher can send a counter offer with amount and note.
- Counter offer stores:
  - `status: counter_offer`
  - `dispatcher_counter_amount`
  - `dispatcher_notes`
  - `counter_sent_at`
  - `reviewed_at`
- Dispatcher sees driver response statuses:
  - `counter_accepted`
  - `counter_declined`
- When the driver accepts a counter, dispatcher gets a **Create Load** action.
- Created internal load uses the dispatcher counter amount as:
  - `rate`
  - `total_revenue`
- External load is locked after creation with:
  - `normalized_status: imported`
  - `imported_load_id`
  - `assigned_driver_id`

### Driver Offers

- Driver Offers tab now merges matching ExternalLoad records with DriverLoadBid records.
- Driver sees dispatcher counter amount and dispatcher note.
- Driver can:
  - Accept Counter
  - Decline Counter
- Driver bid updates existing DriverLoadBid when available instead of always creating new records.

### Driver Assigned Loads

- Driver Assigned tab now searches loads by multiple possible IDs:
  - `user.id`
  - `driverProfile.id`
  - `driverProfile.user_id`
- Results are deduped to avoid duplicate cards.
- This prevents assigned loads from being hidden when dispatcher-created loads use Driver entity ID instead of auth User ID.

## Runtime checklist

### 1. Seed data

Open:

```text
/super-admin/settings/system-diagnostics
```

Seed:

```text
Phase 1 Core Operations
Phase 2 Marketplace + Auction
```

### 2. Dispatcher sends counter

Open:

```text
/dispatch/bid-review
```

- Click Counter
- Enter amount, for example `950`
- Add note, for example `Can approve if pickup before 2 PM`
- Send counter

Expected:

- Bid status becomes `counter_offer`.
- Counter amount/note displays on the bid card.

### 3. Driver accepts counter

Login as driver and open:

```text
/driver/loads
```

- Open Offers tab
- Confirm counter amount/note displays
- Click Accept Counter

Expected:

- DriverLoadBid status becomes `counter_accepted`.

### 4. Dispatcher creates load

Open:

```text
/dispatch/bid-review
```

- Filter `counter accepted`
- Click Create Load

Expected:

- Internal Load is created as assigned.
- Load rate equals dispatcher counter amount.
- DriverLoadBid becomes `accepted_by_dispatch`.
- ExternalLoad becomes imported/locked.

### 5. Driver sees assignment

Open:

```text
/driver/loads
```

- Open Assigned tab

Expected:

- Newly created assigned load appears.

## Status

Code path is implemented.

Runtime proof is still required before marking fully complete.

Recommended next phase: Phase 3 Driver Profile + Equipment + Compliance Upgrade.
