# HASTEN Phase 2 Load Marketplace Audit

Date: 2026-06-25

## Scope

Phase 2 starts the production workflow for:

- ExternalLoad marketplace
- equipment-based load matching
- dispatcher send-to-auction flow
- driver Offers/Auction screen
- DriverLoadBid response records
- hidden-rate driver safety rule

## Files Changed

- `src/lib/equipmentMatching.js`
- `src/pages/LoadMarketplace.jsx`
- `src/pages/driver/DriverLoads.jsx`
- `docs/PHASE_2_LOAD_MARKETPLACE_AUDIT.md`

## New Helper: Equipment Matching Engine

Created `src/lib/equipmentMatching.js`.

The helper provides:

- `EQUIPMENT_CLASSES`
- `normalizeEquipment`
- `getLoadEquipment`
- `getDriverEquipment`
- `equipmentIsCompatible`
- `computeDriverLoadMatch`
- `matchExternalLoadsToDrivers`
- `filterExternalLoadsForDriver`
- `getDriverSafeOffer`

The first supported equipment classes are:

- Sprinter
- Cargo Van
- Box Truck
- Hot Shot
- Gooseneck
- Fifth Wheel
- Dry Van
- Power Only
- Flatbed
- Car Hauler
- Reefer

## Dispatcher Marketplace Changes

Updated `/dispatch/load-marketplace` in `src/pages/LoadMarketplace.jsx`.

Added:

- local demo ExternalLoad records for development when Base44 has no data
- local demo driver records for development matching
- KPI cards: Available, In Auction, Average Rate, Drivers Loaded
- API Sources shortcut to Super Admin integrations
- equipment matching fallback when Base44 function is not available
- Send to Auction action
- DriverLoadBid record creation for matched drivers
- ExternalLoad status update to `auction`
- Match modal with match score and reasons

## Driver Offers/Auction Changes

Updated `src/pages/driver/DriverLoads.jsx`.

Changed tabs to:

- Assigned
- Offers
- Calendar
- Done

The Offers tab:

- reads ExternalLoad records
- filters them through the equipment matching helper
- shows only compatible offers
- hides broker/customer rate
- allows driver to respond:
  - Interested
  - Bid
  - Decline
- creates DriverLoadBid records with statuses:
  - interested
  - bid_submitted
  - declined

## Driver Rate Protection

Driver offer cards intentionally do not show:

- broker full rate
- HASTEN margin
- factoring details
- internal customer notes
- private broker notes

The driver sees only operational details:

- pickup city/state
- delivery city/state
- miles
- equipment
- weight
- commodity
- basic offer status

## Current Phase 2 Status

PARTIAL PASS

Completed foundation:

- ExternalLoad marketplace route exists
- ExternalLoad loading and local fallback exist
- equipment matching helper exists
- dispatcher can match drivers
- dispatcher can send matched drivers to auction
- DriverLoadBid response creation exists
- driver Offers tab exists
- driver rate protection exists at UI level

Still pending:

1. Confirm Base44 entities exist in production:
   - ExternalLoad
   - DriverLoadBid
   - Driver
   - Load
2. Add Dispatcher Bid Review panel as a dedicated right-side or bottom drawer.
3. Add accept/counter/reject workflow from dispatcher review.
4. Convert accepted ExternalLoad to internal Load and assign selected driver.
5. Call the official `updateLoadStatus` function instead of direct Load.update where status changes happen.
6. Add TimelineEvent, Notification, and Message records after auction actions.
7. Add runtime build proof from VSCode.
8. Add tests for Sprinter, Hot Shot, Box Truck, and Dry Van matching.

## Next Recommended Patch

Phase 2B should add the dispatcher bid review queue:

- create a `/dispatch/bid-review` route or bottom drawer under `/dispatch/load-marketplace`
- list DriverLoadBid records
- show driver, equipment, load, route, status, submitted time, notes
- actions: Review, Accept, Counter, Reject, Assign Load
- on Accept: convert ExternalLoad to internal Load, assign driver, notify driver, create timeline/message

## Production Caution

Do not mark API integration complete yet.

Current work proves the marketplace and auction foundation, but real completion requires connected providers, secure credentials, provider-specific capabilities, duplicate prevention, and runtime proof.
