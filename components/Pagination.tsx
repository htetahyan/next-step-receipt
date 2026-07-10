'use client';

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  const pages = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between border-t border-[var(--card-border)] bg-[var(--sidebar-bg)] px-6 py-4">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-xs font-semibold hover:bg-[var(--sidebar-bg)] disabled:opacity-40 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-xs font-semibold hover:bg-[var(--sidebar-bg)] disabled:opacity-40 transition-colors"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs opacity-60 font-mono">
            Showing <span className="font-semibold text-[var(--foreground)]">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
            <span className="font-semibold text-[var(--foreground)]">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
            <span className="font-semibold text-[var(--foreground)]">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
            <button
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2 text-xs font-semibold hover:bg-[var(--sidebar-bg)] disabled:opacity-40 transition-all hover:scale-[1.05] active:scale-[0.95]"
            >
              Previous
            </button>
            {pages.map(pageNum => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`relative inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.05] active:scale-[0.95] ${
                  currentPage === pageNum
                    ? 'bg-[#D97757] text-[#F5F4EF] border border-[#D97757]'
                    : 'border border-[var(--card-border)] bg-[var(--background)] hover:bg-[var(--sidebar-bg)]'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2 text-xs font-semibold hover:bg-[var(--sidebar-bg)] disabled:opacity-40 transition-all hover:scale-[1.05] active:scale-[0.95]"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
