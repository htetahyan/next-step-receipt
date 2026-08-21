'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { toast } from 'sonner';

import { otherVisaSchema, OtherVisaFormValues } from '@/lib/validations/serviceSchemas';
import { ServiceFormShell } from '@/components/services/ServiceFormShell';
import { OtherVisaFields } from '@/components/services/fields/OtherVisaFields';
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

export default function OtherVisaForm({
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

  const defaultValues: OtherVisaFormValues = {
    customerId: initialData?.customer_id || duplicateData?.customer_id || '',
    isNewCustomer: false,
    status: initialData?.status || 'Open',
    category: initialData?.category || duplicateData?.category || 'Schengen / EU Visa',
    details: {
      visa_supplier: initialData?.details?.visa_supplier || duplicateData?.details?.visa_supplier || '',
      travel_date: initialData?.details?.travel_date || duplicateData?.details?.travel_date || '',
      visa_type: initialData?.details?.visa_type || duplicateData?.details?.visa_type || 'Tourist',
      appointment_date: initialData?.details?.appointment_date || duplicateData?.details?.appointment_date || '',
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

  const handleAutoFill = (values: any, setValue: any) => {
    const category = values.category;
    const supplier = values.details?.visa_supplier;

    if (category || supplier) {
      const match = findSupplierRate(suppliers, supplier, category, rateCards);
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
    <ServiceFormShell<OtherVisaFormValues>
      title="Other Visa Record"
      icon={Globe}
      refPrefix="OV"
      redirectPath="/dashboard/other-visa"
      schema={otherVisaSchema}
      defaultValues={defaultValues}
      customers={customers}
      suppliers={suppliers}
      rateCards={rateCards}
      initialData={initialData}
      duplicateData={duplicateData}
      currentUser={currentUser}
      renderCategoryFields={() => (
        <OtherVisaFields suppliers={suppliers} initialData={initialData || duplicateData} />
      )}
      onAutoFill={handleAutoFill}
    />
  );
}
