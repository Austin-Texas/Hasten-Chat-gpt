import { useState } from 'react';
import { FileText, AlertCircle, Loader2 } from 'lucide-react';
import SignatureCanvas from '@/components/driver/SignatureCanvas';

export default function DocumentSigningModal({ document, contractor, onSigned, onCancel }) {
  const [showSignature, setShowSignature] = useState(false);
  const [signing, setSigning] = useState(false);

  const getDocumentInfo = () => {
    const types = {
      w9: { label: 'IRS Form W-9', required: true },
      ach_authorization: { label: 'ACH Authorization Form', required: true },
      contractor_agreement: { label: 'Contractor Agreement', required: true },
      cdl: { label: 'Commercial Driver\'s License', required: true },
      medical_card: { label: 'DOT Medical Certificate', required: true },
      insurance_certificate: { label: 'Insurance Certificate', required: true },
      factoring_agreement: { label: 'Factoring Agreement', required: false }
    };
    return types[document.document_type] || { label: 'Document', required: false };
  };

  const handleSignatureSave = async (signatureData) => {
    setSigning(true);
    try {
      const res = await fetch('https://api.example.com/sign-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_profile_id: contractor.id,
          document_type: document.document_type,
          signature_image: signatureData,
          signed_at: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowSignature(false);
        onSigned?.();
      }
    } catch (err) {
      console.error('Signing error:', err);
      alert('Failed to save signature. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const docInfo = getDocumentInfo();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-96 overflow-y-auto">
        {showSignature ? (
          <SignatureCanvas
            documentType={document.document_type}
            onSave={handleSignatureSave}
            onCancel={() => setShowSignature(false)}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 p-6 border-b border-white/10">
              <FileText className="w-6 h-6 text-orange-400 flex-shrink-0" />
              <div>
                <h2 className="text-white font-semibold text-lg">{docInfo.label}</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {contractor.first_name} {contractor.last_name}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Document Preview Info */}
              <div className="p-4 rounded-lg bg-white/3 border border-white/10">
                <div className="text-sm text-slate-300 space-y-2">
                  {document.document_type === 'w9' && (
                    <>
                      <p><strong>IRS Form W-9</strong> — Request for Taxpayer Identification Number</p>
                      <p className="text-xs text-slate-500">
                        This form is required by the IRS to report contractor payments. You are authorizing HASTEN to use this information for tax reporting purposes.
                      </p>
                    </>
                  )}
                  {document.document_type === 'ach_authorization' && (
                    <>
                      <p><strong>ACH Authorization</strong> — Direct Deposit Authorization</p>
                      <p className="text-xs text-slate-500">
                        This form authorizes HASTEN to deposit settlement payments directly to your bank account.
                      </p>
                    </>
                  )}
                  {document.document_type === 'contractor_agreement' && (
                    <>
                      <p><strong>Independent Contractor Agreement</strong></p>
                      <p className="text-xs text-slate-500">
                        This agreement outlines the terms of your engagement with HASTEN, including payment terms, responsibilities, and compliance requirements.
                      </p>
                    </>
                  )}
                  {!['w9', 'ach_authorization', 'contractor_agreement'].includes(document.document_type) && (
                    <p className="text-xs text-slate-500">
                      Please review the document above before signing. Your signature confirms that you have read and agree to the terms.
                    </p>
                  )}
                </div>
              </div>

              {/* Alert */}
              <div className="flex gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-blue-300 text-xs">
                  <strong>Legally Binding:</strong> Your digital signature is legally binding and constitutes your acceptance of this document.
                </div>
              </div>

              {/* Signature Confirmation */}
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="text-amber-300 text-sm mb-2">
                  <strong>Sign Document</strong>
                </div>
                <p className="text-amber-200/70 text-xs mb-3">
                  Click "Sign Now" to capture your digital signature. You'll be prompted to sign on your device.
                </p>
                <button
                  onClick={() => setShowSignature(true)}
                  className="w-full px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors text-sm"
                >
                  Sign Now
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-6 border-t border-white/10 bg-white/2">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}

        {signing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
            <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
          </div>
        )}
      </div>
    </div>
  );
}