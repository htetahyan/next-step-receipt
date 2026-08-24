'use client';

import React from 'react';
import { Map } from 'lucide-react';
import { toast } from 'sonner';

import { tourPackageSchema, TourPackageFormValues } from '@/lib/validations/serviceSchemas';
import { ServiceFormShell } from '@/components/services/ServiceFormShell';
import { TourPackageFields } from '@/components/services/fields/TourPackageFields';
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

export default function TourPackageForm({
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

  const defaultValues: TourPackageFormValues = {
    customerId: initialData?.customer_id || duplicateData?.customer_id || '',
    isNewCustomer: false,
    status: initialData?.status || 'Open',
    category: initialData?.category || duplicateData?.category || 'Tour Package',
    details: {
      travel_date: initialData?.details?.travel_date || duplicateData?.details?.travel_date || '',
      supplier_name: initialData?.details?.supplier_name || duplicateData?.details?.supplier_name || '',
      tour_plans: initialData?.details?.tour_plans || duplicateData?.details?.tour_plans || '',
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
    const supplier = values.details?.supplier_name || '';
    const plans = values.details?.tour_plans || '';
    const category = values.category || '';

    const currentKey = `${category}__${supplier}__${plans}`;
    if (currentKey === lastAutofillKeyRef.current) return;
    lastAutofillKeyRef.current = currentKey;

    if (supplier || plans || category) {
      const match = findSupplierRate(suppliers, supplier, plans || category, rateCards);
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
    <ServiceFormShell<TourPackageFormValues>
      title="Tour Package Record"
      icon={Map}
      refPrefix="TP"
      redirectPath="/dashboard/tour-packages"
      schema={tourPackageSchema}
      defaultValues={defaultValues}
      customers={customers}
      suppliers={suppliers}
      rateCards={rateCards}
      initialData={initialData}
      duplicateData={duplicateData}
      currentUser={currentUser}
      renderCategoryFields={() => (
        <TourPackageFields suppliers={suppliers} initialData={initialData || duplicateData} />
      )}
      onAutoFill={handleAutoFill}
    />
  );
}
