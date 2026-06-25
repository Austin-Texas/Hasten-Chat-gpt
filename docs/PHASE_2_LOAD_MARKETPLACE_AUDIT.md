# HASTEN Phase 2 Load Marketplace Audit

Date: 2026-06-25

## Scope

Phase 2 starts the production workflow for:

- ExternalLoad marketplace
- equipment-based load matching
- dispatcher send-to-auction flow
- driver Offers/Auction screen
- Dispatcher Bid Review queue
- DriverLoadBid response records
- hidden-rate driver safety rule

## Files Changed

- `src/lib/equipmentMatching.js`
- `src/pages/LoadMarketplace.jsx`
- `src/pages/driver/DriverLoads.jsx`
- `src/pages/DispatchBidReview.jsx`
- `src/App.jsx`
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

## Dispatcher Bid Review Changes

Added `src/pages/DispatchBidReview.jsx` and wired `/dispatch/bid-review` in `src/App.jsx`.

The Bid Review page:

- lists DriverLoadBid records
- loads related ExternalLoad and Driver records
- supports filters for open, interested, bid_submitted, counter_offer, accepted_by_dispatch, rejected_by_dispatch, and all
- supports Accept, Counter, and Reject actions
- on Accept, creates an internal Load record assigned to the selected driver
- attempts to call `updateLoadStatus` after Load creation
- updates the accepted DriverLoadBid record
- updates the ExternalLoad record as imported/assigned
- attempts to create TimelineEvent and Notification records
- includes local demo fallback data for development

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

Dispatcher/admin can review rates in the internal bid review and marketplace screens.

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
- dispatcher Bid Review route exists
- dispatcher can accept/counter/reject bids at UI/entity level
- accepted bid can create internal assigned Load
- driver rate protection exists at UI level

Still pending:

1. Confirm Base44 entities exist in production:
   - ExternalLoad
   - DriverLoadBid
   - Driver
   - Load
   - TimelineEvent
   - Notification
2. Add a direct sidebar/menu link to `/dispatch/bid-review` if desired.
3. Add richer counter amount form instead of a simple status-only counter action.
4. Add Message record after auction actions once message schema is confirmed.
5. Confirm `updateLoadStatus` function payload contract and replace any direct status updates that conflict with the official function.
6. Add runtime build proof from VSCode.
7. Add tests for Sprinter, Hot Shot, Box Truck, and Dry Van matching.

## Next Recommended Patch

Phase 2C should harden the production workflow:

- verify Base44 entities and fields
- add route link in sidebar or marketplace header
- add counter modal with amount and note
- add timeline/notification/message schema-safe wrappers
- add duplicate prevention so one driver does not receive repeated DriverLoadBid records for the same ExternalLoad
- add accepted-bid lockout so only one driver can be accepted for a load

## Production Caution

Do not mark API integration complete yet.

Current work proves the marketplace, driver offers, and dispatcher bid review foundation, but real completion requires connected providers, secure credentials, provider-specific capabilities, duplicate prevention, schema proof, and runtime proof.
