'use client';

import React from 'react';
import { FormField } from '@/components/ui/form/FormField';
import { CUSTOM_SERVICE_SUGGESTIONS, SERVICE_STATUSES } from '@/lib/service-constants';

interface CustomServiceFieldsProps {
  suppliers: any[];
}

export function CustomServiceFields({ suppliers }: CustomServiceFieldsProps) {
  const supplierOptions = [
    { label: 'Self / In-house', value: 'Self / In-house' },
    ...suppliers.map((s) => ({ label: s.name, value: s.name })),
  ];

  return (
    <div className="card-anthropic p-6">
      <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">
        Service Details
      </h3>

      <datalist id="service-suggestions">
        {CUSTOM_SERVICE_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="category"
          label="Service Name *"
          component="input"
          list="service-suggestions"
          className="col-span-2"
          placeholder="e.g. Dummy Flight, Document Attestation"
        />
        
        <FormField
          name="details.supplier_name"
          label="Supplier"
          component="select"
          options={supplierOptions}
        />
        
        <FormField name="details.reference_number" label="Reference / Booking Number" type="text" />
        
        <FormField name="details.start_date" label="Start Date" type="date" />
        <FormField name="details.end_date" label="End Date" type="date" />
        <FormField name="details.travel_date" label="Travel Date" type="date" />
        
        <FormField
          name="status"
          label="Status"
          component="select"
          options={SERVICE_STATUSES.map((s) => ({ label: s, value: s }))}
        />
        
        <FormField
          name="details.description"
          label="Description"
          component="textarea"
          className="col-span-2"
          placeholder="Additional details about this custom service..."
        />
      </div>
    </div>
  );
}
