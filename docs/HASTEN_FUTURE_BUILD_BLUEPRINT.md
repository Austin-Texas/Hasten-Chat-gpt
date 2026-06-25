# HASTEN Cargo LLC Future Production Build Blueprint

## Purpose

This document converts the HASTEN future vision into a practical engineering roadmap for the existing React/Base44 project and the future production-native architecture.

HASTEN Cargo LLC is a hybrid logistics SaaS platform for freight dispatch, broker/customer shipment management, owner-operator driver management, load-board automation, equipment-based matching, driver bidding, settlement, 1099 reporting, document workflows, and operational diagnostics.

## Product Identity

- Product name: HASTEN Cargo LLC
- Slogan: Drive smart. Deliver trust.
- Business type: dispatcher, broker, customer shipment portal, and owner-operator management platform
- Important rule: HASTEN is not primarily a fleet owner. It manages independent 1099 owner-operators who often own their trucks and pay their own operating costs.

## Active MVP Roles

Use only these active roles for MVP:

1. super_admin
2. admin
3. dispatcher
4. driver
5. customer

Broker and direct client records should live under the unified customer model using customer_type values such as broker, direct_client, or shipper.

## Build Surfaces

### 1. Admin Web Portal

For super admin, admin, dispatcher, finance, fleet, safety, compliance, support, and diagnostics.

Core modules:

- Dashboard
- Dispatch
- Drivers
- Fleet
- Finance
- Documents
- Customers
- Support
- Administration

### 2. Customer Portal

Unified portal for brokers, direct clients, and shippers.

Menu:

- Dashboard
- Shipments and Quotes
- Tracking
- Documents
- Invoices
- Messages
- Support

### 3. Driver Mobile App

Future target is true Android/iOS native delivery. Current short-term path may use Capacitor around the React driver UI, then later move to React Native if needed.

Bottom nav must be exactly:

- Home
- Loads
- Scan
- Chat
- Profile

Center Scan button should be elevated and visually primary.

### 4. Public Website

Business website with company profile, quote request, shipment tracking, customer login, driver onboarding, careers, contact, and support.

## Current Project Strategy

The existing project is React + Vite + Base44. Keep building inside the current repo first, then split or evolve only when production needs require it.

Recommended approach:

1. Stabilize auth and local demo mode.
2. Stabilize Base44 configuration and environment handling.
3. Finish core web MVP in current repo.
4. Add driver mobile-ready screens in React.
5. Add Capacitor native shell only after driver screens are stable.
6. Add production backend or external API services later if Base44 limits are reached.

## Phase 0 — Stabilization

Goal: make local development reliable.

Tasks:

- Fix demo login.
- Prevent Base44 appId null API calls locally.
- Add clear env mode detection.
- Ensure dashboard loads with safe local mock data.
- Verify protected routes.
- Verify driver redirect.
- Add a diagnostics route for system health.

Exit criteria:

- Admin demo login works.
- Driver demo login works.
- No /api/apps/null calls on localhost.
- User session persists in localStorage.
- Logout clears local session.

## Phase 1 — Enterprise MVP Web Core

Goal: HASTEN works as a real dispatch and admin platform.

Tasks:

- Finalize compact sidebar information architecture.
- Finish Dashboard, Dispatch, Loads, Drivers, Fleet, Finance, Documents, Customers, Support, and Administration.
- Use compact table-first operations UI.
- Replace duplicate broker/client/customer split with unified Customers module.
- Clean old test reports and obsolete routes.
- Add route status diagnostics.

Exit criteria:

- Admin can manage loads, drivers, customers, documents, and finance.
- Sidebar labels are compact.
- Duplicate modules are removed or redirected safely.
- Build passes.

## Phase 2 — External Load Marketplace and API Integration

Goal: Super Admin can configure load-board sources and dispatchers can work imported loads.

Super Admin route:

- /super-admin/settings/integrations/load-board-apis

Dispatch route:

- /dispatch/load-marketplace

Entities to verify or create:

- ExternalLoad
- ApiProvider or LoadBoardProvider
- ApiSyncRun
- ApiSyncIssue

Functions to verify or create:

- testLoadBoardConnection
- syncExternalLoads
- normalizeExternalLoad
- matchExternalLoadsToDrivers

Marketplace requirements:

- Source filters
- Equipment filter chips
- Load table
- Sync status
- Match score
- Send to auction
- Assign driver
- Convert to internal Load

Exit criteria:

- Super Admin can configure provider.
- ExternalLoad records are created.
- Duplicate prevention works.
- Dispatcher sees imported loads.

## Phase 3 — Equipment Matching Engine

Goal: drivers see only loads they can actually haul.

Priority equipment:

- Sprinter
- Cargo Van
- Box Truck
- Hot Shot
- Gooseneck / Fifth Wheel
- Dry Van
- Power Only
- Flatbed
- Car Hauler

Matching fields:

- vehicle_type
- trailer_type
- max_payload
- cargo dimensions
- dock_high
- liftgate
- reefer
- hazmat
- team_driver
- current_location
- preferred_lanes
- availability
- compliance_status

Exit criteria:

- Sprinter driver sees only Sprinter-compatible loads.
- Hot Shot driver sees Hot Shot or Gooseneck-compatible loads.
- Box Truck driver sees Box Truck-compatible loads.
- Dry Van driver sees Dry Van-compatible loads.
- Non-compliant drivers are excluded from dispatch offers.

## Phase 4 — Driver Auction and Bid Review

Goal: drivers can show interest or bid, and dispatch can review before assignment.

Entity:

- DriverLoadBid

Statuses:

- interested
- bid_submitted
- declined
- counter_offer
- accepted_by_dispatch
- rejected_by_dispatch
- expired

Dispatcher actions:

- Review
- Accept
- Counter
- Reject
- Assign Load

Security rule:

Drivers must not see broker full rate, HASTEN margin, factoring details, internal notes, or private customer notes.

Exit criteria:

- Driver sees matched load offers.
- Driver submits interest or bid.
- Dispatcher sees bid review queue.
- Dispatcher accepts bid.
- ExternalLoad converts to internal Load.
- TimelineEvent, Notification, and Message are created.

## Phase 5 — Driver Mobile Premium Redesign

Goal: driver app feels premium, native, and modern.

Screens:

- Home
- Loads
- Scan
- Chat
- Profile
- Load Detail
- Settlement History
- Compliance Documents
- Tax Documents
- Emergency
- App Settings

Visual direction:

- dark navy/purple background
- glass cards
- neon green accent
- electric blue secondary
- purple/blue glow
- premium iOS spacing
- safe-area support

Exit criteria:

- Bottom nav is Home, Loads, Scan, Chat, Profile.
- Scan is elevated and glowing.
- Map, HOS, Docs, and Pay move out of bottom nav into screens/menus.
- Driver UI no longer feels orange-heavy.

## Phase 6 — Driver Scan and Document Intelligence

Goal: driver can scan BOL, POD, and receipts from mobile.

Route:

- /driver/scan

Features:

- Camera frame UI
- Scan animation
- Extraction result card
- Confidence score
- Retake
- Confirm and Attach

Entities/functions:

- LoadDocument
- documentLifecycleEngine
- TimelineEvent
- Notification
- Message

Exit criteria:

- Scan screen exists.
- Driver can attach document to load.
- Dispatcher is notified.
- Document rejection and resubmit workflow works through chat or scan.

## Phase 7 — Settlement and 1099 Tax Center

Goal: support 1099 owner-operator settlement and year-end reporting.

Finance menu:

- Overview
- Profitability
- Settlements
- Payment Profiles
- Factoring
- Tax Center
- Expense Approvals
- IFTA

Settlement rules:

- Do not automatically deduct fuel, tolls, repairs, maintenance, or insurance unless HASTEN advanced money, the driver requested the advance, contract allows it, and the charge is approved/recorded.

1099 MVP:

- Form 1099-NEC only.
- Box 1 = base trip earnings plus detention paid to driver.
- Box 4 = 0.00 unless actual withholding is configured later.
- Driver can download published tax documents read-only.

Exit criteria:

- Settlement preview works.
- Driver net pay is clear.
- Tax Center preview math is correct.
- PDF preview exists.
- Published 1099 is available to driver read-only.

## Phase 8 — Incident and Emergency Center

Goal: structured accident, breakdown, cargo damage, roadside, and emergency workflows.

Entity:

- IncidentReport

Driver actions:

- Accident
- Breakdown
- Cargo Damage
- Roadside
- Call 911
- Notify Dispatch

Exit criteria:

- Driver can submit incident.
- Current GPS and active load attach if available.
- Dispatcher/admin receive notification.
- TimelineEvent and Message are created.

## Phase 9 — Theme, Density, and Appearance System

Goal: global modern UI that is compact for operations and premium for mobile.

Modes:

- Dark
- Light
- System
- High Contrast optional

Density:

- Comfortable
- Compact
- Ultra Compact

Defaults:

- Admin / Dispatcher: Compact
- Driver Mobile: Comfortable
- Diagnostics: Compact

Exit criteria:

- Appearance settings persist after refresh and login.
- Admin, driver, and customer can control appearance from correct settings area.
- UI remains readable and information-dense.

## Phase 10 — Super Admin Diagnostics and Cleanup

Goal: one diagnostics center replaces scattered test pages and markdown reports.

Route:

- /super-admin/settings/system-diagnostics

Entities:

- SystemDiagnosticRun
- SystemDiagnosticIssue

Capabilities:

- Route health
- Entity health
- Permissions check
- Automation check
- Native readiness
- Broken file table
- Cleanup preview
- Safe repair actions

Exit criteria:

- Diagnostics create database records.
- Issues can be ignored, resolved, retested, or repaired.
- Cleanup previews before deleting anything.
- Production data is never deleted without confirmation.

## Phase 11 — Native Readiness

Goal: clearly report native status and avoid false claims.

Before native is marked complete, verify:

- Capacitor installed or React Native project exists.
- android folder exists.
- ios folder exists.
- Camera plugin works.
- Push notifications configured.
- Background GPS configured.
- Secure storage configured.
- Biometric login supported if required.

If these do not exist, mark status as:

PWA only — native shell not created yet.

## Production Architecture Future Option

If Base44 becomes limiting, evolve toward:

- Web frontend: Next.js
- Mobile apps: React Native
- Backend API: NestJS / Node.js
- Database: PostgreSQL
- Realtime: WebSocket
- Storage: S3-compatible
- Auth: JWT + refresh tokens + RBAC
- Maps: Google Maps or Mapbox
- Notifications: FCM, APNs, email, SMS
- Accounting: QuickBooks later

Do not migrate prematurely. First stabilize and prove product workflows in the current repo.

## Quality Target

HASTEN should feel like:

Uber Freight + Samsara + Tesla + Bloomberg Terminal.

Final product qualities:

- enterprise dispatch control
- compact admin dashboards
- premium driver app
- load-board/API automation
- hidden-rate driver auction
- equipment-based load matching
- settlement and 1099 automation
- theme and density system
- super admin diagnostics
- runtime proof before completion

## Immediate Next Engineering Order

1. Verify local auth fix in VSCode.
2. Fix any current build/runtime errors.
3. Audit current routes and sidebar.
4. Implement missing driver scan route if incomplete.
5. Stabilize Dispatch Load Marketplace.
6. Add ExternalLoad and DriverLoadBid workflows.
7. Add System Diagnostics records and cleanup preview.
8. Add Tax Center 1099 preview and driver read-only download.
9. Add Capacitor only after driver mobile web UI is stable.
