'use client';

import { STATUS_COLORS } from '@/lib/statusColors';

export default function VisaStatusControl({
  status,
  expired,
  canEdit,
  saving,
  onChange,
}: {
  status: string;
  expired: boolean;
  canEdit: boolean;
  saving: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="inline-flex items-center rounded-md border border-[var(--card-border)] p-0.5 bg-[var(--sidebar-bg)]">
        {['Open', 'In Progress', 'Closed'].map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={!canEdit || saving}
            onClick={() => onChange(opt)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50 ${
              status === opt ? STATUS_COLORS[opt] || 'bg-[var(--card-bg)]' : 'opacity-45 hover:opacity-80'
            }`}
            title={`Set ${opt}`}
          >
            {opt === 'In Progress' ? 'Prog' : opt}
          </button>
        ))}
      </div>
      {expired && status !== 'Closed' && status !== 'Cancelled' && canEdit && (
        <button
          type="button"
          disabled={saving}
          onClick={() => onChange('Closed')}
          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-600 text-white hover:bg-red-700 cursor-pointer w-max"
        >
          Close expired
        </button>
      )}
    </div>
  );
}
