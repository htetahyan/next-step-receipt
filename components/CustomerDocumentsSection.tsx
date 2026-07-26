'use client';

import React, { useState } from 'react';
import { FileText, Plus, Eye, Download, Image as ImageIcon } from 'lucide-react';
import DocumentViewerModal from './DocumentViewerModal';
import { downloadDocumentFile, isImageFile } from '@/lib/downloadHelper';

interface CustomerDocumentsSectionProps {
  documents: any[];
  onOpenModal: () => void;
}

export default function CustomerDocumentsSection({ documents, onOpenModal }: CustomerDocumentsSectionProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  const handleOpenDoc = (index: number) => {
    setActiveDocIndex(index);
    setIsViewerOpen(true);
  };

  const handleDownload = (e: React.MouseEvent, url: string, title: string) => {
    e.stopPropagation();
    downloadDocumentFile(url, title);
  };

  return (
    <>
      <div className="card-anthropic p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--card-border)]">
          <h3 className="text-lg font-serif">Documents</h3>
          <button
            onClick={onOpenModal}
            className="text-sm font-medium text-[#D97757] hover:underline flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Manage Documents
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {documents.length === 0 ? (
            <div className="col-span-2 text-sm opacity-50 pb-4">No documents found.</div>
          ) : (
            documents.slice(0, 6).map((doc, idx) => {
              const url = doc.file_url || doc.fileUrl;
              const isImg = url ? isImageFile(url, doc.title) : false;

              return (
                <div
                  key={doc.id || idx}
                  onClick={() => handleOpenDoc(idx)}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--anthropic-surface)] border border-[var(--card-border)] hover:bg-[var(--card-border)] transition-all cursor-pointer group hover:border-[#D97757]/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-[var(--sidebar-bg)] rounded-lg text-[#D97757] shrink-0 group-hover:scale-105 transition-transform">
                      {isImg ? <ImageIcon className="w-4 h-4 opacity-70 group-hover:opacity-100" /> : <FileText className="w-4 h-4 opacity-70 group-hover:opacity-100" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate group-hover:text-[#D97757] transition-colors">{doc.title}</div>
                      <div className="text-[10px] opacity-50 uppercase tracking-wider">{doc.tag || 'General'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenDoc(idx)}
                      className="p-1.5 rounded-md hover:bg-[#D97757]/10 text-[#D97757] opacity-80 hover:opacity-100 transition-colors"
                      title="Preview Document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {url && (
                      <button
                        onClick={(e) => handleDownload(e, url, doc.title)}
                        className="p-1.5 rounded-md hover:bg-[var(--sidebar-bg)] opacity-70 hover:opacity-100 transition-colors"
                        title="Download File Direct"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <DocumentViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        documents={documents}
        initialIndex={activeDocIndex}
      />
    </>
  );
}

