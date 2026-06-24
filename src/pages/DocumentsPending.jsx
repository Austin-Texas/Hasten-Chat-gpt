import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Signature, AlertCircle, CheckCircle } from 'lucide-react';
import DocumentSigningModal from '@/components/documents/DocumentSigningModal';

export default function DocumentsPending() {
  const [pendingDocs, setPendingDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const fetchPendingDocuments = async () => {
    try {
      // Fetch contractor documents with pending signature status AND requires signature
      const docs = await base44.asServiceRole.entities.ContractorDocument.filter(
        { requires_signature: true, signature_status: 'pending' },
        '-created_date',
        100
      );
      console.log('Pending documents fetched:', docs.length);

      // If no pending with both filters, try just signature_status
      let docsToUse = docs;
      if (docs.length === 0) {
        const fallback = await base44.asServiceRole.entities.ContractorDocument.filter(
          { signature_status: 'pending' },
          '-created_date',
          100
        );
        console.log('Fallback pending documents:', fallback.length);
        docsToUse = fallback;
      }

      // Enrich with contractor info
      const enrichedDocs = await Promise.all(
        docsToUse.map(async (doc) => {
          let contractorName = 'Unknown';
          try {
            const contractors = await base44.asServiceRole.entities.ContractorProfile.filter(
              { id: doc.contractor_profile_id },
              '-created_date',
              1
            );
            if (contractors[0]) {
              contractorName = `${contractors[0].first_name} ${contractors[0].last_name}`;
            }
          } catch (err) {
            console.error('Error fetching contractor:', err);
          }

          return {
            ...doc,
            contractorName
          };
        })
      );

      console.log('Enriched documents:', enrichedDocs.length);
      setPendingDocs(enrichedDocs);
    } catch (err) {
      console.error('Error fetching pending documents:', err);
      setPendingDocs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSignDocument = (doc) => {
    setSelectedDoc(doc);
    setShowSignModal(true);
  };

  const handleSignatureSaved = async () => {
    setShowSignModal(false);
    setSelectedDoc(null);
    await fetchPendingDocuments();
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-slide-up">
        <div className="h-12" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-white font-heading font-bold text-2xl flex items-center gap-2">
          <Signature className="w-6 h-6 text-orange-400" />
          Pending Document Signatures
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {pendingDocs.length} document{pendingDocs.length !== 1 ? 's' : ''} awaiting signature
          {pendingDocs.length === 0 && ' (0 records in database)'}
        </p>
      </div>

      {/* Documents List */}
      {pendingDocs.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-xl border border-white/5">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">All signatures are up to date!</p>
          <p className="text-slate-500 text-xs mt-2">No documents with pending signatures found.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          {pendingDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-5 hover:bg-white/2 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <h3 className="text-white font-semibold">
                      {doc.document_type?.replace(/_/g, ' ').toUpperCase()}
                    </h3>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {doc.contractorName}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-medium">
                    <AlertCircle className="w-3 h-3" />
                    Pending
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                <span>{doc.file_name}</span>
                {doc.expiration_date && (
                  <span>Expires: {new Date(doc.expiration_date).toLocaleDateString()}</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSignDocument(doc)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors"
                >
                  <Signature className="w-4 h-4" />
                  Sign Document
                </button>
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    View PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signature Modal */}
      {showSignModal && selectedDoc && (
        <DocumentSigningModal
          document={selectedDoc}
          onClose={() => setShowSignModal(false)}
          onSignatureSaved={handleSignatureSaved}
        />
      )}
    </div>
  );
}