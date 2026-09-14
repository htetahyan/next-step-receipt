'use client';

import { Loader2 } from 'lucide-react';

export default function RecordScopeToggle({
  allTime,
  loading,
  onChange,
}: {
  allTime: boolean;
  loading?: boolean;
  onChange: (allTime: boolean) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[var(--card-border)] bg-[var(--sidebar-bg)] p-0.5 text-[11px]">
      <button
        type="button"
        disabled={loading}
        onClick={() => onChange(false)}
        className={`px-2 py-1 rounded-md font-medium transition-colors ${
          !allTime ? 'bg-[var(--card-bg)] shadow-xs text-[var(--foreground)]' : 'opacity-60 hover:opacity-90'
        }`}
        title="Open / in progress plus last 120 days"
      >
        Working set
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => onChange(true)}
        className={`px-2 py-1 rounded-md font-medium transition-colors inline-flex items-center gap-1 ${
          allTime ? 'bg-[var(--card-bg)] shadow-xs text-[var(--foreground)]' : 'opacity-60 hover:opacity-90'
        }`}
        title="Load all matching records (does not delete anything)"
      >
        {loading && allTime ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        All records
      </button>
    </div>
  );
}
