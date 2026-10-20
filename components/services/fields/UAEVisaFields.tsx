'use client';

import React, { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField } from '@/components/ui/form/FormField';
import { DropdownField } from '@/components/ui/form/DropdownField';
import { SERVICE_STATUSES } from '@/lib/service-constants';
import { extractDuration } from '@/lib/rateAutofill';
import { calculateVisaExpiryDate } from '@/lib/serviceDates';

interface UAEVisaFieldsProps {
  availableVisaTypes: string[];
  availableSuppliers: string[];
}

export function UAEVisaFields({
  availableVisaTypes,
  availableSuppliers,
}: UAEVisaFieldsProps) {
  const { watch, setValue, getValues } = useFormContext();
  const category = watch('category');
  const duration = watch('details.visa_duration');
  const issuedDate = watch('details.visa_issued_date');
  const travelDate = watch('details.travel_date');

  const prevInputsRef = useRef({
    category,
    duration,
    issuedDate,
    travelDate,
    initialized: false,
  });

  useEffect(() => {
    const prev = prevInputsRef.current;
    const baseDate = travelDate || issuedDate;

    if (!prev.initialized) {
      prevInputsRef.current = { category, duration, issuedDate, travelDate, initialized: true };
      const currentExpiry = getValues('details.visa_expiry_date');
      if (!currentExpiry && baseDate) {
        const computed = calculateVisaExpiryDate(baseDate, duration, category);
        if (computed) {
          setValue('details.visa_expiry_date', computed, { shouldDirty: false });
        }
      }
      return;
    }

    const categoryChanged = category !== prev.category;
    const durationChanged = duration !== prev.duration;
    const dateChanged = travelDate !== prev.travelDate || issuedDate !== prev.issuedDate;

    if (!categoryChanged && !durationChanged && !dateChanged) return;

    let effectiveDuration = duration;
    if (categoryChanged) {
      const extracted = extractDuration(category);
      if (extracted && extracted !== duration) {
        effectiveDuration = extracted;
        setValue('details.visa_duration', extracted, { shouldDirty: true });
      }
    }

    if (baseDate) {
      const nextExpiry = calculateVisaExpiryDate(baseDate, effectiveDuration, category);
      if (nextExpiry && nextExpiry !== getValues('details.visa_expiry_date')) {
        setValue('details.visa_expiry_date', nextExpiry, { shouldDirty: true });
      }
    }

    prevInputsRef.current = {
      category,
      duration: effectiveDuration,
      issuedDate,
      travelDate,
      initialized: true,
    };
  }, [category, duration, issuedDate, travelDate, setValue, getValues]);

  return (
    <div className="card-anthropic p-6 overflow-visible">
      <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">
        Visa Details
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <DropdownField
          name="details.visa_supplier"
          label="Supplier *"
          placeholder="Select supplier"
          options={availableSuppliers.map((s) => ({ label: s, value: s }))}
        />
        <FormField
          name="category"
          label="Visa Type *"
          component="select"
          options={availableVisaTypes.map((c) => ({ label: c, value: c }))}
        />
        <FormField
          name="details.visa_duration"
          label="Duration"
          component="select"
          options={[
            { label: '30 Days', value: '30 Days' },
            { label: '60 Days', value: '60 Days' },
            { label: '90 Days', value: '90 Days' },
            { label: '48 Hours', value: '48 Hours' },
            { label: '96 Hours', value: '96 Hours' },
            { label: '14 Days', value: '14 Days' },
          ]}
        />
        <FormField
          name="status"
          label="Status"
          component="select"
          options={SERVICE_STATUSES.map((s) => ({ label: s, value: s }))}
        />
        <FormField name="details.visa_issued_date" label="Issue Date" type="date" />
        <FormField name="details.travel_date" label="Travel Date" type="date" />
        <FormField name="details.visa_expiry_date" label="Expiry Date" type="date" className="col-span-2 md:col-span-1" />
      </div>
    </div>
  );
}
