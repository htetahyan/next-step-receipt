'use client';

import React, { useMemo } from 'react';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

import { uaeVisaSchema, UAEVisaFormValues } from '@/lib/validations/serviceSchemas';
import { ServiceFormShell } from '@/components/services/ServiceFormShell';
import { UAEVisaFields } from '@/components/services/fields/UAEVisaFields';
import { UAE_VISA_CATEGORIES, VISA_SUPPLIERS } from '@/lib/service-constants';
import { UserProfile } from '@/lib/auth-permissions';
import { findSupplierRate } from '@/lib/rateAutofill';
import { RateCard } from '@/app/actions/rate-cards';

interface Props {
  customers: any[];
  suppliers?: any[];
  rateCards?: RateCard[];
  uaeVisaTypes?: string[];
  initialData?: any;
  duplicateData?: any;
  currentUser?: UserProfile | null;
}

export default function UAEVisaForm({
  customers,
  suppliers = [],
  rateCards = [],
  uaeVisaTypes = [],
  initialData,
  duplicateData,
  currentUser,
}: Props) {
  // Available Visa Types dynamically derived from Supplier Rate Cards
  const availableVisaTypes = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    if (uaeVisaTypes && uaeVisaTypes.length > 0) {
      uaeVisaTypes.forEach((t) => {
        if (!seen.has(t)) {
          seen.add(t);
          list.push(t);
        }
      });
    } else if (rateCards && rateCards.length > 0) {
      rateCards
        .filter((r) => (r.section || 'Visa').toLowerCase() === 'visa')
        .forEach((r) => {
          if (!seen.has(r.visa_type)) {
            seen.add(r.visa_type);
            list.push(r.visa_type);
          }
        });
    }

    if (list.length === 0) {
      UAE_VISA_CATEGORIES.forEach((c) => {
        if (!seen.has(c)) {
          seen.add(c);
          list.push(c);
        }
      });
    }
    return list;
  }, [uaeVisaTypes, rateCards]);

  // Available Suppliers from DB + Rate Cards + Constants
  const availableSuppliers = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      if (s.name) set.add(s.name);
    });
    rateCards.forEach((rc) => {
      if (rc.supplier_costs && typeof rc.supplier_costs === 'object') {
        Object.keys(rc.supplier_costs).forEach((k) => set.add(k));
      }
    });
    VISA_SUPPLIERS.forEach((s) => set.add(s));
    return Array.from(set).filter(Boolean);
  }, [suppliers, rateCards]);

  const defaultHandledBy =
    initialData?.details?.handled_by ||
    duplicateData?.details?.handled_by ||
    currentUser?.fullName ||
    (currentUser?.email ? currentUser.email.split('@')[0] : '') ||
    '';

  const defaultCategory =
    initialData?.category || duplicateData?.category || availableVisaTypes[0] || 'Visit Visa (30 Days)';

  const defaultValues: UAEVisaFormValues = {
    customerId: initialData?.customer_id || duplicateData?.customer_id || '',
    isNewCustomer: false,
    status: initialData?.status || 'Open',
    category: defaultCategory,
    details: {
      visa_issued_date: initialData?.details?.visa_issued_date || duplicateData?.details?.visa_issued_date || '',
      travel_date: initialData?.details?.travel_date || duplicateData?.details?.travel_date || '',
      visa_expiry_date: initialData?.details?.visa_expiry_date || duplicateData?.details?.visa_expiry_date || '',
      visa_duration: initialData?.details?.visa_duration || duplicateData?.details?.visa_duration || '30 Days',
      visa_supplier: initialData?.details?.visa_supplier || duplicateData?.details?.visa_supplier || availableSuppliers[0] || 'AKSM',
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
    const duration = values.details?.visa_duration;

    if (category || supplier || duration) {
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
        if (match.duration) {
          setValue('details.visa_duration', match.duration, { shouldDirty: true });
        }
        if (updated) {
          toast.info(`Rates auto-filled from ${match.supplierName}: Cost ${match.cost} AED, Price ${match.price} AED`);
        }
      }
    }
  };

  return (
    <ServiceFormShell<UAEVisaFormValues>
      title="UAE Visa Record"
      icon={Shield}
      refPrefix="AE"
      redirectPath="/dashboard/uae-visa"
      schema={uaeVisaSchema}
      defaultValues={defaultValues}
      customers={customers}
      suppliers={suppliers}
      rateCards={rateCards}
      initialData={initialData}
      duplicateData={duplicateData}
      currentUser={currentUser}
      renderCategoryFields={() => (
        <UAEVisaFields
          availableVisaTypes={availableVisaTypes}
          availableSuppliers={availableSuppliers}
        />
      )}
      onAutoFill={handleAutoFill}
    />
  );
}
