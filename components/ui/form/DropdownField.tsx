'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { errorCls, inputCls, labelCls } from './FormField';

export function DropdownField({
  name,
  label,
  options = [],
  placeholder = 'Select',
  className = '',
  readOnly = false,
}: {
  name: string;
  label: string;
  options?: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}) {
  const { setValue, watch, formState: { errors } } = useFormContext();
  const value = String(watch(name) ?? '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const choices = options.filter((opt) => opt.value);
  const selected = choices.find((opt) => opt.value === value);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const errorParts = name.split('.');
  let error: any = errors;
  for (const part of errorParts) error = error?.[part];

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <label className={labelCls}>{label}</label>
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setOpen((v) => !v)}
        className={`${inputCls} flex items-center justify-between text-left`}
      >
        <span className={selected ? '' : 'opacity-40'}>{selected?.label || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 opacity-50 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-[90] mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-xl">
          {choices.length === 0 ? (
            <div className="px-3 py-2 text-xs opacity-50">No suppliers found</div>
          ) : (
            choices.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setValue(name, opt.value, { shouldDirty: true, shouldValidate: true });
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-[var(--sidebar-bg)] ${opt.value === value ? 'bg-[#D97757]/10 text-[#D97757] font-medium' : ''}`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
      {error?.message && <p className={errorCls}>{String(error.message)}</p>}
    </div>
  );
}
