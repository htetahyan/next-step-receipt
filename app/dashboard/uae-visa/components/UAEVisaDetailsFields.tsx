import React from 'react';
import { FormField } from '@/components/ui/form/FormField';
import { SERVICE_STATUSES } from '@/lib/service-constants';

interface UAEVisaDetailsFieldsProps {
  availableVisaTypes: string[];
  availableSuppliers: string[];
}

export function UAEVisaDetailsFields({
  availableVisaTypes,
  availableSuppliers,
}: UAEVisaDetailsFieldsProps) {
  return (
    <>
      <div className="card-anthropic p-6">
        <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">
          Visa Details
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            name="category"
            label="Visa Type *"
            component="select"
            options={availableVisaTypes.map(c => ({ label: c, value: c }))}
            className="col-span-2"
          />
          <FormField name="details.visa_issued_date" label="Issue Date" type="date" />
          <FormField name="details.travel_date" label="Travel Date" type="date" />
          <FormField name="details.visa_expiry_date" label="Expiry Date" type="date" />
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
            ]}
          />
          <FormField
            name="details.visa_supplier"
            label="Supplier"
            component="select"
            options={availableSuppliers.map(s => ({ label: s, value: s }))}
          />
          <FormField
            name="status"
            label="Status"
            component="select"
            options={SERVICE_STATUSES.map(s => ({ label: s, value: s }))}
          />
        </div>
      </div>

      <div className="card-anthropic p-6">
        <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">
          Staff & Additional Info
        </h3>
        <div className="space-y-4">
          <FormField name="details.handled_by" label="Handled By / Served By (Staff)" placeholder="e.g. Staff Name" />
          <FormField name="details.referred_by" label="Referred By (B2B/Agent)" placeholder="e.g. Agent Name" />
          <FormField name="details.comments" label="Comments" component="textarea" />
          <FormField name="details.remark" label="Admin Remark (Private)" component="textarea" />
        </div>
      </div>
    </>
  );
}
