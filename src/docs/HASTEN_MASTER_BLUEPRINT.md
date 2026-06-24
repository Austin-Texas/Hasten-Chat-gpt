# HASTEN — MASTER SYSTEM BLUEPRINT

**Last Updated:** 2026-06-21  
**Version:** 1.0  
**Status:** 75% Production-Ready

---

## EXECUTIVE SUMMARY

**HASTEN** is an enterprise-grade logistics platform for national freight companies. It provides:
- 📱 **Driver Mobile App** (PWA + native Android/iOS via Capacitor)
- 🎛️ **Dispatcher Dashboard** (real-time load assignment, tracking, analytics)
- 👔 **Admin Dashboard** (KPIs, compliance, payroll, finance)
- 🚚 **Fleet Manager** (truck maintenance, compliance, tracking)
- 💼 **Client/Broker Portal** (shipment tracking, invoices, payments, documents)
- 💰 **Finance & Payroll** (settlements, IFTA tax, profitability analytics)
- 📋 **Compliance Center** (CDL, medical, TWIC, insurance tracking)
- 🗣️ **Communications** (messages, support tickets, notifications)

**Tech Stack:** React 18 + Vite, Base44 BaaS, Tailwind CSS, Leaflet maps

---

## CORE MODULES

### 1. **Driver Mobile App** (PWA)
**Pages:**
- Dashboard — Active load, recent loads, availability toggle
- Loads — Browse available, view active, completed loads
- Load Detail — Map, progress, documents (BOL/POD), chat
- Map — Real-time GPS tracking, geofencing
- Messages — Real-time chat with dispatcher
- Earnings — YTD earnings, settlement history
- Profile — Personal info, documents, about vehicle
- Compliance Documents — License, medical, TWIC upload
- Settings — Language, theme, notifications, units
- HOS Monitor — Hours-of-service tracking
- Support — Support tickets, feedback

**Key Features:**
- GPS tracking (browser geolocation, 15s min interval)
- Offline sync (localStorage queue)
- Geofence arrival/departure events
- ETA recalculation (speed-based)
- Document upload (photos, receipts)
- Shift tracker (on-duty hours)

**Current Limitations:**
- Background GPS stops when app closes (needs Capacitor native)
- Push notifications only work in-app (needs FCM/APNs)

### 2. **Dispatcher Dashboard**
**Pages:**
- Dispatch Board (Kanban, list, live map views)
- Live Tracking Map
- Load Management (search, filter, detail, edit)
- Dispatcher Analytics (charts, trends)
- Messages/Inbox (with unread badges)

**Key Features:**
- Bulk load assignment (multi-select, keyboard shortcuts)
- Real-time driver location
- Geofence-based arrival notifications
- Load profitability calculator
- ETA updates based on GPS speed
- Document management (BOL/POD)

### 3. **Admin Dashboard**
**Pages:**
- Operations Center (KPIs, alerts, recent activity)
- Finance (invoices, expenses, profitability by client/broker/lane)
- Payroll (settlements, earnings, pay processing)
- IFTA Tax Reports (per-state fuel tax)
- Compliance (driver docs, expiry tracking)
- Documents (centralized file management)
- CRM (clients, brokers, shippers)
- Safety Dashboard (violations, incidents, alerts)
- Fleet Management (trucks, maintenance, status)
- Quotes (quote requests, approval, conversion to loads)
- Help Center (documentation, quick-start guides)

**Key Features:**
- KPI dashboard (revenue, profit, utilization)
- Load profitability analytics
- Driver earnings & payroll
- Tax compliance tracking
- Automated invoice generation
- Expense approval workflow

### 4. **Client/Broker Portal**
**Pages:**
- Dashboard (quick stats, recent shipments)
- Tracking (real-time map, ETA, status)
- Invoices (list, detail, payment via Base44 Payments)
- Documents (BOL, POD, rate confirmations)
- Support (ticket creation, chat)
- Booking (quote request form)

**Key Features:**
- Customer-safe data (no internal cost/margin data)
- Real-time shipment tracking
- Invoice payment (Base44 Payments integrated)
- Document upload/download
- Email notifications

---

## DATA MODEL (15 Core Entities)

```
Driver — driver info, compliance docs, current location, pay details
Load — shipment details, route, status, revenue, expenses
Truck — fleet vehicle, maintenance, compliance, status
Client — company info, credit limit, payment terms
Invoice — billing, payment status, amounts due
Expense — fuel, maintenance, tolls, lumper, reimbursement
PayrollRecord — driver earnings, pay period, deductions
GPSTrackPoint — breadcrumb trail, geofence events, route history
DriverDocument — receipts, compliance docs, upload history
Manifest — audit trail (load created, driver assigned, delivered, etc.)
Message — real-time chat between driver & dispatcher
SupportTicket — support requests, assignment, resolution
QuoteRequest — quote request, pricing, approval, conversion to load
LoadTemplate — pre-filled routes for quick load creation
Shipment — customer shipment (quote → load → invoice)
```

---

## PRODUCTION READINESS STATUS

### ✅ **READY NOW (75%)**
- Dispatcher dashboard (load assignment, tracking, analytics)
- Admin dashboard (KPIs, compliance tracking)
- Client portal (tracking, invoices, documents)
- CRM (client/broker management)
- Finance (invoices, expenses, profitability)
- Maps & GPS tracking
- Messages & real-time chat
- Quotes & load conversion
- Driver mobile app (PWA in browser)

### 🔴 **CRITICAL BLOCKERS (3-4 weeks to fix)**
1. **Payroll Tax Compliance** — No W4, tax withholding, W2, or 1099 generation
2. **Push Notifications** — No Firebase FCM or iOS APNs
3. **Compliance Enforcement** — Cannot block expired drivers/trucks from load assignment
4. **Security Hardening** — Missing entity permission validation and role-based data access

### 🟡 **HIGH PRIORITY (Post-launch)**
- Fleet Manager Dashboard (unified truck/maintenance view)
- Document expiry automation (reminders + auto-lockout)
- Notification preferences UI
- Audit logging
- Background GPS (native app only)

### 📱 **NATIVE APP READINESS (8-16 weeks post-launch)**
- Capacitor wrapper (Android + iOS)
- Background GPS via Capacitor geolocation
- Push notifications via Firebase FCM + APNs
- Native camera access
- App Store/Play Store publishing

---

## KEY FEATURES BY ROLE

### 🚗 **DRIVER**
- Accept/decline load assignments
- Real-time GPS tracking (manual start/stop)
- Load progress tracking (pickup → delivery)
- Photo/document upload (POD, receipts, inspection)
- Earnings dashboard
- Compliance document management
- HOS monitoring
- Support ticket creation
- Real-time chat with dispatcher

### 📊 **DISPATCHER**
- Bulk load assignment (multi-select)
- Real-time tracking map
- Load detail & edit
- Driver availability tracking
- Geofence notifications
- Load profitability calculation
- Analytics & reporting
- Driver performance scoring
- Inbox & notifications

### 👔 **ADMIN**
- Operations dashboard (KPIs, alerts)
- Financial analytics (revenue, expenses, margins)
- Payroll processing & settlements
- Tax reporting (IFTA, W2, 1099)
- Compliance tracking (CDL, medical, TWIC)
- User management (drivers, dispatchers, clients)
- Fleet management (trucks, maintenance)
- Audit logs & reporting

### 💼 **CLIENT/BROKER**
- Shipment tracking (map, ETA, status)
- Invoice viewing & payment
- Document upload/download
- Support ticket creation
- Quote request submission
- Payment via credit card (Base44 Payments)

---

## TECHNICAL ARCHITECTURE

### **Frontend Stack**
- **Framework:** React 18 + React Router
- **Build:** Vite
- **Styling:** Tailwind CSS + custom CSS variables
- **Maps:** React-Leaflet (OpenStreetMap)
- **Charts:** Recharts
- **UI Components:** shadcn/ui library
- **Icons:** lucide-react
- **Auth:** Base44 SDK
- **State Management:** React hooks + context
- **Offline:** localStorage + service worker

### **Backend Stack**
- **Runtime:** Deno
- **Database:** Base44 entities (JSON schema)
- **API:** Base44 SDK + custom functions
- **Payments:** Base44 Payments (Wix Payments)
- **Authentication:** Base44 Auth (OAuth, email/password, OTP)
- **Notifications:** Web API (in-app), Firebase FCM (mobile push)
- **Email:** Base44 integrations (SendEmail)
- **Geocoding:** Nominatim (OpenStreetMap free tier)

### **Infrastructure**
- **Hosting:** Base44 (auto-deploy, serverless functions)
- **Database:** Base44 managed
- **Storage:** Private file storage for documents
- **DNS:** Custom domain support
- **SSL/TLS:** Auto-provisioned

---

## KEY WORKFLOWS

### 1. **Load Creation & Assignment**
1. Dispatcher creates load (route, dates, rate, equipment)
2. System auto-geocodes addresses (Nominatim)
3. Margin calculator shows profit estimate
4. Dispatcher assigns driver (or bulk assign multiple)
5. Driver notified (push if native app, in-app message)
6. Driver accepts/declines
7. Manifest event logged

### 2. **Load Execution**
1. Driver views load details (map, ETA, documents)
2. Driver starts GPS tracking (manual toggle)
3. Geofence event triggers on pickup arrival
4. Driver uploads BOL confirmation
5. Driver en-route to delivery
6. Geofence event triggers on delivery arrival
7. Driver uploads POD (proof of delivery)
8. Status auto-updates to "delivered"

### 3. **Billing & Payment**
1. Load marked complete
2. Invoice auto-generated (amount = rate + surcharges − deductions)
3. Invoice sent to client (email)
4. Client views invoice in portal
5. Client clicks "Pay" → Base44 Payments checkout
6. Payment processed (card, ACH, etc.)
7. Invoice status updates to "paid"
8. Commission credited to broker (if applicable)

### 4. **Payroll & Settlements**
1. Admin clicks "Process Payroll" (manual or scheduled weekly)
2. System calculates per-driver earnings from completed loads
3. Deductions: fuel, maintenance, expenses
4. Tax withholding calculated (federal, FICA, state)
5. Settlement record created (gross pay, deductions, net pay)
6. Driver views settlement in earnings dashboard
7. Payment processed (direct deposit, check, etc.)
8. Year-end: W2 or 1099 forms generated

### 5. **Compliance Tracking**
1. Driver uploads license, medical, TWIC, insurance docs
2. System extracts expiry dates
3. Scheduled job runs daily: check expiry dates
4. 30 days before expiry: reminder notification
5. 7 days before expiry: escalated alert
6. On expiry: auto-lock driver to inactive status
7. Admin notified to follow up on renewal

---

## PERFORMANCE BASELINES

| Metric | Target | Current |
|--------|--------|---------|
| Page load | <3s | ~2s (PWA cached) |
| Geolocation accuracy | ±10m | ±5-20m (depends on device) |
| Real-time map refresh | <10s | ~5-10s (10s dispatcher polling) |
| Message latency | <1s | <500ms (WebSocket) |
| Offline queue sync | Auto on reconnect | ✅ Works |
| Scalability | 1000+ drivers/trucks | ⚠️ May need pagination at 500+ |

---

## SECURITY & COMPLIANCE

### **Authentication**
- Email/password with OTP
- OAuth (Google, Apple, Microsoft, Facebook)
- Role-based access (admin, dispatcher, driver, client, broker)
- Token expiry + refresh

### **Data Protection**
- TLS/SSL encryption (HTTPS)
- Private file storage (documents, photos)
- Signed URLs for file download
- No PII in logs or analytics

### **Compliance**
- GDPR-compliant (user data export, deletion)
- COPPA-compliant (no child data)
- DOT-compliant (CDL, medical, TWIC tracking)
- IFTA-compliant (state fuel tax reporting)
- Payroll-compliant (W2, 1099, tax withholding) — **TO BE IMPLEMENTED**

---

## DEPLOYMENT CHECKLIST

**Before Production Launch:**
- [ ] Tax withholding & W2/1099 generation
- [ ] Push notifications (FCM + APNs)
- [ ] Compliance enforcement (block expired drivers)
- [ ] Security hardening (entity permissions, audit logs)
- [ ] Load test with 100+ concurrent users
- [ ] Browser compatibility test (Chrome, Firefox, Safari)
- [ ] Mobile device test (iOS, Android, tablets)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Security review (OWASP top 10)
- [ ] Incident response plan
- [ ] Backup & disaster recovery plan

---

## ROADMAP

### **Phase 1: MVP Launch (Weeks 1-4)**
- ✅ Dispatcher & admin dashboards
- ✅ Driver mobile app (PWA)
- ✅ Client portal
- ✅ Load management
- ✅ Finance & invoicing
- ✅ Base44 Payments integration
- 🔴 **FIX:** Payroll tax, push notifications, compliance enforcement, security

### **Phase 2: Polish & Hardening (Weeks 5-8)**
- [ ] Fleet Manager Dashboard
- [ ] Document expiry automation
- [ ] Audit logging
- [ ] Notification preferences
- [ ] Settlement PDFs
- [ ] Internal beta testing

### **Phase 3: Native Apps (Weeks 9-24)**
- [ ] Capacitor wrapper
- [ ] Android build & Play Store
- [ ] iOS build & App Store
- [ ] Background GPS
- [ ] Offline-first sync
- [ ] Push notifications (native)

### **Phase 4: Enterprise Features (Months 6+)**
- [ ] Custom roles & field-level RBAC
- [ ] AI chatbot support
- [ ] Advanced compliance features
- [ ] Third-party integrations (QuickBooks, FedEx, Stripe)
- [ ] White-label support

---

## DOCUMENTATION & SUPPORT

**See Also:**
- `/docs/HASTEN_SYSTEM_COMPLETION_AUDIT.md` — What's complete, what's missing
- `/docs/PRODUCTION_HARDENING_AUDIT.md` — Security, compliance, stability gaps
- `/docs/NATIVE_PUBLISHING_AUDIT.md` — Android/iOS publishing plan
- `/docs/NEXT_STEPS.md` — Immediate action items
- `/docs/CHANGELOG.md` — Version history & changes

**Getting Help:**
- Built-in Help Center in admin dashboard (press ? or go to `/help`)
- Driver support tickets (`/driver/support`)
- Admin support tickets (`/support-tickets`)

---

## VERSION HISTORY

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-06-21 | Draft | Initial blueprint, 75% complete |

---

**This master blueprint is maintained in `/docs/HASTEN_MASTER_BLUEPRINT.md` for permanent reference.**