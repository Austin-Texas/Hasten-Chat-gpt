/**
 * syncDriverComplianceDoc — syncs a driver compliance document upload
 * to the ContractorProfile and ContractorDocument entities.
 *
 * Called from the driver app after a compliance doc (license, medical card,
 * insurance, etc.) is uploaded to the Driver entity.
 *
 * Payload: { driver_id, doc_type, file_url, file_name, expiration_date? }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

// Maps Driver entity doc_type keys → ContractorDocument document_type + ContractorProfile field
const DOC_MAPPING = {
  license_front:    { cdType: "cdl",                   profileField: "cdl_status" },
  license_back:     { cdType: "cdl",                   profileField: "cdl_status" },
  medical_card:     { cdType: "medical_card",           profileField: "medical_card_status" },
  insurance_doc:    { cdType: "insurance_certificate", profileField: "insurance_certificate_status" },
  registration_doc: { cdType: "other",                 profileField: null },
  tax_doc:          { cdType: "w9",                     profileField: "w9_status" },
  other_docs:       { cdType: "other",                 profileField: null },
};

// Maps doc_type → ContractorProfile expiry field
const EXPIRY_MAPPING = {
  license_front:    "cdl_expiration_date",
  license_back:     "cdl_expiration_date",
  medical_card:     "medical_card_expiration_date",
  insurance_doc:    "insurance_expiration_date",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This is called from the driver app (authenticated user), but uses service role
    // to read/update ContractorProfile which the driver may not own directly.
    const body = await req.json().catch(() => ({}));
    const { driver_id, doc_type, file_url, file_name, expiration_date } = body;

    if (!driver_id || !doc_type || !file_url) {
      return Response.json({ error: "Missing required fields: driver_id, doc_type, file_url" }, { status: 400 });
    }

    const mapping = DOC_MAPPING[doc_type];
    if (!mapping) {
      return Response.json({ skipped: true, reason: `No mapping for doc_type: ${doc_type}` });
    }

    // Find the linked ContractorProfile
    const contractorProfiles = await base44.asServiceRole.entities.ContractorProfile.filter(
      { driver_id },
      "-created_date",
      1
    ).catch(() => []);

    const contractorProfile = contractorProfiles[0] || null;

    if (!contractorProfile) {
      // No contractor profile linked yet — create ContractorDocument with driver_id only
      console.log(`[syncDriverComplianceDoc] No ContractorProfile found for driver ${driver_id}`);
    }

    // 1. Create ContractorDocument record
    if (contractorProfile) {
      await base44.asServiceRole.entities.ContractorDocument.create({
        contractor_profile_id: contractorProfile.id,
        driver_id,
        document_type: mapping.cdType,
        file_url,
        file_name: file_name || `${doc_type}.pdf`,
        uploaded_by: "driver",
        uploaded_at: new Date().toISOString(),
        verified: false,
        expiration_date: expiration_date || undefined,
        version: 1,
        requires_signature: false,
        signature_status: "pending",
      }).catch(e => console.error("[ContractorDocument create]", e.message));
    }

    // 2. Update ContractorProfile compliance status fields
    if (contractorProfile && mapping.profileField) {
      const updates = { [mapping.profileField]: "uploaded" };
      const now = new Date().toISOString();

      // Set uploaded_at timestamp for known fields
      if (doc_type === "tax_doc") updates.w9_uploaded_at = now;

      // Set expiration date if provided
      if (expiration_date && EXPIRY_MAPPING[doc_type]) {
        updates[EXPIRY_MAPPING[doc_type]] = expiration_date;
      }

      // For license docs, also set CDL number from Driver record if available
      if (doc_type === "license_front") {
        const driver = await base44.asServiceRole.entities.Driver.get(driver_id).catch(() => null);
        if (driver?.license_number) updates.cdl_number = driver.license_number;
      }

      await base44.asServiceRole.entities.ContractorProfile.update(contractorProfile.id, updates)
        .catch(e => console.error("[ContractorProfile update]", e.message));
    }

    // 3. Log timeline event
    await base44.asServiceRole.entities.TimelineEvent.create({
      entity_type: "Driver",
      entity_id: driver_id,
      event_type: "compliance_doc_synced",
      event_title: `Compliance Document Synced: ${doc_type}`,
      event_description: `Document synced to contractor profile for compliance tracking.`,
      event_timestamp: new Date().toISOString(),
      performed_by_role: "system",
      metadata: JSON.stringify({ doc_type, file_url, contractor_profile_id: contractorProfile?.id }),
    }).catch(() => {});

    return Response.json({
      success: true,
      synced: true,
      contractor_profile_id: contractorProfile?.id || null,
      document_type: mapping.cdType,
      profile_field_updated: mapping.profileField,
    });
  } catch (error) {
    console.error("[syncDriverComplianceDoc]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});