import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';

export const inputCls = "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition-all";
export const labelCls = "block text-[10px] uppercase tracking-wider font-medium opacity-60 mb-1.5";
export const errorCls = "text-xs text-red-500 mt-1";

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  component?: 'input' | 'select' | 'textarea';
  className?: string;
  readOnly?: boolean;
  list?: string;
}

export function FormField({ name, label, type = 'text', placeholder, options, component = 'input', className = '', readOnly = false, list }: FormFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  
  // Handle nested error paths like newCustomer.name
  const errorParts = name.split('.');
  let error = errors as any;
  for (const part of errorParts) {
    if (error) error = error[part];
  }

  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      
      {component === 'input' && (
        <input
          type={type}
          {...register(name)}
          placeholder={placeholder}
          className={inputCls}
          readOnly={readOnly}
          list={list}
        />
      )}

      {component === 'select' && (
        <select
          {...register(name)}
          className={inputCls}
          disabled={readOnly}
        >
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {component === 'textarea' && (
        <textarea
          {...register(name)}
          placeholder={placeholder}
          className={inputCls}
          readOnly={readOnly}
          rows={3}
        />
      )}

      {error && <p className={errorCls}>{error.message as string}</p>}
    </div>
  );
}
