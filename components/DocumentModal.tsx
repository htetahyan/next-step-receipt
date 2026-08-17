'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Loader2, Trash2, Eye, Download, Image as ImageIcon } from 'lucide-react';
import { getDocuments, deleteDocument } from '@/app/actions/documents';
import { getCurrentUserProfile } from '@/app/actions/users';
import { UserProfile, checkPermission } from '@/lib/auth-permissions';
import { toast } from 'sonner';
import DocumentUploadZone from './DocumentUploadZone';
import DocumentViewerModal from './DocumentViewerModal';
import DeleteConfirmModal from './ui/DeleteConfirmModal';
import { downloadDocumentFile, isImageFile } from '@/lib/downloadHelper';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  serviceId?: string;
  customerName: string;
}

export default function DocumentModal({ isOpen, onClose, customerId, serviceId, customerName }: DocumentModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; fileKey: string; title: string } | null>(null);

  // Viewer Modal State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    async function init() {
      const p = await getCurrentUserProfile();
      setProfile(p);
    }
    init();
  }, []);

  const canDelete = checkPermission(profile, 'customers', 'delete');

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

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(deleteTarget.id);
    const res = await deleteDocument(deleteTarget.id, deleteTarget.fileKey);
    if (!res.error) {
      setDocuments((docs) => docs.filter((d) => d.id !== deleteTarget.id));
      toast.success('Document deleted');
    } else {
      toast.error(res.error);
    }
    setIsDeleting(null);
    setDeleteTarget(null);
  };

  const handleOpenViewer = (index: number) => {
    setViewerIndex(index);
    setIsViewerOpen(true);
  };

  const handleDownload = (e: React.MouseEvent, url: string, title: string) => {
    e.stopPropagation();
    downloadDocumentFile(url, title);
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-container max-w-2xl max-h-[90vh] scale-in-center" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between flex-shrink-0 bg-[var(--sidebar-bg)]">
            <div>
              <h3 className="text-xl font-serif text-[var(--foreground)] flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#D97757]" />
                Documents Manager
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
              <h4 className="text-sm font-semibold mb-3">Stored Documents ({documents.length})</h4>
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
                  {documents.map((doc, index) => {
                    const url = doc.file_url || doc.fileUrl;
                    const key = doc.file_key || doc.fileKey;
                    const createdAt = doc.created_at || doc.createdAt;
                    const isImg = url ? isImageFile(url, doc.title) : false;

                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleOpenViewer(index)}
                        className="card-anthropic flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[var(--sidebar-bg)] transition-all cursor-pointer group hover:border-[#D97757]/40"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 bg.var(--sidebar-bg)] rounded-lg shrink-0 text-[#D97757] group-hover:scale-105 transition-transform">
                            {isImg ? <ImageIcon className="h-5 w-5 opacity-70 group-hover:opacity-100" /> : <FileText className="h-5 w-5 opacity-70 group-hover:opacity-100" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate group-hover:text-[#D97757] transition-colors">{doc.title}</p>
                              {doc.tag && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#D97757]/10 text-[#D97757] shrink-0">
                                  {doc.tag}
                                </span>
                              )}
                            </div>
                            <p className="text-xs opacity-60 mt-0.5">
                              Added {createdAt ? new Date(createdAt).toLocaleDateString() : 'Recently'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                          {url && (
                            <>
                              <button
                                onClick={() => handleOpenViewer(index)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#D97757]/10 text-[#D97757] hover:bg-[#D97757]/20 transition-colors"
                                title="Preview Document"
                              >
                                <Eye className="h-4 w-4" /> Preview
                              </button>
                              <button
                                onClick={(e) => handleDownload(e, url, doc.title)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--card-border)] hover:bg-[var(--card-border)] transition-colors opacity-80 hover:opacity-100"
                                title="Download File Direct"
                              >
                                <Download className="h-4 w-4" /> Download
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget({ id: doc.id, fileKey: key, title: doc.title })}
                              disabled={isDeleting === doc.id}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                              title="Delete Document"
                            >
                              {isDeleting === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          )}
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

      {/* Embedded Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        documents={documents}
        initialIndex={viewerIndex}
      />

      {/* Delete Document Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Document"
        itemType="document"
        itemName={deleteTarget?.title || ''}
        isDeleting={!!isDeleting}
        description="Are you sure you want to permanently delete this document and its attached file? This action cannot be undone."
      />
    </>
  );
}

