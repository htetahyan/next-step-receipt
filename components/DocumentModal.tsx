'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { getDocuments, deleteDocument } from '@/app/actions/documents';
import { toast } from 'sonner';
import DocumentUploadZone from './DocumentUploadZone';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  serviceId?: string;
  customerName: string;
}

export default function DocumentModal({ isOpen, onClose, customerId, serviceId, customerName }: DocumentModalProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    const res = await getDocuments(customerId, serviceId);
    if (!res.error && res.documents) {
      setDocuments(res.documents);
    }
    setIsLoading(false);
  }, [customerId, serviceId]);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, fetchDocuments]);

  if (!isOpen) return null;

  const handleDelete = async (id: string, fileKey: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    setIsDeleting(id);
    const res = await deleteDocument(id, fileKey);
    if (!res.error) {
      setDocuments((docs) => docs.filter((d) => d.id !== id));
      toast.success('Document deleted');
    } else {
      toast.error(res.error);
    }
    setIsDeleting(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container max-w-2xl max-h-[90vh] scale-in-center" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between flex-shrink-0 bg-[var(--sidebar-bg)]">
          <div>
            <h3 className="text-xl font-serif text-[var(--foreground)] flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#D97757]" />
              Documents Viewer
            </h3>
            <p className="text-sm opacity-60 mt-1">Files attached to {customerName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--card-border)] rounded-full transition-colors">
            <X className="h-6 w-6 opacity-50" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          <DocumentUploadZone customerId={customerId} serviceId={serviceId} onUploadSuccess={fetchDocuments} />

          {/* List Section */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Stored Documents</h4>
            {isLoading ? (
              <div className="py-8 flex justify-center opacity-50">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 opacity-60 bg-[var(--sidebar-bg)] rounded-xl border border-dashed border-[var(--card-border)]">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const url = doc.file_url || doc.fileUrl;
                  const key = doc.file_key || doc.fileKey;
                  const createdAt = doc.created_at || doc.createdAt;
                  return (
                    <div key={doc.id} className="card-anthropic flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[var(--sidebar-bg)] transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[var(--sidebar-bg)] rounded-lg shrink-0">
                          <FileText className="h-5 w-5 opacity-50" />
                        </div>
                        <div>
                          <p className="font-semibold">{doc.title}</p>
                          <p className="text-xs opacity-60 mt-0.5">
                            Added {createdAt ? new Date(createdAt).toLocaleDateString() : 'Recently'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold opacity-80 hover:bg-[var(--card-border)] transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" /> View
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id, key)}
                          disabled={isDeleting === doc.id}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors opacity-70 hover:opacity-100"
                          title="Delete Document"
                        >
                          {isDeleting === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.3); border-radius: 20px; }
      `}</style>
    </div>
  );
}
