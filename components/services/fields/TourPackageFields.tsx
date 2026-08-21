'use client';

import React, { useMemo } from 'react';
import { FormField } from '@/components/ui/form/FormField';
import { SERVICE_STATUSES } from '@/lib/service-constants';

interface TourPackageFieldsProps {
  suppliers?: any[];
  initialData?: any;
}

export function TourPackageFields({
  suppliers = [],
  initialData,
}: TourPackageFieldsProps) {
  const supplierOptions = useMemo(() => {
    const list: { label: string; value: string }[] = [
      { label: 'Select Supplier...', value: '' },
    ];
    suppliers.forEach((s) => {
      if (s?.name && !list.some((o) => o.value === s.name)) {
        list.push({ label: s.name, value: s.name });
      }
    });
    const currSupplier = initialData?.details?.supplier_name || initialData?.details?.visa_supplier;
    if (currSupplier && !list.some((o) => o.value === currSupplier)) {
      list.push({ label: currSupplier, value: currSupplier });
    }
    return list;
  }, [suppliers, initialData]);

  return (
    <div className="card-anthropic p-6">
      <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">
        Tour Details
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="category"
          label="Category *"
          component="select"
          options={[
            { label: 'Tour Package', value: 'Tour Package' },
            { label: 'Hotel Booking', value: 'Hotel Booking' },
            { label: 'Desert Safari', value: 'Desert Safari' },
            { label: 'City Tour', value: 'City Tour' },
            { label: 'Custom Package', value: 'Custom Package' },
          ]}
          className="col-span-2"
        />
        <FormField name="details.travel_date" label="Date" type="date" className="col-span-2 md:col-span-1" />
        <FormField
          name="details.supplier_name"
          label="Supplier Name"
          component="select"
          options={supplierOptions}
          className="col-span-2 md:col-span-1"
        />
        <FormField
          name="details.tour_plans"
          label="Tour Name / Plan Details"
          component="textarea"
          placeholder="e.g. 5 Days Dubai & Abu Dhabi Deluxe Package with 4-star hotel and transfers"
          className="col-span-2"
        />
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
