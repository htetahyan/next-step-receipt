'use client';

import React from 'react';
import { Wrench } from 'lucide-react';
import { customServiceSchema, CustomServiceFormValues } from '@/lib/validations/serviceSchemas';
import { ServiceFormShell } from '@/components/services/ServiceFormShell';
import { CustomServiceFields } from '@/components/services/fields/CustomServiceFields';
import { UserProfile } from '@/lib/auth-permissions';

interface Props {
  customers: any[];
  suppliers?: any[];
  initialData?: any;
  currentUser?: UserProfile | null;
}

export default function CustomServiceForm({
  customers,
  suppliers = [],
  initialData,
  currentUser,
}: Props) {
  const defaultHandledBy =
    initialData?.details?.handled_by ||
    currentUser?.fullName ||
    (currentUser?.email ? currentUser.email.split('@')[0] : '') ||
    '';

  const defaultValues: CustomServiceFormValues = {
    customerId: initialData?.customer_id || '',
    isNewCustomer: false,
    newCustomer: null,
    status: initialData?.status || 'Open',
    category: initialData?.category || '',
    details: {
      description: initialData?.details?.description || '',
      supplier_name: initialData?.details?.supplier_name || '',
      start_date: initialData?.details?.start_date || '',
      end_date: initialData?.details?.end_date || '',
      reference_number: initialData?.details?.reference_number || '',
      travel_date: initialData?.details?.travel_date || '',
      handled_by: defaultHandledBy,
      referred_by: initialData?.details?.referred_by || '',
      comments: initialData?.details?.comments || '',
      remark: initialData?.details?.remark || '',
    },
    financials: {
      amount: initialData?.financials?.amount || 0,
      discount: initialData?.financials?.discount || 0,
      supplier_cost: initialData?.financials?.supplier_cost || 0,
      refund: initialData?.financials?.refund || 0,
      payment_method: initialData?.financials?.payment_method || 'Bank Transfer',
    },
  };

  return (
    <ServiceFormShell<CustomServiceFormValues>
      title="Custom Service"
      icon={Wrench}
      refPrefix="CS"
      redirectPath="/dashboard/custom-service"
      schema={customServiceSchema}
      defaultValues={defaultValues}
      customers={customers}
      suppliers={suppliers}
      initialData={initialData}
      currentUser={currentUser}
      renderCategoryFields={() => (
        <CustomServiceFields suppliers={suppliers} />
      )}
    />
  );
}
