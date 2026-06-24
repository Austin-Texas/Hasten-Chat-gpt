# HASTEN — NEXT STEPS & ACTION ITEMS

**Updated:** 2026-06-21  
**Priority:** Production launch in 3-4 weeks  
**Current Status:** 75% complete, 6 critical blockers

---

## 🔴 CRITICAL (BLOCKING LAUNCH)

### **Week 1: Payroll Tax Compliance**
**Estimated:** 5 days  
**Owner:** Finance team

- [ ] Create `W4Form` entity (filing status, allowances, deductions)
- [ ] Build W4 submission form (driver self-service)
- [ ] Implement federal tax withholding calculator (2026 IRS rates)
- [ ] Implement FICA calculator (6.2% Social Security, 1.45% Medicare)
- [ ] Implement state tax withholding (if multi-state)
- [ ] Update `calculatePayroll` function to deduct withholdings
- [ ] Create `TaxWithholding` record logging
- [ ] Generate W2 form stub (for January filing)
- [ ] Test: Calculate payroll for 3 drivers with different W4 statuses

**Deliverable:** Drivers receive net pay (gross − taxes), company can file W2 forms

---

### **Week 1: 1099 Contractor Tracking**
**Estimated:** 3 days  
**Owner:** Finance team

- [ ] Add `employment_type` field to Driver: "W2_employee" | "1099_contractor" | "owner_operator"
- [ ] Track annual gross income per contractor
- [ ] Trigger 1099-NEC generation when $600+ threshold reached
- [ ] Create export for tax filing (January deadline)
- [ ] Update driver edit form to select employment type

**Deliverable:** Can legally pay contractors, generate 1099-NEC forms

---

### **Week 2: Firebase Cloud Messaging (Push Notifications)**
**Estimated:** 1 week  
**Owner:** Mobile/backend team

**Infrastructure Setup:**
- [ ] Create GCP project
- [ ] Enable Firebase Cloud Messaging API
- [ ] Create Android API key
- [ ] Create iOS APNs certificate (Apple Developer)
- [ ] Store credentials in app secrets

**Backend:**
- [ ] Create FCM token registration endpoint
- [ ] Update `notifyLoadAssigned` to send FCM message
- [ ] Update `delayAlert` to send FCM message
- [ ] Update `detentionAlert` to send FCM message
- [ ] Add error logging for failed push sends

**Frontend:**
- [ ] Add FCM token registration on app load (all roles)
- [ ] Add service worker FCM message handler
- [ ] Store notification in Message entity
- [ ] Test: Assign load → receive push notification

**Deliverable:** Drivers receive push notifications when app closed

---

### **Week 2: Compliance Enforcement**
**Estimated:** 2 days  
**Owner:** Dispatch team

- [ ] Create `isDriverCompliant()` function (check CDL, medical, TWIC expiry)
- [ ] Create `isTruckCompliant()` function (check registration, insurance, inspection)
- [ ] Update LoadForm driver picker: disable/warn expired drivers
- [ ] Update LoadForm truck picker: disable/warn expired trucks
- [ ] Test: Try to assign expired driver → should fail

**Deliverable:** Cannot assign drivers/trucks with expired compliance docs

---

### **Week 2: Security Hardening**
**Estimated:** 2-3 days  
**Owner:** Backend team

- [ ] Add role check to `calculatePayroll` function (admin only)
- [ ] Add role check to `generateInvoice` function (admin/dispatcher only)
- [ ] Add role check to Payroll entity reads (admin only)
- [ ] Add role check to Finance entity reads (admin/dispatcher only)
- [ ] Implement data scoping: drivers see only self, clients see only own loads
- [ ] Add admin-only guard to sensitive backend functions
- [ ] Field redaction: clients don't see cost data in invoices

**Deliverable:** Secure entity access by role, no sensitive data leaks

---

## 🟡 HIGH PRIORITY (Week 3+)

### **Week 3: Compliance Automation**
**Estimated:** 1.5 days

- [ ] Scheduled function (daily 9am): Check document expiry dates
- [ ] 30 days before: Send notification to admin
- [ ] 7 days before: Send escalated alert to admin
- [ ] On expiry: Auto-set driver status to "inactive", create alert
- [ ] Test: Create driver with expiry date, verify alert at 30d, 7d, expiry

**Deliverable:** Automated reminders for expiring documents, auto-lockout

---

### **Week 3: Settlement Reports**
**Estimated:** 1 day

- [ ] Generate settlement PDF (itemized: base pay, bonuses, deductions, net)
- [ ] Email PDF to driver
- [ ] Store in DriverDocument entity
- [ ] Add download button in driver earnings dashboard

**Deliverable:** Drivers can access detailed settlement records

---

### **Week 3: Remove Hardcoded Dashboard Data**
**Estimated:** 1 day

- [ ] Replace `MOCK_REVENUE` with real Load queries by date range
- [ ] Replace hardcoded chart data with real Expense data
- [ ] Add date range selector to finance dashboard

**Deliverable:** Accurate KPI data in admin dashboard

---

### **Week 4: Internal Beta Testing**
**Estimated:** 2-3 days

- [ ] Recruit 5-10 internal drivers + 2-3 dispatchers
- [ ] Test full workflow: load creation → assignment → completion → payment
- [ ] Verify payroll: calculate, deduct taxes, verify net pay
- [ ] Verify push notifications: load assigned, delay detected, message sent
- [ ] Test compliance: assign expired driver (should fail)
- [ ] Security review: verify data isolation by role

**Deliverable:** Confidence in critical workflows before launch

---

## 📱 MEDIUM PRIORITY (Post-Launch, Weeks 5-8)

### **Fleet Manager Dashboard**
- Create unified truck/maintenance view
- Show utilization %, cost/mile, maintenance schedule
- **Effort:** 2-3 days
- **Can delay:** No blocker

---

### **Document Expiry Reminders UI**
- Driver receives in-app notification 30 days before expiry
- Show warning badge on documents
- **Effort:** 1 day
- **Can delay:** Yes

---

### **Notification Preferences**
- Toggle notification types (load assigned, delay, message, etc.)
- **Effort:** 1 day
- **Can delay:** Yes

---

### **Audit Logging**
- Log sensitive actions (login, payroll processed, invoice paid, driver deleted)
- Create audit log dashboard
- **Effort:** 2 days
- **Can delay:** Yes (nice-to-have)

---

## 🚀 LONG-TERM (Post-Launch, Months 2-6)

### **Native Apps (Android/iOS)**
- Capacitor wrapper setup
- Android build & Play Store submission
- iOS build & App Store submission
- **Timeline:** 8-16 weeks
- **Effort:** 60-80 days
- **Dependency:** PWA validation first

---

### **Advanced Features**
- AI chatbot support
- Custom roles system
- Third-party integrations (QuickBooks, FedEx, Stripe)
- White-label support

---

## 📊 PROGRESS TRACKING

### **Current Status (2026-06-21)**
- System Completion: **75%**
- Security: **50%**
- Compliance: **40%**
- Production Readiness: **75%**

### **Target Status (Week 5 - Internal Beta)**
- System Completion: **90%**
- Security: **85%**
- Compliance: **85%**
- Production Readiness: **90%**

### **Target Status (Week 8 - Public Launch)**
- System Completion: **95%**
- Security: **95%**
- Compliance: **95%**
- Production Readiness: **95%**

---

## BLOCKERS & RISKS

| Blocker | Risk | Mitigation | Owner |
|---------|------|------------|-------|
| Tax withholding complexity | May exceed timeline | Use IRS calculator library, hire tax consultant | Finance |
| Push notification setup | May fail if Firebase misconfigured | Read Google & Apple docs, test early | Mobile |
| Compliance enforcement | Could miss edge cases | Test with real driver/truck expiry data | Dispatch |
| Security review | May find vulnerabilities | Early security audit, penetration test | Backend |

---

## WEEKLY CHECK-IN TEMPLATE

Use this template every Friday to track progress:

```
## Week of [Date]

### ✅ Completed
- [ ] Payroll tax withholding (30% done)
- [ ] Push notifications (50% done)
- [ ] Compliance enforcement (done)

### 🚧 In Progress
- Payroll tax (W4 entity created, calculator next)
- Push notifications (Firebase setup done, backend wiring next)

### ⚠️ Blocked
- (none)

### 📈 Metrics
- Code commits: X
- Tests passing: X/Y
- Security issues: 0 critical, 0 high

### 📋 Next Week
- Finish tax withholding
- Start compliance enforcement
- Begin security hardening

### 🔴 Risks
- Tax calculation complexity — may need external library
```

---

## HOW TO UPDATE THIS FILE

1. Every audit → add summary to `NEXT_STEPS.md`
2. Every fix completed → move to ✅ **COMPLETED** section (at bottom)
3. Every new blocker → add to **BLOCKERS & RISKS** table
4. Every Friday → fill in **WEEKLY CHECK-IN** template
5. Commit to `/docs/NEXT_STEPS.md` for permanent reference

---

## COMPLETED ITEMS (Archive)

### ✅ **2026-06-21: Audits Complete**
- System completion audit (15 areas reviewed)
- Production hardening audit (security, compliance, stability)
- Native publishing audit (Android/iOS roadmap)
- Documentation consolidated in `/docs/`

---

**Status:** 🟡 **BLOCKING LAUNCH — 3-4 weeks to fix**  
**Last Updated:** 2026-06-21  
**Maintained In:** `/docs/NEXT_STEPS.md