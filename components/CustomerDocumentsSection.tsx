'use client';

import React, { useState, useMemo } from 'react';
import { FileText, Plus, Eye, Download, Image as ImageIcon, Search, X, FolderOpen } from 'lucide-react';
import DocumentViewerModal from './DocumentViewerModal';
import { downloadDocumentFile, isImageFile } from '@/lib/downloadHelper';

interface CustomerDocumentsSectionProps {
  documents: any[];
  onOpenModal: () => void;
}

export default function CustomerDocumentsSection({ documents = [], onOpenModal }: CustomerDocumentsSectionProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [search, setSearch] = useState('');

  const handleOpenDoc = (index: number) => {
    setActiveDocIndex(index);
    setIsViewerOpen(true);
  };

  const handleDownload = (e: React.MouseEvent, url: string, title: string) => {
    e.stopPropagation();
    downloadDocumentFile(url, title);
  };

  const filteredDocs = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.toLowerCase().trim();
    return documents.filter((doc) => {
      const title = (doc.title || '').toLowerCase();
      const tag = (doc.tag || '').toLowerCase();
      return title.includes(q) || tag.includes(q);
    });
  }, [documents, search]);

  return (
    <>
      <div className="card-anthropic overflow-hidden shadow-xs">
        {/* Header */}
        <div className="p-4 border-b border-[var(--card-border)] space-y-3 bg-[var(--sidebar-bg)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#D97757]/10 text-[#D97757] flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-serif font-medium text-[var(--foreground)]">Client Documents</h3>
                  <span className="text-[10px] font-mono font-bold bg-[#D97757]/10 text-[#D97757] px-2 py-0.5 rounded-full">
                    {documents.length} Files
                  </span>
                </div>
                <p className="text-[11px] opacity-60 font-mono">
                  Passports, visa copies, tickets & verification files
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search Bar */}
              {documents.length > 2 && (
                <div className="relative">
                  <div className="absolute left-2.5 inset-y-0 flex items-center pointer-events-none">
                    <Search className="w-3.5 h-3.5 opacity-40" />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search files..."
                    className="input-anthropic pl-8 pr-7 h-8 text-xs w-36 sm:w-44"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 inset-y-0 flex items-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onOpenModal}
                className="flex items-center gap-1.5 h-8 px-3 bg-[#D97757] hover:bg-[#c66446] text-white text-xs font-medium rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Upload & Manage
              </button>
            </div>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="p-4">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-[var(--card-border)] border-dashed rounded-xl bg-[var(--sidebar-bg)]">
              <FileText className="w-8 h-8 opacity-40 mb-2 text-[#D97757]" />
              <p className="text-xs font-medium text-[var(--foreground)]">
                {search ? 'No files match your search filter.' : 'No customer documents uploaded yet.'}
              </p>
              <p className="text-[11px] opacity-50 mt-0.5">
                Upload passport scans, visa grants, and e-tickets for permanent cloud storage.
              </p>
              <button
                type="button"
                onClick={onOpenModal}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#D97757] bg-[#D97757]/10 hover:bg-[#D97757]/20 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Upload First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDocs.map((doc, idx) => {
                const url = doc.file_url || doc.fileUrl;
                const isImg = url ? isImageFile(url, doc.title) : false;

                return (
                  <div
                    key={doc.id || idx}
                    onClick={() => handleOpenDoc(idx)}
                    className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[var(--anthropic-surface)] border border-[var(--card-border)] hover:bg-[var(--sidebar-bg)] transition-all cursor-pointer group hover:border-[#D97757]/40 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isImg && url ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/10 shrink-0 border border-[var(--card-border)] relative">
                          <img
                            src={url}
                            alt={doc.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#D97757]/10 text-[#D97757] flex items-center justify-center shrink-0 border border-[#D97757]/20 group-hover:scale-105 transition-transform">
                          <FileText className="w-4 h-4 opacity-80" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate group-hover:text-[#D97757] transition-colors" title={doc.title}>
                          {doc.title}
                        </div>
                        <div className="text-[10px] opacity-50 uppercase tracking-wider font-mono">
                          {doc.tag || 'General'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenDoc(idx)}
                        className="p-1 rounded hover:bg-[#D97757]/10 text-[#D97757] opacity-70 hover:opacity-100 transition-colors cursor-pointer"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {url && (
                        <button
                          type="button"
                          onClick={(e) => handleDownload(e, url, doc.title)}
                          className="p-1 rounded hover:bg-[var(--sidebar-bg)] opacity-60 hover:opacity-100 transition-colors cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
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

      <DocumentViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        documents={filteredDocs}
        initialIndex={activeDocIndex}
      />
    </>
  );
}
