# Detention Approval Workflow

**Date:** 2026-06-21  
**Status:** ✅ COMPLETE  
**Purpose:** Internal manager review & approval of detention charges before final billing

---

## Overview

The detention approval workflow implements a multi-stage review process:

1. **Dispatcher submits** resolved detention for manager approval
2. **Manager reviews** billable minutes calculation
3. **Manager can edit** billable minutes if calculation error detected
4. **Manager approves** → detention moves to "approved" status, ready for invoicing
5. **Manager rejects** → detention disputed back to dispatcher with feedback

This prevents erroneous detention charges from reaching customer invoices.

---

## Updated DetentionRecord Entity

**New Fields:**
- `status`: Added "pending_approval" and "approved" to enum
- `billable_minutes_reviewed`: Edited billable minutes (if manager adjusts)
- `billable_amount_reviewed`: Recalculated amount after manager edit
- `reviewed_by`: User ID of manager who reviewed
- `reviewed_at`: Timestamp of review
- `review_notes`: Manager notes on any edits

**Status Enum:**
```
free_wait → active → resolved → pending_approval → approved → [invoice]
                  ↓
                disputed (if rejected)
```

---

## Backend Function: detentionApprovalWorkflow

**Location:** `functions/detentionApprovalWorkflow.js`

### Actions

#### `submit_for_approval`
- Takes resolved DetentionRecord
- Sets status → `pending_approval`
- Copies billable_minutes → billable_minutes_reviewed
- Copies billable_amount → billable_amount_reviewed
- Creates audit log: "detention_submitted_for_approval"
- Creates manifest event: "detention_submitted_for_approval"
- Used by dispatcher via DetentionStopCard

#### `review_detention`
- Manager edits billable_minutes
- Recalculates billable_amount_reviewed = (billable_minutes_reviewed / 60) * rate_per_hour
- Records review_notes explaining changes
- Sets reviewed_by + reviewed_at
- Status remains `pending_approval` (awaiting final approval)
- Creates audit log: "detention_reviewed" with old vs new amounts
- Does NOT change final amounts yet (manager can keep iterating)

#### `approve_detention`
- Manager finalizes review
- Status → `approved`
- Copies reviewed amounts to final billable_minutes + billable_amount
- Sets approved_by + approved_at
- Creates audit log: "detention_approved"
- Creates manifest event: "detention_approved"
- Ready for invoicing pipeline
- **Cannot be reversed** (moved to approved status)

#### `reject_detention`
- Manager rejects approval
- Status → `disputed` (re-opens for dispatcher)
- Records dispute_notes with manager's rejection reason
- Sets disputed_by + disputed_at
- Creates audit log: "detention_approval_rejected"
- Returns to dispatcher with feedback

---

## Manager Approval Dashboard

**Location:** `pages/DetentionApprovals.jsx`  
**Route:** `/detention-approvals`

**Component:** `DetentionApprovalQueue.jsx`

### Features

**Pending Queue:**
- Lists all pending_approval DetentionRecords
- Shows count of pending items
- Refreshes every 30 seconds

**Card Display (Per Detention):**
```
Stop X: Facility Name  [pending_approval badge]
Load ID | Arrived timestamp

Total Wait: 210 min  |  Billable (calc): 120 min  |  Amount: $100.00
```

**Interactive Actions:**

1. **View Details** button
   - Expands to show: free wait period, rate/hour, detention times
   - Shows previous review notes if any

2. **Edit & Review** button
   - Opens edit mode
   - Editable field: Billable Minutes (with live recalculation)
   - Textarea: Review Notes (e.g., "Adjusted from 120 to 90 min due to late arrival window")
   - Shows new billable amount in real-time
   - "Save & Continue" button submits review
   - Keeps status as pending_approval (allows further edits)

3. **Approve** button
   - Finalizes review with current billable amounts
   - Sets approved_by + approved_at
   - Status → approved
   - Alert confirms approval

4. **Reject** button
   - Prompts for rejection reason
   - Status → disputed
   - Sends back to dispatcher with manager feedback
   - Alert confirms rejection

### UI States

**Pending for Review:**
- Amber border, card styled for attention
- "Edit & Review" + "Approve" + "Reject" buttons visible

**After Reviewing (but not approved):**
- Shows review notes from manager
- Still allows further edits or approval

**Approved:**
- Green checkmark badge
- Status shows "Approved for Billing"
- No further actions available

---

## Integration with DetentionStopCard (Dispatcher View)

**Location:** `components/detention/DetentionStopCard.jsx`

### Updated Button Flow

**Resolved Status (Previously "Approve" button):**
- Changed to **"Submit for Approval"** button
- Calls `detentionApprovalWorkflow` action: `submit_for_approval`
- Moves to pending_approval status
- Dispatcher confirms submission

**Pending Approval Status:**
- Shows status badge: "⏳ Pending Manager Review"
- No action buttons (awaits manager decision)

**Approved Status:**
- Shows status badge: "✓ Approved for Billing"
- No action buttons (ready for invoicing)

**Disputed Status (Rejected by Manager):**
- Shows as disputed
- Dispatcher can re-review with manager feedback and resubmit

---

## Audit & Manifest Logging

### Audit Log Actions

**detention_submitted_for_approval**
```
user_id: dispatcher_id
user_role: dispatcher
action_details: "Detention submitted for manager approval: 120 min @ $100.00"
result: success
```

**detention_reviewed**
```
user_id: manager_id
user_role: manager
action_details: "Detention reviewed: Original 120min → 90min. Notes: Adjusted for late facility window"
result: success
```

**detention_approved**
```
user_id: manager_id
user_role: manager
action_details: "Detention approved for billing: 90 min @ $75.00"
result: success
```

**detention_approval_rejected**
```
user_id: manager_id
user_role: manager
action_details: "Detention approval rejected: Calculation error - free period was 180 min not 120 min"
result: success
```

### Manifest Events

**detention_submitted_for_approval**
- Event: Load moves to approval queue
- Performed by: dispatcher
- Timestamp: submission time

**detention_approved**
- Event: Manager approved detention for billing
- Performed by: manager
- Shows final billable amount

**detention_disputed** (if rejected)
- Event: Manager rejected, back to dispatcher
- Performed by: manager
- Reason included

---

## Workflow Example

### Scenario: Driver waits 4 hours at pickup, billing looks wrong

**Step 1: Dispatcher Reviews (LoadDetail)**
- Detention ended, status = resolved
- Shows: 240 min total wait, 120 billable min, $100 charge
- Dispatcher notices this seems high (facility issue)
- Clicks "Submit for Approval"
- Status → pending_approval

**Step 2: Manager Reviews (DetentionApprovals)**
- Sees detention in queue
- Clicks "Show Details" → sees 240 min wait, 4-hour free period should apply
- Clicks "Edit & Review"
- Reduces billable_minutes from 120 to 0 (within free wait)
- Adds note: "Driver arrived early in window, no billable detention"
- Clicks "Save & Continue"
- Status stays pending_approval, shows new amount ($0)

**Step 3: Manager Approves**
- Reviews note one more time
- Clicks "Approve"
- Status → approved
- Audit logged: "Detention approved for billing: 0 min @ $0.00"
- Dispatcher notified
- Ready for invoicing (won't add charge to invoice)

---

## Files Created/Modified

### New Files
1. `functions/detentionApprovalWorkflow.js` - Backend approval workflow
2. `components/detention/DetentionApprovalQueue.jsx` - Manager approval dashboard
3. `pages/DetentionApprovals.jsx` - Approval dashboard page
4. `docs/DETENTION_APPROVAL_WORKFLOW.md` - This file

### Modified Files
1. `entities/DetentionRecord.json` - Added status values + new fields
2. `components/detention/DetentionStopCard.jsx` - Changed "Approve" to "Submit for Approval"
3. `App.jsx` - Added route for `/detention-approvals`

---

## Phase 2.3+ Integration Points

**Invoicing Pipeline:**
- When DetentionRecord.status = "approved"
- Invoice generator reads approved amount
- Adds line item: "Stop X Detention: ${approved_amount}"

**Payroll/Settlement:**
- Approved detention records linked to driver payment
- Can be added as deduction or pass-through

**Analytics:**
- Dashboard shows approval rate, avg adjustment %
- Flags frequently rejected detention sources

---

## Conclusion

The detention approval workflow adds a crucial control gate before detention charges hit customer invoices. Managers can catch calculation errors, verify legitimate facility delays, and ensure only valid detention charges move forward.

Status transitions:
- **Dispatcher path:** Submit for Approval
- **Manager path:** Review → Edit → Approve OR Reject
- **Final:** approved → invoicing OR disputed → back to dispatcher

---

**Sign-Off:** Detention Approval Workflow Complete 2026-06-21 UTC