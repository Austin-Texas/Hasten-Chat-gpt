# HASTEN Cargo LLC — Master Build Implementation Scope

This repository is being aligned to the HASTEN Cargo LLC single master build prompt.

## Product identity

- Product: **HASTEN Cargo LLC**
- Slogan: **Drive smart. Deliver trust.**
- Replace placeholder brand marks with HASTEN/HC branding.

## Active MVP roles

Use only these active roles:

- `super_admin`
- `admin`
- `dispatcher`
- `driver`
- `customer`

Broker/client are unified as customer records with `customer_type` values such as `broker`, `direct_client`, and `shipper`.

## Primary admin sidebar

Use compact labels only:

- Dashboard
- Dispatch
- Drivers
- Fleet
- Finance
- Documents
- Customers
- Support
- Administration

## Driver native app structure

Bottom nav must remain exactly:

- Home
- Loads
- Scan
- Chat
- Profile

Driver app features must clearly distinguish **PWA/local demo readiness** from true native Android/iOS readiness. Do not claim native complete unless native shell, plugins, push, background GPS, camera, secure storage, and platform folders are verified.

## Required operational routes

- `/super-admin/settings/integrations/load-board-apis`
- `/super-admin/settings/system-diagnostics`
- `/dispatch/load-marketplace`
- `/dispatch/bid-review`
- `/driver/scan`
- `/finance/tax-center`
- `/finance/settlements`
- `/admin/users-access`

## Equipment matching priority list

- Sprinter
- Cargo Van
- Box Truck
- Hot Shot
- Gooseneck / Fifth Wheel
- Dry Van
- Power Only
- Flatbed
- Car Hauler

Future support:

- Reefer
- Step Deck
- Conestoga
- Final Mile
- LTL / Partial
- Expedited
- White Glove

## Current applied repo changes

- Added `src/lib/hastenMasterSpec.js` as the central product/spec constants file.
- Updated feature access so `super_admin` is a real active role, separate from `admin`.
- Updated `src/pages/UserAccess.jsx` with Super Admin/Admin/Dispatcher/Driver/Customer role-only access matrix.
- Updated `src/api/base44Client.js` local demo seed records for Driver, Load, ExternalLoad, Settlement, and LoadDocument.
- Updated `src/pages/driver/DriverScan.jsx` to match the master prompt Scan screen and auto-select active demo loads.
- Updated `src/pages/AppBlueprint.jsx` to remove placeholder brand mark and surface master spec routes/equipment/quality target.

## Completion rules

Never mark a module complete without runtime proof. For final status reporting, return:

- files changed
- new routes
- new entities
- new functions
- role changes
- sidebar changes
- API integration setup
- external load normalization
- equipment matching
- driver bid workflow
- dispatch bid review panel
- native app status
- scan screen status
- incident workflow
- tax center / 1099
- theme + density system
- diagnostics + cleanup
- direct `Load.update` bypass audit
- tests executed: PASS / PARTIAL / FAIL
- remaining gaps
