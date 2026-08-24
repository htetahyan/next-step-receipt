'use client';

import React from 'react';
import { Plane } from 'lucide-react';
import { toast } from 'sonner';

import { airTicketSchema, AirTicketFormValues } from '@/lib/validations/serviceSchemas';
import { ServiceFormShell } from '@/components/services/ServiceFormShell';
import { AirTicketFields } from '@/components/services/fields/AirTicketFields';
import { UserProfile } from '@/lib/auth-permissions';
import { findSupplierRate } from '@/lib/rateAutofill';
import { RateCard } from '@/app/actions/rate-cards';

interface Props {
  customers: any[];
  suppliers?: any[];
  rateCards?: RateCard[];
  initialData?: any;
  duplicateData?: any;
  currentUser?: UserProfile | null;
}

export default function AirTicketForm({
  customers,
  suppliers = [],
  rateCards = [],
  initialData,
  duplicateData,
  currentUser,
}: Props) {
  const defaultHandledBy =
    initialData?.details?.handled_by ||
    duplicateData?.details?.handled_by ||
    currentUser?.fullName ||
    (currentUser?.email ? currentUser.email.split('@')[0] : '') ||
    '';

  const defaultValues: AirTicketFormValues = {
    customerId: initialData?.customer_id || duplicateData?.customer_id || '',
    isNewCustomer: false,
    status: initialData?.status || 'Open',
    category: initialData?.category || duplicateData?.category || 'One Way',
    details: {
      travel_date: initialData?.details?.travel_date || '',
      return_date: initialData?.details?.return_date || '',
      airline: initialData?.details?.airline || duplicateData?.details?.airline || '',
      pnr: initialData?.details?.pnr || duplicateData?.details?.pnr || '',
      ticket_no: initialData?.details?.ticket_no || duplicateData?.details?.ticket_no || '',
      sector: initialData?.details?.sector || duplicateData?.details?.sector || '',
      handled_by: defaultHandledBy,
      referred_by: initialData?.details?.referred_by || duplicateData?.details?.referred_by || '',
      comments: initialData?.details?.comments || duplicateData?.details?.comments || '',
      remark: initialData?.details?.remark || duplicateData?.details?.remark || '',
    },
    financials: {
      amount: initialData?.financials?.amount || duplicateData?.financials?.amount || 0,
      discount: initialData?.financials?.discount || duplicateData?.financials?.discount || 0,
      supplier_cost: initialData?.financials?.supplier_cost || duplicateData?.financials?.supplier_cost || 0,
      refund: initialData?.financials?.refund || 0,
      payment_method: initialData?.financials?.payment_method || duplicateData?.financials?.payment_method || 'Bank Transfer',
    },
  };

  const lastAutofillKeyRef = React.useRef<string>('');

  const handleAutoFill = (values: any, setValue: any) => {
    const airline = values.details?.airline || '';
    const category = values.category || '';

    const currentKey = `${category}__${airline}`;
    if (currentKey === lastAutofillKeyRef.current) return;
    lastAutofillKeyRef.current = currentKey;

    if (airline || category) {
      const match = findSupplierRate(suppliers, airline, category, rateCards);
      if (match) {
        let updated = false;
        if (match.cost > 0) {
          setValue('financials.supplier_cost', match.cost, { shouldDirty: true });
          updated = true;
        }
        if (match.price > 0) {
          setValue('financials.amount', match.price, { shouldDirty: true });
          updated = true;
        }
        if (updated) {
          toast.info(`Rates auto-filled from ${match.supplierName}: Cost ${match.cost} AED, Price ${match.price} AED`);
        }
      }
    }
  };

  return (
    <ServiceFormShell<AirTicketFormValues>
      title="Air Ticket Record"
      icon={Plane}
      refPrefix="AT"
      redirectPath="/dashboard/air-tickets"
      schema={airTicketSchema}
      defaultValues={defaultValues}
      customers={customers}
      suppliers={suppliers}
      rateCards={rateCards}
      initialData={initialData}
      duplicateData={duplicateData}
      currentUser={currentUser}
      renderCategoryFields={() => <AirTicketFields suppliers={suppliers} />}
      onAutoFill={handleAutoFill}
    />
  );
}
