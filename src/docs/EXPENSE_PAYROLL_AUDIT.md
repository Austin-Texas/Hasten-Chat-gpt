# EXPENSE-TO-PAYROLL INTEGRATION AUDIT

**Date:** 2026-06-21  
**Status:** ❌ **CRITICAL GAP FOUND** — Expenses not connected to payroll deductions

---

## WHAT EXISTS ✅

**Expense Entity:**
- ✅ `driver_id`, `load_id` — Links to driver and load
- ✅ `status`: pending, approved, rejected, reimbursed
- ✅ `is_reimbursable` flag — Distinguishes company expenses from reimbursements
- ✅ `category`: fuel, maintenance, tolls, lumper, detention, insurance, etc.
- ✅ `amount` — Dollar amount
- ✅ `approved_by` — Admin who approved

**PayrollRecord Entity:**
- ✅ Fields for deductions: `federal_withholding`, `fica_*`, `state_withholding`, `total_deductions`
- ⚠️ **Missing:** Per-category expense deductions, approved expense tracking

**SettlementRecord Entity:**
- ✅ Fields for contractor deductions: `fuel_deduction`, `maintenance_deduction`, `insurance_deduction`, `escrow_holdback`
- ⚠️ **Missing:** Link to Expense entity, automated calculation

---

## WHAT'S BROKEN ❌

### **Problem 1: Expenses Not Fetched During Payroll**

**File:** `functions/calculatePayroll.js` (lines 68-104)

**Current behavior:**
```javascript
// Only fetches loads
const loads = await base44.asServiceRole.entities.Load.filter({
  driver_id,
  status: 'completed'
}, "-created_date", 500);

// Calculates gross pay
// NO EXPENSE FETCHING
// NO DEDUCTION CALCULATION
```

**Impact:** 
- Driver expenses are ignored
- Net pay calculated without subtracting business costs
- Contractor settlements missing expense deductions
- Financial reports overstated

### **Problem 2: No Expense Deduction in PayrollRecord**

**Current PayrollRecord fields don't track:**
- `approved_expenses_amount` — Total approved expenses in period
- `fuel_deduction`, `maintenance_deduction`, etc. — Per-category breakdown
- `expenses_included` — Array of Expense IDs applied

**Result:** Audit trail missing; no visibility into which expenses reduced pay

### **Problem 3: SettlementRecord Not Calculating from Expenses**

**For contractors/owner-operators:**
- Manual fields exist: `fuel_deduction`, `maintenance_deduction`
- But they're NOT populated from Expense records
- Must be entered manually — error-prone

---

## SOLUTION ✅

### **Update calculatePayroll.js**

**Add expense fetching & deduction:**

```javascript
// 1. Fetch approved expenses in period (both driver & truck)
const expenses = await base44.asServiceRole.entities.Expense.filter({}, "-created_date", 5000);

const expensesInPeriod = expenses.filter(e => {
  const expenseDate = new Date(e.date);
  return e.status === 'approved' && 
         (e.driver_id === driver_id || e.truck_id === driver.truck_id) &&
         expenseDate >= new Date(pay_period_start) && 
         expenseDate <= new Date(pay_period_end);
});

// 2. Categorize expenses
const expensesByCategory = {};
let totalApprovedExpenses = 0;

expensesInPeriod.forEach(exp => {
  if (!expensesByCategory[exp.category]) {
    expensesByCategory[exp.category] = 0;
  }
  expensesByCategory[exp.category] += exp.amount || 0;
  totalApprovedExpenses += exp.amount || 0;
});

// 3. For W-2: Reduce net pay only if reimbursable (company covers)
// For 1099/owner: Reduce settlement (contractor bears cost)
let expenseDeduction = 0;
if (taxProfile.employment_type !== 'W2_employee') {
  // Contractors/owners absorb business expenses
  expenseDeduction = totalApprovedExpenses;
} else if (e.is_reimbursable === false) {
  // W-2 drivers can have approved non-reimbursable expenses
  expenseDeduction += exp.amount;
}

// 4. Recalculate net pay
const netPayAfterExpenses = Math.max(0, netPay - expenseDeduction);
```

### **Update PayrollRecord Schema**

Add fields to track expense deductions:
```json
"approved_expenses_amount": { "type": "number", "default": 0 },
"fuel_deduction": { "type": "number", "default": 0 },
"maintenance_deduction": { "type": "number", "default": 0 },
"insurance_deduction": { "type": "number", "default": 0 },
"tolls_deduction": { "type": "number", "default": 0 },
"other_deductions": { "type": "number", "default": 0 },
"expenses_included": { "type": "array", "items": { "type": "string" } }
```

---

## IMPLEMENTATION PLAN

### **Phase A: Immediate Fix (This Session)**

1. Update `calculatePayroll.js` to fetch & deduct approved expenses
2. Update `PayrollRecord` entity schema with expense tracking fields
3. Add expense category breakdown to settlement statement
4. Verify contractor settlement deductions work

### **Phase B: Safety Checks**

1. Add validation: Expense date must be within pay period
2. Add warning: Approved expenses on rejected loads (shouldn't happen)
3. Add audit log: Which expenses reduced which paycheck

### **Phase C: Admin Visibility**

1. Add "Expenses" tab to PayrollRecord detail view
2. Show itemized expense breakdown (fuel: $500, maintenance: $200, etc.)
3. Allow admin to exclude specific expenses before approval

---

## BUSINESS RULES

### **When Expenses Reduce Pay:**

| Employment Type | Approved Non-Reimbursable | Contractor Expenses | Company Covers |
|---|---|---|---|
| **W-2 Employee** | Yes (reduce net) | N/A | Reimbursable = separate check |
| **1099 Contractor** | Yes (reduce settlement) | All (reduce settlement) | Not applicable |
| **Owner-Operator** | Yes (reduce settlement) | All (reduce settlement) | Company share only |

### **Expense Status Rules:**

- `pending` → Not deducted (not approved yet)
- `approved` → **Deducted immediately** when payroll is calculated
- `rejected` → Not deducted (denied)
- `reimbursed` → Already paid to driver separately; mark flag to exclude from payroll

---

## SECURITY CONSIDERATIONS

**Who can create/approve expenses that reduce pay?**
- Only admin/finance can `approve` expenses
- Backend enforces `expense.approved_by` field
- Driver cannot approve own expenses

**Validation before deduction:**
- Expense must be `status: 'approved'`
- Expense date must be within pay period
- `is_reimbursable` flag determines if separate reimbursement sent

---

## RISK IF NOT FIXED

**Financial Impact:**
- ❌ Driver settlements inflated (expenses not deducted)
- ❌ Contractor profitability understated
- ❌ Tax basis incorrect (expenses not tracked separately)
- ❌ Year-end W-2/1099 forms missing expense items

**Compliance Risk:**
- ❌ IRS might flag inflated W-2 amounts (if W-2 drivers claim expenses they didn't bear)
- ❌ Contractor 1099s overstated if expenses not deducted
- ❌ Audit trail missing (no record of which expenses reduced which paycheck)

**Operational Risk:**
- ❌ Drivers paid for expenses company already covered
- ❌ Double-reimbursement possible if not tracked
- ❌ Contractors subsidizing company fuel/insurance costs

---

## PRIORITY

**🔴 CRITICAL BLOCKER** — Must fix before payroll launch

This is not a nice-to-have; it's a financial & tax compliance requirement.