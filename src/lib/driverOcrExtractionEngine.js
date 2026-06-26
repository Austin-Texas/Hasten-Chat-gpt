export const DRIVER_OCR_DOCUMENT_TYPES = ["POD", "BOL", "CDL", "Medical", "Receipt", "Scale Ticket"];

function textValue(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function matchOne(text, patterns = []) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return textValue(match[1]);
  }
  return "";
}

function detectSignature(text) {
  const normalized = text.toLowerCase();
  return normalized.includes("signature") || normalized.includes("signed by") || normalized.includes("received by") || normalized.includes("driver sign");
}

export function extractDriverDocumentFields(rawText = "", docType = "POD") {
  const text = textValue(rawText);
  const normalizedType = String(docType || "POD").toLowerCase();
  const common = {
    load_number: matchOne(text, [/load\s*(?:#|number|no\.)\s*[:\-]?\s*([A-Z0-9\-]+)/i, /shipment\s*(?:#|number|no\.)\s*[:\-]?\s*([A-Z0-9\-]+)/i]),
    bol_number: matchOne(text, [/bol\s*(?:#|number|no\.)\s*[:\-]?\s*([A-Z0-9\-]+)/i, /bill\s*of\s*lading\s*(?:#|number)?\s*[:\-]?\s*([A-Z0-9\-]+)/i]),
    broker_name: matchOne(text, [/broker\s*[:\-]?\s*([A-Za-z0-9 &.,'-]+)/i, /carrier\s*broker\s*[:\-]?\s*([A-Za-z0-9 &.,'-]+)/i]),
    pickup_date: matchOne(text, [/pickup\s*date\s*[:\-]?\s*([0-9/\-]+)/i, /ship\s*date\s*[:\-]?\s*([0-9/\-]+)/i]),
    delivery_date: matchOne(text, [/delivery\s*date\s*[:\-]?\s*([0-9/\-]+)/i, /delivered\s*[:\-]?\s*([0-9/\-]+)/i]),
    signature_detected: detectSignature(text),
  };

  if (normalizedType.includes("cdl")) {
    return {
      doc_type: "CDL",
      cdl_number: matchOne(text, [/cdl\s*(?:#|number|no\.)\s*[:\-]?\s*([A-Z0-9\-]+)/i, /license\s*(?:#|number|no\.)\s*[:\-]?\s*([A-Z0-9\-]+)/i]),
      state: matchOne(text, [/state\s*[:\-]?\s*([A-Z]{2})/i]),
      class: matchOne(text, [/class\s*[:\-]?\s*([ABC])/i]),
      expiration_date: matchOne(text, [/exp(?:iration)?\s*(?:date)?\s*[:\-]?\s*([0-9/\-]+)/i]),
      signature_detected: common.signature_detected,
    };
  }

  if (normalizedType.includes("medical")) {
    return {
      doc_type: "Medical",
      certificate_number: matchOne(text, [/certificate\s*(?:#|number|no\.)\s*[:\-]?\s*([A-Z0-9\-]+)/i, /medical\s*(?:#|number|no\.)\s*[:\-]?\s*([A-Z0-9\-]+)/i]),
      examiner_name: matchOne(text, [/examiner\s*[:\-]?\s*([A-Za-z .'-]+)/i, /medical\s*examiner\s*[:\-]?\s*([A-Za-z .'-]+)/i]),
      expiration_date: matchOne(text, [/exp(?:iration)?\s*(?:date)?\s*[:\-]?\s*([0-9/\-]+)/i]),
      restrictions: matchOne(text, [/restrictions\s*[:\-]?\s*([A-Za-z0-9 ,.'-]+)/i]),
    };
  }

  if (normalizedType.includes("receipt")) {
    return {
      doc_type: "Receipt",
      amount: matchOne(text, [/total\s*[:\-]?\s*\$?([0-9,.]+)/i, /amount\s*[:\-]?\s*\$?([0-9,.]+)/i]),
      vendor: matchOne(text, [/vendor\s*[:\-]?\s*([A-Za-z0-9 &.,'-]+)/i, /merchant\s*[:\-]?\s*([A-Za-z0-9 &.,'-]+)/i]),
      date: matchOne(text, [/date\s*[:\-]?\s*([0-9/\-]+)/i]),
    };
  }

  if (normalizedType.includes("bol")) {
    return { doc_type: "BOL", ...common };
  }

  return { doc_type: "POD", ...common };
}

export function scoreOcrExtraction(fields = {}) {
  const values = Object.values(fields).filter((value) => value !== "" && value !== false && value !== null && value !== undefined);
  const total = Math.max(1, Object.keys(fields).length);
  return Math.round((values.length / total) * 100) / 100;
}

export function buildOcrReviewResult(rawText = "", docType = "POD") {
  const fields = extractDriverDocumentFields(rawText, docType);
  const confidence = scoreOcrExtraction(fields);
  const missing_fields = Object.entries(fields)
    .filter(([, value]) => value === "" || value === false || value === null || value === undefined)
    .map(([key]) => key);
  return {
    doc_type: fields.doc_type || docType,
    extracted_fields: fields,
    confidence_score: confidence,
    missing_fields,
    review_status: confidence >= 0.75 ? "approved" : "needs_review",
  };
}
