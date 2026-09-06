'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, X, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface UploadBatchItem {
  id: string;
  title: string;
  sizeFormatted: string;
  sizeBytes: number;
  isLarge: boolean;
  isImage: boolean;
  previewUrl?: string;
}

interface BatchUploadConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: UploadBatchItem[];
  totalSizeBytes: number;
  totalSizeFormatted: string;
}

export default function BatchUploadConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  totalSizeBytes,
  totalSizeFormatted,
}: BatchUploadConfirmModalProps) {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || items.length === 0) return null;

  const hasExtraLargeFiles = items.some(item => item.sizeBytes > 10 * 1024 * 1024);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl z-10 scale-in-center overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-amber-500/10 border-b border-amber-500/20 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[var(--foreground)]">
                {hasExtraLargeFiles ? 'Large File Upload Warning' : 'Confirm Batch Upload'}
              </h3>
              <p className="text-xs opacity-70 mt-0.5">
                Review the file list and total bandwidth before uploading
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--card-border)] transition-colors opacity-60 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Summary stats badge */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--sidebar-bg)] border border-[var(--card-border)] text-xs">
            <span className="font-medium opacity-70">Total Files to Upload:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold">{items.length} file{items.length > 1 ? 's' : ''}</span>
              <span className="opacity-40">•</span>
              <span className="font-bold text-[#D97757] font-mono">{totalSizeFormatted}</span>
            </div>
          </div>

          {hasExtraLargeFiles && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-semibold">⚠️ Notice: Some files exceed 10 MB.</p>
              <p className="opacity-80 mt-0.5">Large uploads may take longer depending on your connection speed.</p>
            </div>
          )}

          {/* Files List */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-2">
              Files in this batch ({items.length})
            </span>
            <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-xs gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/10 shrink-0 border border-[var(--card-border)] flex items-center justify-center">
                      {item.isImage && item.previewUrl ? (
                        <img src={item.previewUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#D97757]" />
                      )}
                    </div>
                    <span className="font-medium truncate max-w-[220px]" title={item.title}>
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.sizeBytes > 10 * 1024 * 1024 ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono">
                        {item.sizeFormatted} (Large)
                      </span>
                    ) : (
                      <span className="text-[11px] opacity-60 font-mono">
                        {item.sizeFormatted}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] opacity-60 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Files are encrypted and safely streamed to cloud storage.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 bg-[var(--sidebar-bg)] border-t border-[var(--card-border)] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-border)] text-xs font-semibold transition-colors"
          >
            Cancel / Adjust
          </button>
          <button
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="px-5 py-2 rounded-lg bg-[#D97757] hover:bg-[#c26243] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm & Upload
          </button>
        </div>
      </div>
    </div>
  );
}
