import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const files = {
  app: "src/App.jsx",
  clientPortal: "src/pages/client/ClientPortal.jsx",
  clientShipments: "src/components/client/ClientShipments.jsx",
  taxCenter: "src/pages/TaxCenter.jsx",
  taxGenerator: "src/components/admin/TaxDocumentGenerator.jsx",
  tax1099: "src/lib/tax1099.js",
  settlementPolicy: "src/lib/settlementPolicy.js",
  ocr: "src/components/driver/DocumentOCRProcessor.jsx",
  agentChat: "src/components/agent/AgentChat.jsx",
};

const content = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, fs.readFileSync(path, "utf8")]));

const customerPortalChecks = [
  "Shipments & Quotes",
  "Tracking",
  "Documents",
  "Invoices",
  "Messages",
  "Support",
];
for (const check of customerPortalChecks) assert(content.clientPortal.includes(check), `Customer portal missing ${check}`);
assert(content.app.includes('/client/*'), "Unified /client customer portal route missing.");
assert(content.app.includes('/customer/*'), "Unified /customer customer portal alias missing.");
assert(content.app.includes('/broker/*') && content.app.includes('Navigate to="/customer"'), "Broker route must redirect to unified customer portal.");
assert(content.clientShipments.includes("New Request") && content.clientShipments.includes("Pending Quotes") && content.clientShipments.includes("Completed") && content.clientShipments.includes("Cancelled"), "Shipments & Quotes combined workflow incomplete.");

const taxChecks = [
  "1099-NEC only",
  "Box 1",
  "Box 4",
  "No fuel",
  "sent_to_driver",
];
for (const check of taxChecks) assert(content.taxCenter.includes(check) || content.taxGenerator.includes(check), `Tax Center missing ${check}`);
assert(content.tax1099.includes("SUM(initial_quote_price + detention_pay)") || content.tax1099.includes("initial_quote_price + detention_pay"), "1099 Box 1 gross formula missing.");
assert(content.tax1099.includes("box_4_federal_income_tax_withheld") && content.tax1099.includes("FEDERAL_WITHHOLDING_BOX_4 = 0"), "1099 Box 4 $0 rule missing.");
assert(!content.taxGenerator.includes('SelectItem value="w2"'), "Tax generator must not offer W2 for current MVP.");

const settlementChecks = [
  "gross_load_revenue",
  "dispatch_company_fee",
  "factoring_fee",
  "fuel_advance",
  "toll_advance",
  "escrow_hold",
  "approved_deductions",
  "final_driver_net_pay",
  "hasten_net_revenue",
  "DEDUCTION_APPROVAL_RULE",
];
for (const check of settlementChecks) assert(content.settlementPolicy.includes(check), `Settlement policy missing ${check}`);

const documentChecks = ["LoadDocument.create", "processDocumentOCR", "ocr_extracted_data", "ocr_mismatches", "verified"];
for (const check of documentChecks) assert(content.ocr.includes(check), `Document intelligence missing ${check}`);

const aiChecks = [
  "Which loads risk late delivery today?",
  "Which drivers are available near Dallas?",
  "Which compliance documents expire this week?",
  "Which customers have unpaid invoices?",
  "Which loads are missing POD?",
  "Which settlements are ready for approval?",
  "Which drivers have high detention risk?",
  "Which invoices should be factored?",
];
for (const check of aiChecks) assert(content.agentChat.includes(check), `AI Copilot missing prompt: ${check}`);

console.log("PASS customer finance AI objective verification");
console.log(JSON.stringify({
  checkedFiles: files,
  customerPortalChecks: customerPortalChecks.length,
  taxChecks: taxChecks.length,
  settlementChecks: settlementChecks.length,
  documentChecks: documentChecks.length,
  aiChecks: aiChecks.length,
}, null, 2));
