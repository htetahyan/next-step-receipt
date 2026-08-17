'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  itemName?: string;
  itemType?: string;
  description?: string;
  isDeleting?: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = 'item',
  description,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200" 
        onClick={!isDeleting ? onClose : undefined} 
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-md bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl p-6 z-10 scale-in-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Warning Icon Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-semibold text-[var(--foreground)]">
                {title || `Delete ${itemType}`}
              </h3>
              <p className="text-xs opacity-60 mt-0.5">Please confirm this action</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-[var(--foreground)] opacity-40 hover:opacity-100 hover:bg-[var(--card-border)] transition-all disabled:opacity-20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-3 mb-6">
          <p className="text-sm opacity-80 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            {itemName ? (
              <span className="font-semibold text-[var(--foreground)] bg-[var(--sidebar-bg)] px-1.5 py-0.5 rounded border border-[var(--card-border)]">
                {itemName}
              </span>
            ) : (
              `this ${itemType}`
            )}
            ?
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            {description || 'This action cannot be undone and will permanently remove all associated records from the database.'}
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--card-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-[var(--card-border)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--sidebar-bg)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
