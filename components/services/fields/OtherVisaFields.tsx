'use client';

import React, { useMemo } from 'react';
import { FormField } from '@/components/ui/form/FormField';
import { SERVICE_STATUSES, VISA_SUPPLIERS } from '@/lib/service-constants';

interface OtherVisaFieldsProps {
  suppliers?: any[];
  initialData?: any;
}

export function OtherVisaFields({
  suppliers = [],
  initialData,
}: OtherVisaFieldsProps) {
  const supplierOptions = useMemo(() => {
    const list: { label: string; value: string }[] = [
      { label: 'Select Supplier...', value: '' },
      ...VISA_SUPPLIERS.map((s) => ({ label: s, value: s })),
    ];
    suppliers.forEach((s) => {
      if (s?.name && !list.some((o) => o.value === s.name)) {
        list.push({ label: s.name, value: s.name });
      }
    });
    const currSupplier = initialData?.details?.visa_supplier || initialData?.details?.supplier_name;
    if (currSupplier && !list.some((o) => o.value === currSupplier)) {
      list.push({ label: currSupplier, value: currSupplier });
    }
    return list;
  }, [suppliers, initialData]);

  return (
    <div className="card-anthropic p-6">
      <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">
        Visa Details
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="category"
          label="Destination / Service Category *"
          placeholder="e.g. Schengen / EU Visa, Japan Visa, UK Visa, China Visa"
          className="col-span-2"
        />
        <FormField
          name="details.visa_supplier"
          label="Supplier"
          component="select"
          options={supplierOptions}
        />
        <FormField
          name="details.visa_type"
          label="Visa Type"
          component="select"
          options={[
            { label: 'Tourist', value: 'Tourist' },
            { label: 'Business', value: 'Business' },
            { label: 'Student', value: 'Student' },
            { label: 'Work', value: 'Work' },
            { label: 'Transit', value: 'Transit' },
          ]}
        />
        <FormField name="details.appointment_date" label="Appointment Date" type="date" />
        <FormField name="details.travel_date" label="Expected Travel Date" type="date" />
        <FormField
          name="status"
          label="Status"
          component="select"
          options={SERVICE_STATUSES.map((s) => ({ label: s, value: s }))}
          className="col-span-2"
        />
      </div>
    </div>
  );
}
