# PAYROLL TAX ENGINE — AUDIT REPORT

**Date:** 2026-06-21  
**Status:** Initial audit of payroll infrastructure

---

## WHAT ALREADY EXISTS ✅

### **Driver Entity**
- ✅ `driver_type` field: `company_driver | owner_driver | contractor`
- ✅ `pay_type` field: `per_mile | percentage | flat_rate | hourly`
- ✅ `pay_rate` field (numeric)
- ✅ `earnings_ytd` field (tracking)
- ✅ `tax_doc_url` field (document storage)

### **Payroll.jsx Page**
- ✅ Payroll dashboard exists
- ✅ PayrollRecord.list() queries
- ✅ Filter by status (pending, calculated, approved, paid)
- ✅ Quick process buttons
- ✅ Approval workflow
- ⚠️ **Calls `calculatePayroll` function (doesn't exist yet)**

---

## WHAT'S MISSING ❌

### **Entities (Create 3)**
1. ❌ **PayrollRecord** — `{driver_id, pay_period_start, pay_period_end, gross_pay, federal_withholding, fica_withholding, state_withholding, deductions, net_pay, status, ...}`
2. ❌ **TaxProfile** — `{driver_id, employment_type, filing_status, dependents, extra_withholding, ...}` (for W2 employees)
3. ❌ **SettlementRecord** — `{driver_id, period, gross_settlement, deductions, net_settlement, loads_included, ...}`

### **Backend Functions (Create 1)**
1. ❌ **calculatePayroll.js** — Compute gross → deductions → net for pay period

### **Tax Calculations**
- ❌ Federal withholding calculation (IRS 2026 rates)
- ❌ FICA calculation (6.2% SS + 1.45% Medicare)
- ❌ State withholding calculation
- ❌ Contractor settlement logic (no withholding)

### **Tax Documents**
- ❌ W2 form data export
- ❌ 1099-NEC form data export
- ❌ Tax document generation/storage

### **Driver Self-Service**
- ❌ Tax profile form for drivers (W4 equivalent)
- ❌ Settlement/pay stub viewing (driver role)
- ❌ Earnings history dashboard

---

## ARCHITECTURE PLAN

### **Payroll Flow**
1. Admin clicks "Process Payroll" for date range (weekly/biweekly/monthly)
2. Backend function fetches completed loads for each driver
3. Calculates: gross pay (from load rates + bonuses)
4. Calculates: deductions (federal, FICA, state, benefits)
5. Creates PayrollRecord (status: "calculated")
6. Admin reviews, approves (status: "approved")
7. Payment processed (status: "paid")
8. Driver views settlement in earnings dashboard

### **Tax Withholding (Employees)**
- W2 driver on file (TaxProfile)
- Federal: IRS Form W-4 equivalent (filing status, allowances)
- FICA: Always 6.2% (SS) + 1.45% (Medicare)
- State: Varies by state, optional local tax
- Health/garnishments: If on file

### **Contractor Settlement (1099)**
- No federal withholding (contractor responsible)
- Deductions: Only business (fuel, maintenance, insurance)
- Final settlement: Gross − business deductions
- 1099-NEC if annual > $600

---

## NEXT STEPS

**Phase 1 (this session):**
1. Create PayrollRecord entity
2. Create TaxProfile entity
3. Create SettlementRecord entity
4. Create calculatePayroll backend function
5. Add employment_type field to Driver if missing
6. Wire up tax calculations

**Phase 2 (follow-up):**
1. Create W2 / 1099-NEC data export
2. Add driver tax profile UI
3. Add settlement report PDF
4. Add payroll schedule/automation

---

**Audit Complete** — Ready to build missing pieces.