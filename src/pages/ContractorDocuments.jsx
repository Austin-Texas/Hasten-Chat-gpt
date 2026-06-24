import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Download, Eye, AlertCircle, CheckCircle } from 'lucide-react';

export default function ContractorDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      console.log('Fetching contractor documents...');
      const docs = await base44.asServiceRole.entities.ContractorDocument.list('-created_date', 500);
      console.log('Contractor documents fetched:', docs.length);

      // Enrich with contractor info
      const enrichedDocs = await Promise.all(
        docs.map(async (doc) => {
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

          return { ...doc, contractorName };
        })
      );

      console.log('Enriched documents:', enrichedDocs.length);
      setDocuments(enrichedDocs);
    } catch (err) {
      console.error('Error fetching contractor documents:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = documents.filter(doc => {
    if (filterStatus !== 'all' && doc.signature_status !== filterStatus) return false;
    if (filterType !== 'all' && doc.document_type !== filterType) return false;
    return true;
  });

  const docTypes = [...new Set(documents.map(d => d.document_type))];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
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
          <FileText className="w-6 h-6 text-orange-400" />
          Contractor Documents
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {filtered.length} of {documents.length} document{documents.length !== 1 ? 's' : ''}
          {documents.length === 0 && ' (0 records in database)'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Signature</option>
          <option value="signed">Signed</option>
          <option value="expired">Expired</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/40"
        >
          <option value="all">All Types</option>
          {docTypes.map(type => (
            <option key={type} value={type}>
              {type.replace(/_/g, ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Documents List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-xl border border-white/5">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">
            {documents.length === 0 ? 'No documents found in database' : 'No documents match current filters'}
          </p>
          {documents.length > 0 && (
            <p className="text-slate-500 text-xs mt-2">Try adjusting filters or reset selection.</p>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="p-5 hover:bg-white/2 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(doc.signature_status)}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">
                      {doc.document_type?.replace(/_/g, ' ').toUpperCase()}
                    </h3>
                    <p className="text-slate-400 text-sm">{doc.contractorName}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    doc.signature_status === 'signed'
                      ? 'bg-green-500/15 border border-green-500/25 text-green-400'
                      : doc.signature_status === 'pending'
                      ? 'bg-amber-500/15 border border-amber-500/25 text-amber-400'
                      : 'bg-slate-500/15 border border-slate-500/25 text-slate-400'
                  }`}>
                    {doc.signature_status?.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                <span>{doc.file_name}</span>
                {doc.signed_at && (
                  <span>Signed: {new Date(doc.signed_at).toLocaleDateString()}</span>
                )}
                {doc.expiration_date && (
                  <span>Expires: {new Date(doc.expiration_date).toLocaleDateString()}</span>
                )}
              </div>

              <div className="flex gap-2">
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </a>
                )}
                {doc.signature_image_url && (
                  <a
                    href={doc.signature_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Signature
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}