'use client';

import React from 'react';
import { FileText, Plus } from 'lucide-react';

interface CustomerDocumentsSectionProps {
  documents: any[];
  onOpenModal: () => void;
}

export default function CustomerDocumentsSection({ documents, onOpenModal }: CustomerDocumentsSectionProps) {
  return (
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
      <div className="grid grid-cols-2 gap-4">
        {documents.length === 0 ? (
          <div className="col-span-2 text-sm opacity-50 pb-4">No documents found.</div>
        ) : (
          documents.slice(0, 4).map((doc) => {
            const url = doc.file_url || doc.fileUrl;
            return (
              <a
                key={doc.id}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--anthropic-surface)] border border-[var(--card-border)] hover:bg-[var(--card-border)] transition-colors group"
              >
                <FileText className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{doc.title}</div>
                  <div className="text-[10px] opacity-40 uppercase tracking-tighter">{doc.tag || 'General'}</div>
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
