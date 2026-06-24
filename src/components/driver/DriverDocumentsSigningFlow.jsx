import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import DocumentSigningModal from '@/components/documents/DocumentSigningModal';
import StatusBadge from '@/components/hasten/StatusBadge';

const REQUIRED_DOCUMENTS = [
  { type: 'w9', label: 'IRS Form W-9' },
  { type: 'ach_authorization', label: 'ACH Authorization' },
  { type: 'contractor_agreement', label: 'Contractor Agreement' }
];

export default function DriverDocumentsSigningFlow({ contractor }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [contractor?.id]);

  const fetchDocuments = async () => {
    try {
      const docs = await base44.asServiceRole.entities.ContractorDocument.filter(
        { contractor_profile_id: contractor?.id },
        '-created_date',
        20
      );
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDocStatus = (docType) => {
    const doc = documents.find(d => d.document_type === docType);
    if (!doc) return { status: 'missing', label: 'Not uploaded' };
    if (doc.signature_status === 'signed') return { status: 'signed', label: 'Signed' };
    if (doc.signature_status === 'pending') return { status: 'pending', label: 'Pending signature' };
    return { status: 'uploaded', label: 'Uploaded' };
  };

  const handleDocumentSign = (doc) => {
    setSelectedDoc(doc);
    setShowModal(true);
  };

  const handleSigned = () => {
    setShowModal(false);
    setSelectedDoc(null);
    fetchDocuments();
  };

  const signedCount = documents.filter(d => d.signature_status === 'signed').length;
  const totalRequired = REQUIRED_DOCUMENTS.length;

  if (loading) {
    return <div className="skeleton h-64 rounded-xl" />;
  }

  return (
    <div className="glass-card rounded-xl p-5 border border-white/5 space-y-5">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange-400" />
          Required Documents
        </h3>
        <p className="text-slate-500 text-xs mt-1">
          Sign {totalRequired} documents to complete onboarding
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Progress</span>
          <span className="text-white font-semibold">{signedCount}/{totalRequired} Signed</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
            style={{ width: `${(signedCount / totalRequired) * 100}%` }}
          />
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {REQUIRED_DOCUMENTS.map(docDef => {
          const doc = documents.find(d => d.document_type === docDef.type);
          const status = getDocStatus(docDef.type);

          return (
            <div
              key={docDef.type}
              className="flex items-center justify-between p-3 rounded-lg border border-white/10 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                <div>
                  <div className="text-white text-sm font-medium">{docDef.label}</div>
                  <div className="text-slate-600 text-xs">
                    {status.status === 'signed' && doc?.signed_at && (
                      `Signed on ${new Date(doc.signed_at).toLocaleDateString()}`
                    )}
                    {status.status === 'pending' && 'Ready to sign'}
                    {status.status === 'missing' && 'Waiting for upload'}
                    {status.status === 'uploaded' && 'Uploaded, awaiting signature'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {status.status === 'signed' && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-green-400 text-xs font-semibold">Signed</span>
                  </>
                )}
                {status.status === 'pending' && doc && (
                  <>
                    <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <button
                      onClick={() => handleDocumentSign(doc)}
                      className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors"
                    >
                      Sign Now
                    </button>
                  </>
                )}
                {status.status === 'missing' && (
                  <>
                    <AlertCircle className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    <span className="text-slate-600 text-xs">Not uploaded</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Banner */}
      {signedCount === totalRequired && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-green-300 text-xs">
            <div className="font-semibold mb-0.5">All Documents Signed!</div>
            <div>Your contractor profile is now complete. You can accept loads.</div>
          </div>
        </div>
      )}

      {/* Signing Modal */}
      {showModal && selectedDoc && (
        <DocumentSigningModal
          document={selectedDoc}
          contractor={contractor}
          onSigned={handleSigned}
          onCancel={() => {
            setShowModal(false);
            setSelectedDoc(null);
          }}
        />
      )}
    </div>
  );
}