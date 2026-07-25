'use client'

import React, { useState, useEffect } from 'react'
import { X, FileText, Loader2, Trash2, Download, ExternalLink, Plus, UploadCloud } from 'lucide-react'
import { getDocuments, addDocument, deleteDocument } from '@/app/actions/documents'
import { getPresignedUrl } from '@/app/actions/r2'
import { toast } from 'sonner'

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  serviceId?: string;
  customerName: string;
}

export default function DocumentModal({ isOpen, onClose, customerId, serviceId, customerName }: DocumentModalProps) {
  const [documents, setDocuments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const fetchDocuments = async () => {
    setIsLoading(true)
    const res = await getDocuments(customerId, serviceId)
    if (!res.error && res.documents) {
      setDocuments(res.documents)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (isOpen) {
      fetchDocuments()
      setTitle('')
    }
  }, [isOpen, customerId, serviceId])

  if (!isOpen) return null

  const handleDelete = async (id: string, fileKey: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    setIsDeleting(id)
    const res = await deleteDocument(id, fileKey)
    if (!res.error) {
      setDocuments(docs => docs.filter(d => d.id !== id))
    } else {
      toast.error(res.error)
    }
    setIsDeleting(null)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container max-w-2xl max-h-[90vh] scale-in-center" onClick={e => e.stopPropagation()}>
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
          {/* Upload Section */}
          <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-5">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-1">
              <Plus className="h-4 w-4 text-[#D97757]" /> Upload New Document
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 opacity-70">Document Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Passport Scan, Visa Copy..."
                  className="input-anthropic w-full px-3 py-2 text-sm block"
                />
              </div>

              {!title.trim() ? (
                <div className="text-xs text-center p-4 rounded-lg bg-[var(--background)] font-medium border border-dashed border-[var(--card-border)] opacity-70">
                  Please enter a document title before uploading
                </div>
              ) : (
                <div>
                  <div className="border border-dashed border-[var(--card-border)] rounded-md p-6 text-center hover:bg-[var(--sidebar-bg)] transition-colors relative">
                    <input 
                      type="file" 
                      id="doc-modal-upload" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploading(true);
                          const presignedRes = await getPresignedUrl(file.name, file.type);
                          if (presignedRes.success && presignedRes.uploadUrl) {
                            const uploadRes = await fetch(presignedRes.uploadUrl, {
                              method: 'PUT',
                              body: file,
                              headers: { 'Content-Type': file.type },
                            });
                            if (uploadRes.ok) {
                              const r = await addDocument({
                                customerId,
                                serviceId,
                                title: title.trim(),
                                file_url: presignedRes.publicUrl!,
                                file_key: presignedRes.fileKey!,
                              });
                              if (!r.error) {
                                setTitle('');
                                fetchDocuments();
                                toast.success("Document uploaded successfully");
                              } else {
                                toast.error(r.error);
                              }
                            } else {
                              toast.error("Failed to upload to R2");
                            }
                          } else {
                            toast.error("Failed to get presigned URL");
                          }
                          setIsUploading(false);
                          // Reset input
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      <UploadCloud className="w-8 h-8 opacity-40" />
                      <span className="text-sm font-medium text-[#D97757]">Click or drag file to this area to upload</span>
                      <span className="text-xs opacity-50">Upload a single file</span>
                    </div>
                  </div>
                  {isUploading && (
                    <div className="mt-3 text-xs font-semibold text-[#D97757] flex items-center justify-center gap-2">
                       <Loader2 className="h-4 w-4 animate-spin" /> Uploading to R2...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

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
                {documents.map(doc => (
                  <div key={doc.id} className="card-anthropic flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[var(--sidebar-bg)] transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[var(--sidebar-bg)] rounded-lg shrink-0">
                        <FileText className="h-5 w-5 opacity-50" />
                      </div>
                      <div>
                        <p className="font-semibold">{doc.title}</p>
                        <p className="text-xs opacity-60 mt-0.5">
                          Added {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold opacity-80 hover:bg-[var(--card-border)] transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" /> View
                      </a>
                      <button 
                        onClick={() => handleDelete(doc.id, doc.fileKey)}
                        disabled={isDeleting === doc.id}
                        className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors opacity-70 hover:opacity-100"
                        title="Delete Document"
                      >
                        {isDeleting === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
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
  )
}
