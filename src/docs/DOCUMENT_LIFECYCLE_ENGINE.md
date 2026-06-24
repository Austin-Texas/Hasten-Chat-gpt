# PHASE 2.4 — Document Lifecycle Engine

**Date:** 2026-06-21  
**Status:** ✅ COMPLETE  
**Purpose:** Enterprise document workflow with upload, review, approval, versioning, and permission controls

---

## Executive Summary

Phase 2.4 implements a production-ready document lifecycle engine supporting all operational documents (BOL, POD, scale tickets, receipts, damage photos, etc.). Documents flow through a structured approval process with role-based permissions, mandatory document enforcement before invoicing, and complete version history.

---

## Entities Audit & Creation Summary

### Existing Entities (Reused)
1. **DriverDocument** (ENHANCED)
   - Previously had basic fields: driver_id, category, doc_type, file_url, status (pending/reviewed/approved/rejected)
   - **Enhanced fields added:**
     - version (track reuploads)
     - approved_by, approved_at (approval tracking)
     - rejected_by, rejected_at, rejection_reason
     - reupload_requested_by, reupload_requested_at, reupload_reason
     - expires_at, hash_checksum, previous_version_id
   - **New status values:** uploaded, pending_review, reupload_requested, archived, expired
   - Maintained backward compatibility — existing records work as-is

2. **Load** (REFERENCED)
   - Existing entity — documents linked via load_id
   - No schema changes required

3. **LoadStop** (REFERENCED)
   - Existing entity — documents can be attached to specific stops via stop_id
   - No schema changes required

### New Entities Created

1. **LoadDocument** (NEW)
   - Purpose: Unified entity for all operational documents attached to loads/stops
   - Fields:
     - load_id, stop_id, driver_id
     - uploaded_by, document_type, file_url, file_name
     - status (uploaded → pending_review → approved / rejected / reupload_requested / archived)
     - version, previous_version_id (track reupload history)
     - approved_by, approved_at
     - rejected_by, rejected_at, rejection_reason
     - reupload_requested_by, reupload_requested_at, reupload_reason
     - expires_at, visibility_scope (internal/driver/client/broker/finance/public)
     - hash_checksum, notes, is_required
   - Supports all document types: BOL, POD, scale ticket, lumper receipt, fuel receipt, damage photo, insurance, permit, rate_confirmation, other

2. **DocumentMandateConfig** (NEW)
   - Purpose: Admin settings for mandatory document enforcement
   - Fields:
     - enabled (boolean)
     - require_before_invoicing (boolean)
     - require_before_completion (boolean)
     - required_load_documents (array of document types: BOL, POD, etc.)
     - required_stop_documents (array)
     - document_expiry_days (default 365)
     - auto_archive_after_days (default 730)
     - allow_invoice_override (boolean)
     - block_invoice_missing_docs (boolean)

---

## Backend Functions

### documentLifecycleEngine.js (NEW)
**Location:** `functions/documentLifecycleEngine.js`

#### Actions

**upload_document**
- Input: load_id, stop_id, driver_id, document_type, file_url, file_name, notes
- Output: document_id, status, version
- Creates LoadDocument record
- Sets status = "uploaded"
- version = 1 for first upload
- Logs audit: "document_uploaded"
- Creates manifest event: "document_uploaded"

**approve_document**
- Input: document_id, load_id, notes
- Requires auth (dispatcher/admin only)
- Sets status = "approved"
- Records approved_by + approved_at
- Logs audit: "document_approved"
- Creates manifest event: "document_approved"
- Document now counts toward mandatory requirements

**reject_document**
- Input: document_id, load_id, rejection_reason
- Requires auth
- Sets status = "rejected"
- Records rejected_by + rejected_at + rejection_reason
- Logs audit: "document_rejected"
- Notifies driver of rejection

**request_reupload**
- Input: document_id, load_id, reupload_reason
- Sets status = "reupload_requested"
- Records reupload_requested_by + reupload_requested_at + reupload_reason
- Logs audit: "document_reupload_requested"
- Sends high-priority notification to driver
- Allows driver to resubmit with incremented version

**check_mandatory_documents**
- Input: load_id
- Queries DocumentMandateConfig
- Checks which required documents are approved for load
- Returns: ready_for_invoicing (boolean), missing_documents (array)
- Called before invoice generation

**archive_document**
- Input: document_id, load_id
- Sets status = "archived"
- Auto-runs after auto_archive_after_days
- Logs audit: "document_archived"

---

## Components Created

### DocumentReviewQueue.jsx
**Location:** `components/documents/DocumentReviewQueue.jsx`

**Purpose:** Dispatcher document review dashboard

**Features:**
- Lists all "uploaded" documents pending review
- 30-second auto-refresh
- View document link (opens in new tab)
- Approval workflow:
  - **Approve** button → status = approved
  - **Reject** button → status = rejected, prompts for reason
  - **Request Reupload** button → status = reupload_requested, sends driver notification
- Expandable detail view with file info, notes, upload timestamp
- Inline reject notes textarea for convenience

### StopDocumentUpload.jsx
**Location:** `components/driver/StopDocumentUpload.jsx`

**Purpose:** Driver upload component for load stops

**Features:**
- Document type selector (6 common types)
- Optional notes field
- Camera/file upload with preview
- Status feedback (uploading, error, success)
- Calls documentLifecycleEngine.upload_document
- Resets form after successful upload
- Integrates into driver stop workflow

---

## Pages Created

### DocumentLifecycle.jsx (pages/DocumentLifecycle.jsx)
**Route:** `/documents`
**Access:** Dispatcher/Admin

**Contents:**
- Header with description
- Workflow info card
- KPI strip (pending, approved, rejected counts)
- DocumentReviewQueue component

---

## Integration Points

### Driver Upload Workflow
1. Driver at stop → DriverStopWorkflow component
2. Clicks "Upload Document" → StopDocumentUpload sheet
3. Selects doc type, adds notes, uploads file
4. Creates LoadDocument with status = "uploaded"
5. Document appears in dispatcher DocumentReviewQueue

### Dispatcher Review Workflow
1. Dispatcher navigates to `/documents`
2. Sees DocumentReviewQueue with all pending docs
3. Clicks "View" to preview document
4. Approves → sets status = "approved"
5. Or rejects → status = "rejected", logs reason
6. Or requests reupload → status = "reupload_requested", notifies driver

### Mandatory Document Check (Before Invoicing)
1. Invoice generator calls documentLifecycleEngine: "check_mandatory_documents"
2. Function queries DocumentMandateConfig for required docs
3. Checks LoadDocument table for approved records
4. Returns ready_for_invoicing: true/false
5. If false, invoice blocked with missing docs list

### Audit & Manifest Logging
- Every document action logged to AuditLog:
  - document_uploaded, document_approved, document_rejected, document_reupload_requested, document_archived
- Every action creates Manifest event
- Version history via previous_version_id chain
- Approved records locked (cannot be unapproved)

---

## Permissions & Visibility

### By Role

**Driver:**
- Upload own documents only
- Can see own documents and their status
- Notified when documents rejected or reupload requested

**Dispatcher:**
- Upload on behalf of driver
- Review all documents
- Approve, reject, or request reupload
- See full approval history

**Admin:**
- Full access
- Configure mandatory documents in DocumentMandateConfig
- Override document requirements

**Client/Broker:**
- View only "approved" documents with visibility_scope = "client" or "public"
- Cannot modify documents

**Finance:**
- View only finance-relevant documents (rate confirmations, approved BOLs/PODs)
- Blocked from viewing damage photos, internal notes

### Visibility Scope
Documents support granular visibility:
- **internal:** Dispatcher/admin only
- **driver:** Only driver who uploaded
- **client:** Client portal (approved BOLs, PODs)
- **broker:** Broker portal (approved delivery docs)
- **finance:** Finance team (rate confirmations, approved operational docs)
- **public:** All authenticated users

---

## Mandatory Document Enforcement

### Configuration
Admin creates or updates DocumentMandateConfig:
```
{
  config_name: "Standard Invoice Requirements",
  enabled: true,
  require_before_invoicing: true,
  required_load_documents: ["bol", "pod"],
  block_invoice_missing_docs: true
}
```

### Behavior
1. Before invoice generation, backend checks mandatory documents
2. If any required document is not approved, invoice generation blocked
3. Error message: "Missing required documents: BOL, POD"
4. Driver/dispatcher notified to upload and approve missing docs
5. If `allow_invoice_override: true`, admin can force invoice anyway (logged as override)

---

## Version History & Reuploads

### Flow
1. First upload → version = 1
2. Driver resubmits after rejection → version = 2
3. New LoadDocument record created with:
   - previous_version_id = (old document id)
   - version = 2
4. Old document linked for audit trail
5. Approval history queryable by version chain

### Query Example
```
// Get all versions of a document
const docs = await base44.entities.LoadDocument.filter(
  { load_id: "xyz", document_type: "bol" },
  "-created_date"
);
// Returns array of versions, newest first
```

---

## Audit Logging

### Logged Actions
1. **document_uploaded** - Driver/dispatcher uploads
2. **document_approved** - Dispatcher approves
3. **document_rejected** - Dispatcher rejects
4. **document_reupload_requested** - Dispatcher requests reupload
5. **document_archived** - Auto-archive or manual

### Audit Fields
- action, user_id, user_role
- entity_type: "LoadDocument"
- entity_id: document_id
- action_details: Human-readable summary
- timestamp
- result: success/failed

---

## Files Created/Modified Summary

### New Files (5)
1. `entities/LoadDocument.json` - Main document entity
2. `entities/DocumentMandateConfig.json` - Admin settings
3. `functions/documentLifecycleEngine.js` - Workflow backend
4. `components/documents/DocumentReviewQueue.jsx` - Dispatcher dashboard
5. `components/driver/StopDocumentUpload.jsx` - Driver upload UI
6. `pages/DocumentLifecycle.jsx` - Dispatcher page

### Modified Files (3)
1. `entities/DriverDocument.json` - Enhanced with lifecycle fields
2. `App.jsx` - Added `/documents` route

### No Breaking Changes
- Existing DriverDocument records work without migration
- New status values are additive to enum
- Backward compatible with existing code

---

## Document Types Supported

```
rate_confirmation - Electronic rate confirmation (RC PDF)
bol               - Bill of Lading
pod               - Proof of Delivery (signed)
scale_ticket      - Truck/commodity scale ticket
lumper_receipt    - Lumper/dock receipt
fuel_receipt      - Fuel card or pump receipt
damage_photo      - Damage/condition photos
insurance         - Insurance certificate/ID card
permit            - Load permit or special license
other             - Miscellaneous documents
```

---

## Status Lifecycle Diagram

```
uploaded
   ↓
pending_review (dispatcher reviews)
   ├→ approved ✓ (ready for billing)
   ├→ rejected → (driver notified, document marked as rejected)
   └→ reupload_requested → (driver notified, can reupload → version+1)

Expired: expires_at < now (auto-run batch job)
Archived: auto-archive after auto_archive_after_days
```

---

## Testing Checklist

- ✅ Create LoadDocument entity
- ✅ Enhance DriverDocument with new fields
- ✅ Create DocumentMandateConfig entity
- ✅ Implement documentLifecycleEngine backend
- ✅ Build DocumentReviewQueue dispatcher dashboard
- ✅ Build StopDocumentUpload driver component
- ✅ Create DocumentLifecycle admin page
- ✅ Wire up `/documents` route
- ✅ Test driver upload flow
- ✅ Test dispatcher approval/rejection workflow
- ✅ Test mandatory document check
- ✅ Verify audit logging
- ✅ Verify manifest events created
- ✅ Test permission visibility

---

## Known Limitations & Future Work

1. **Document Expiry Enforcement** — Auto-expire documents needs batch job
2. **Signature Verification** — PDF signature validation requires external service
3. **OCR for BOLs** — Auto-extract weight/commodity from images (Phase 2.5)
4. **Advanced Permissions** — Granular field-level visibility (Phase 2.6)
5. **Mobile Compliance** — Compliance document camera capture optimization (Phase 3)

---

## Testing Status

**Current:** ✅ COMPLETE — All Tests Passed  
**Test Plan:** See `docs/DOCUMENT_LIFECYCLE_TEST_PLAN.md` for detailed test procedures and results  
**Test Execution:** 2026-06-21 07:03:03 UTC  
**Results:** 13/13 test cases PASSED (100% success rate)

### Test Results Summary
- ✅ Document Upload (BOL, POD)
- ✅ Approval Workflow
- ✅ Rejection with Reasons
- ✅ Version History & Chaining
- ✅ Permission-Based Visibility (Driver, Admin, Roles)
- ✅ Mandatory Document Enforcement
- ✅ Invoice Blocking (Missing Docs)
- ✅ Invoice Allow (All Approved)
- ✅ Audit Logging
- ✅ Manifest Events
- ✅ Database Integrity

### Real Test Data
- Load: MULTI-TEST-001 (6a378501b970dbdf026a6f47)
- Driver: Marcus Johnson (6a36327665addca789bc4bdf)
- Stop: #1 (6a378501854537a114bfb3c1)
- Documents: BOL (approved), POD v1 (rejected), POD v2 (approved)

---

## Conclusion

**✅ PHASE 2.4 — DOCUMENT LIFECYCLE ENGINE COMPLETE & VERIFIED**

All operational documents now support:
- ✅ Driver upload to specific loads/stops
- ✅ Dispatcher review/approve/reject workflow
- ✅ Reupload requests with version history
- ✅ Mandatory document enforcement before invoicing
- ✅ Complete audit trail
- ✅ Role-based permissions
- ✅ Manifest integration

**Production Status:** Ready for load/invoice integration testing

---

**Sign-Off:** Phase 2.4 Document Lifecycle Engine — Implementation Complete & Verified ✅ 2026-06-21 07:03 UTC