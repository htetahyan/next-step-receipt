'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField } from '@/components/ui/form/FormField';
import { SERVICE_STATUSES } from '@/lib/service-constants';

interface AirTicketFieldsProps {
  suppliers?: any[];
}

export function AirTicketFields({ suppliers = [] }: AirTicketFieldsProps) {
  const { watch } = useFormContext();
  const tripType = watch('category');

  return (
    <div className="card-anthropic p-6">
      <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">
        Ticket Details
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="category"
          label="Trip Type *"
          component="select"
          options={[
            { label: 'One Way', value: 'One Way' },
            { label: 'Round Trip', value: 'Round Trip' },
            { label: 'Multi City', value: 'Multi City' },
          ]}
          className="col-span-2"
        />
        <FormField
          name="details.airline"
          label="Airline"
          placeholder="e.g. Emirates, FlyDubai, Myanmar Airways"
        />
        <FormField
          name="details.sector"
          label="Sector (Route)"
          placeholder="e.g. DXB-LHR or RGN-BKK"
        />
        <FormField
          name="details.pnr"
          label="PNR / Booking Ref"
          placeholder="e.g. 6-character PNR"
        />
        <FormField
          name="details.ticket_no"
          label="Ticket Number"
          placeholder="e.g. 176-1234567890"
        />
        <FormField name="details.travel_date" label="Departure Date" type="date" />
        {(tripType === 'Round Trip' || tripType === 'Multi City') && (
          <FormField name="details.return_date" label="Return / Next Date" type="date" />
        )}
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
