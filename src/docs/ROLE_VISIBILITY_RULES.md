# Role-Based Visibility Rules — Complete Reference

**Generated:** 2026-06-21  
**System:** HASTEN Enterprise  
**Status:** ✅ Implemented and Enforced

---

## OVERVIEW

Each role sees only data and features relevant to their daily workflow. Visibility is enforced at three levels:

1. **UI Level** — Modules hidden from sidebar (eye closed)
2. **Route Level** — Routes inaccessible (AccessDenied page)
3. **Data Level** — Sensitive fields redacted from responses

---

## ROLE DEFINITIONS & RULES

### 👤 ADMIN
**Purpose:** Full system control. Owns settings, user management, audit logs.  
**Power:** Everything visible and accessible.

#### Sidebar Modules (14 modules)
- ✅ Dashboard
- ✅ Dispatch Board
- ✅ Loads
- ✅ Drivers
- ✅ Fleet
- ✅ Tracking
- ✅ Finance
- ✅ Payroll
- ✅ Compliance
- ✅ CRM
- ✅ Messages
- ✅ Support Tickets
- ✅ Notifications
- ✅ Settings

#### Dashboard KPIs
All 9 cards visible: active loads, completed today, revenue MTD, active drivers, available drivers, active trucks, unpaid invoices, overdue invoices, blockers/alerts

#### Data Visibility
| Entity | Fields | Access |
|--------|--------|--------|
| Driver | All including SSN | ✅ Full |
| Loads | All | ✅ Full |
| Invoices | All | ✅ Full |
| Payroll | All | ✅ Full |
| Expenses | All | ✅ Full |
| Clients | All | ✅ Full |
| Tax Data | All | ✅ Full |

#### Special Permissions
- Create/delete users
- Change user roles
- Manage all settings
- View audit logs
- Change permissions
- Manage visibility rules
- Apply themes globally

---

### 🔧 SYSTEM MANAGER
**Purpose:** Day-to-day operations management without settings/user access.  
**Power:** Can manage dispatch, drivers, finance, compliance — but not admin functions.

#### Sidebar Modules (12 modules)
- ❌ Dashboard (hidden — but has ops dashboard)
- ✅ Dispatch Board
- ✅ Loads
- ✅ Drivers
- ✅ Fleet
- ✅ Tracking
- ✅ Finance
- ✅ Payroll
- ✅ Compliance
- ✅ CRM
- ✅ Messages
- ✅ Support Tickets
- ✅ Notifications
- ❌ Settings (hidden — no access)

#### Dashboard KPIs
8 cards: active loads, completed, revenue, active drivers, available drivers, active trucks, unpaid invoices, overdue invoices

#### Data Visibility
| Entity | Fields | Access |
|--------|--------|--------|
| Driver | No SSN, yes pay rates, licenses, medical | ✅ Most |
| Loads | All | ✅ Full |
| Invoices | All | ✅ Full |
| Payroll | All | ✅ Full |
| Expenses | All | ✅ Full |
| Settings | None | ❌ Blocked |

#### Special Permissions
- Approve payroll
- Approve expenses
- Manage compliance overrides
- Cannot create users or change roles

---

### 📦 DISPATCHER
**Purpose:** Load assignment, driver management, communication.  
**Power:** Daily dispatch operations only.

#### Sidebar Modules (8 modules)
- ✅ Dashboard (ops dashboard only)
- ✅ Dispatch Board
- ✅ Loads
- ✅ Drivers
- ✅ Live Tracking
- ✅ Messages
- ✅ Support Tickets
- ✅ Notifications

#### Hidden Modules
- ❌ Finance (invoices, payroll, expenses)
- ❌ Compliance (restricted to live alerts only)
- ❌ CRM
- ❌ Settings

#### Dashboard KPIs
4 cards only: active loads, completed today, active drivers, available drivers

#### Data Visibility (Highly Scoped)
| Entity | Fields | Access |
|--------|--------|--------|
| Driver | Status, location, current load, not: SSN, pay rate, license, medical | 🔍 Scoped |
| Loads | Pickup, delivery, status, driver, equipment, not: rate, revenue, client contact | 🔍 Scoped |
| Invoices | None | ❌ Hidden |
| Payroll | None | ❌ Hidden |
| Expenses | None | ❌ Hidden |
| Clients | Contact info only | 🔍 Limited |

#### Special Permissions
- Assign drivers to loads
- Update load status
- Send messages to drivers
- View tracking in real-time
- Cannot approve expenses, see financials, or manage compliance

---

### 🚛 FLEET MANAGER
**Purpose:** Vehicle management, maintenance, compliance, driver certifications.  
**Power:** Fleet operations, not dispatch or finance.

#### Sidebar Modules (8 modules)
- ✅ Fleet
- ✅ Maintenance
- ✅ Compliance
- ✅ GPS Tracking
- ✅ Drivers (for compliance view)
- ✅ Safety
- ✅ Documents
- ✅ Notifications

#### Hidden Modules
- ❌ Dispatch Board
- ❌ Finance
- ❌ Payroll
- ❌ CRM

#### Dashboard KPIs
4 cards: active trucks, idle trucks, maintenance needed, compliance alerts

#### Data Visibility (Fleet-Focused)
| Entity | Fields | Access |
|--------|--------|--------|
| Trucks | All (maintenance, status, inspection) | ✅ Full |
| Drivers | Compliance docs, license, medical, not: SSN, pay | 🔍 Scoped |
| Loads | Assigned truck only, not: rate, revenue, client | 🔍 Limited |
| Maintenance | All | ✅ Full |
| Compliance | All | ✅ Full |
| Invoices | None | ❌ Hidden |
| Payroll | None | ❌ Hidden |

#### Special Permissions
- Schedule maintenance
- Track compliance expirations
- Approve service work
- View GPS tracking
- Cannot dispatch loads or see financials

---

### 💰 FINANCE
**Purpose:** Invoicing, payroll, expenses, tax compliance.  
**Power:** Financial data only, no operations.

#### Sidebar Modules (7 modules)
- ✅ Finance
- ✅ Payroll
- ✅ Invoices
- ✅ Expenses
- ✅ Clients (CRM — client billing info)
- ✅ Documents
- ✅ Notifications

#### Hidden Modules
- ❌ Dispatch Board
- ❌ Tracking
- ❌ Fleet
- ❌ Safety
- ❌ Settings

#### Dashboard KPIs
4 cards: revenue MTD, unpaid invoices, overdue invoices, total expenses

#### Data Visibility (Finance-Only)
| Entity | Fields | Access |
|--------|--------|--------|
| Driver | Pay rate, pay type, tax info, SSN last 4, not: license, medical, personal | 🔍 Limited |
| Loads | Rate, revenue, expenses, profit, not: driver personal, vehicle details | 🔍 Limited |
| Invoices | All | ✅ Full |
| Payroll | All | ✅ Full |
| Expenses | All | ✅ Full |
| Clients | Credit limits, balance, payment terms, not: internal notes | 🔍 Limited |
| Tracking | None | ❌ Hidden |
| Compliance | None | ❌ Hidden |

#### Special Permissions
- Approve payroll
- Approve expenses
- Export tax reports
- Generate invoices
- Cannot modify driver data or see dispatch operations

---

### 🚙 DRIVER (Mobile App)
**Purpose:** Own load status, map, earnings, documents.  
**Power:** Self-service load completion and communication.

#### Mobile Tabs (8 tabs)
- ✅ Dashboard (personal stats)
- ✅ My Loads (assigned only)
- ✅ Map (route, ETA)
- ✅ Documents (my docs, compliance)
- ✅ Messages (dispatcher, support)
- ✅ Earnings (my pay)
- ✅ Profile (my info)
- ✅ Support (help)

#### Profile Menu (8 items)
- ✅ Edit Profile
- ✅ My Documents
- ✅ About Me
- ✅ About Vehicle
- ✅ Companies
- ✅ Feedback
- ✅ Support
- ✅ Settings (personal only)

#### Data Visibility (Own Data Only)
| Entity | Fields | Access |
|--------|--------|--------|
| Loads | Own loads only, status, pickup, delivery, commodity, instructions, POD | ◯ Own |
| Earnings | Own earnings only, gross, deductions, net, payment method | ◯ Own |
| Payroll | Own payroll only, periods, gross, net | ◯ Own |
| Other Drivers | None | ❌ Hidden |
| Invoices | None | ❌ Hidden |
| Financials | None | ❌ Hidden |
| Admin/Settings | None | ❌ Hidden |
| Other Driver Data | None | ❌ Hidden |

#### Special Permissions
- Update load status
- Upload proof of delivery
- View route & ETA
- Check earnings
- Message dispatcher
- Get support
- Cannot see other drivers, rates, company finances, or dispatch board

---

### 📋 CLIENT PORTAL
**Purpose:** Shipment tracking, invoice viewing, communication.  
**Power:** Own shipments and invoices only.

#### Portal Tabs (4 tabs)
- ✅ Track Shipments
- ✅ Invoices
- ✅ Documents
- ✅ Messages

#### Data Visibility (Own Company Only)
| Entity | Fields | Access |
|--------|--------|--------|
| Loads | Own loads only, status, pickup, delivery, commodity, ETA, POD | ◯ Own |
| Invoices | Own invoices only, amount, status, due date, items | ◯ Own |
| Documents | Own documents only | ◯ Own |
| Messages | Conversations only | ◯ Own |
| Other Clients | None | ❌ Hidden |
| Drivers | None | ❌ Hidden |
| Pricing | None | ❌ Hidden |
| Financials | None | ❌ Hidden |

#### Special Permissions
- View own shipments
- View own invoices
- Download POD
- Message support
- Cannot see other companies, pricing, or operations

---

### 🤝 BROKER PORTAL
**Purpose:** Load management, quoting, invoice tracking.  
**Power:** Assigned loads and quotes only.

#### Portal Tabs (4 tabs)
- ✅ Track Loads
- ✅ Invoices
- ✅ Quotes
- ✅ Messages

#### Data Visibility (Assigned Only)
| Entity | Fields | Access |
|--------|--------|--------|
| Loads | Assigned loads only, status, pickup, delivery, equipment, weight, rate agreed | 🔍 Assigned |
| Invoices | Own invoices only, amount, status, due date, terms | 🔍 Assigned |
| Quotes | Own quotes only, all fields | ◯ Own |
| Messages | Conversations only | ◯ Own |
| Other Brokers | None | ❌ Hidden |
| Drivers | None | ❌ Hidden |
| Internal Pricing | None | ❌ Hidden |
| Financial Data | None | ❌ Hidden |

#### Special Permissions
- Create quotes
- Accept/reject quotes
- View assigned loads
- Message support
- Cannot see other brokers, internal pricing, or company operations

---

## QUICK COMPARISON MATRIX

| Feature | Admin | Mgr | Dispatcher | Fleet | Finance | Driver | Client | Broker |
|---------|-------|-----|-----------|-------|---------|--------|--------|--------|
| **Dispatch Board** | ✓ | ✓ | ✓ | △ | ✗ | ✗ | ✗ | △ |
| **All Loads** | ✓ | ✓ | ✓ | △ | △ | ◯ | ◯ | ◯ |
| **All Drivers** | ✓ | ✓ | ✓ | △ | △ | ✗ | ✗ | ✗ |
| **Finance** | ✓ | ✓ | ✗ | ✗ | ✓ | △ | ✗ | △ |
| **Payroll** | ✓ | ✓ | ✗ | ✗ | ✓ | ◯ | ✗ | ✗ |
| **Fleet** | ✓ | ✓ | △ | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Compliance** | ✓ | ✓ | △ | ✓ | ✗ | △ | ✗ | ✗ |
| **Settings** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **User Mgmt** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Legend:**
- ✓ = Full access
- △ = Partial/scoped access (relevant data only)
- ◯ = Own data only
- ✗ = No access

---

## IMPLEMENTATION STATUS

### ✅ Implemented
- DEFAULT_VISIBILITY config with all roles
- Dashboard KPI visibility per role
- Sidebar module visibility per role
- Data-level visibility scoping
- RoleVisibilityMatrix component
- AdminSettingsPanel Data Access tab
- Route guards (ProtectedRoute)
- Field redaction (FIELD_REDACTION)

### ⏳ Optional Enhancements
- [ ] Column visibility in data tables per role
- [ ] PDF export filtering by role
- [ ] Graph/chart element visibility
- [ ] Mobile hamburger menu filtering
- [ ] Role-based email content filtering

### ✅ Enforcement Points
1. **UI Sidebar** — Modules hidden/shown per role
2. **Routes** — AccessDenied for unauthorized paths
3. **Components** — Conditional rendering per visibility rules
4. **Data Responses** — Fields redacted by FIELD_REDACTION
5. **Backend** — Permission checks via permissionGuards
6. **Audit** — All visibility changes logged

---

## HOW ADMIN CONTROLS VISIBILITY

### In AdminSettingsPanel:

1. **Go to Settings → Data Access tab**
2. **See all 8 roles with what they can see**
3. **Click role card to expand details**
4. **View visible modules, hidden modules, data access**
5. **Modify visibility per role**
6. **Changes save to PortalVisibility entity**
7. **Users see new visibility on next page load**

### Visibility Override:

Admins can use **UserPrivilege** to grant temporary or restricted access:
- Grant dispatcher access to see payroll for 1 specific driver for 2 hours
- Restrict a user's access (suspended user)
- Grant finance access to view driver personal info for background check (temporary)

---

## TESTING WORKFLOW

```
Test each role:
1. Driver logs in → sees only own loads, own earnings
2. Dispatcher logs in → sees all loads, all drivers, no finance data
3. Fleet Mgr logs in → sees fleet, compliance, no dispatch operations
4. Finance logs in → sees invoices, payroll, no dispatch
5. Admin logs in → sees everything
6. Client logs in → sees own shipments only
7. Broker logs in → sees assigned loads & quotes only

Test route protection:
1. Dispatcher tries /finance → AccessDenied
2. Driver tries /dispatch → AccessDenied
3. Client tries /admin → AccessDenied
4. Admin tries any route → allowed

Test data redaction:
1. Dispatcher views driver → no SSN, no pay rate shown
2. Finance views driver → pay rate shown, no SSN
3. Driver views own payroll → gross/net shown, not withholding details
```

---

## SUMMARY

- ✅ **8 roles** with distinct visibility rules
- ✅ **14 modules** in admin sidebar (configurable per role)
- ✅ **3 levels** of enforcement (UI, route, data)
- ✅ **100% coverage** of all user types
- ✅ **Fully configured** in DEFAULT_VISIBILITY
- ✅ **Audited** — all visibility changes logged
- ✅ **Enforceable** — admin can modify rules in AdminSettingsPanel

Admin Settings now fully controls what each role sees. Simple, clear, and role-appropriate visibility.