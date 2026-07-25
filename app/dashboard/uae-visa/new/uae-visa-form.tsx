'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Shield, Save, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';

import { addCustomerService, updateCustomerService, generateReferenceId } from '@/app/actions/services';
import { UAE_VISA_CATEGORIES, VISA_SUPPLIERS, SERVICE_STATUSES } from '@/lib/service-constants';
import { toast } from 'sonner';
import { addCustomer } from '@/app/actions/customers';
import DocumentModal from '@/components/DocumentModal';
import { uaeVisaSchema, UAEVisaFormValues } from '@/lib/validations/serviceSchemas';
import { FormField } from '@/components/ui/form/FormField';
import { CustomerSelector } from '@/components/ui/form/CustomerSelector';
import { FinancialsSection } from '@/components/ui/form/FinancialsSection';

interface Props {
  customers: any[];
  suppliers?: any[];
  initialData?: any;
  duplicateData?: any;
}

export default function UAEVisaForm({ customers, suppliers = [], initialData, duplicateData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId') || '';

  const [isPending, startTransition] = useTransition();
  const [refId, setRefId] = useState(initialData?.reference_id || '');
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    if (!initialData) generateReferenceId('AE').then(id => setRefId(id));
  }, [initialData]);

  const methods = useForm<UAEVisaFormValues>({
    resolver: zodResolver(uaeVisaSchema) as any,
    defaultValues: {
      customerId: initialData?.customer_id || duplicateData?.customer_id || preselectedCustomerId || '',
      isNewCustomer: false,
      status: initialData?.status || 'Open',
      category: initialData?.category || duplicateData?.category || UAE_VISA_CATEGORIES[1], // 60 days
      details: {
        visa_issued_date: initialData?.details?.visa_issued_date || '',
        travel_date: initialData?.details?.travel_date || '',
        visa_expiry_date: initialData?.details?.visa_expiry_date || '',
        visa_supplier: initialData?.details?.visa_supplier || duplicateData?.details?.visa_supplier || 'DAHR',
        visa_duration: initialData?.details?.visa_duration || duplicateData?.details?.visa_duration || '60 Days',
        payment_method: initialData?.details?.payment_method || duplicateData?.details?.payment_method || 'Bank Transfer',
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
      }
    }
  });

  const categoryWatch = methods.watch('category');
  const travelDateWatch = methods.watch('details.travel_date');
  const supplierWatch = methods.watch('details.visa_supplier');

  useEffect(() => {
    if (!initialData && supplierWatch && categoryWatch && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.name === supplierWatch);
      if (supplier && Array.isArray(supplier.services)) {
        const service = supplier.services.find((s: any) => s.name === categoryWatch);
        if (service) {
          const currentCost = Number(methods.getValues('financials.supplier_cost')) || 0;
          const currentAmount = Number(methods.getValues('financials.amount')) || 0;
          
          let updated = false;
          if (currentCost === 0 && service.defaultCost) {
            methods.setValue('financials.supplier_cost', service.defaultCost, { shouldDirty: true });
            updated = true;
          }
          if (currentAmount === 0 && service.defaultPrice) {
            methods.setValue('financials.amount', service.defaultPrice, { shouldDirty: true });
            updated = true;
          }
          
          if (updated) {
            toast.info(`Rates auto-filled from ${supplierWatch}`);
          }
        }
      }
    }
  }, [supplierWatch, categoryWatch, suppliers, initialData, methods]);

  useEffect(() => {
    if ((categoryWatch === 'Visa Change by Bus' || categoryWatch === 'Visa Change by Air') && travelDateWatch) {
      const tDate = new Date(travelDateWatch);
      if (!isNaN(tDate.getTime())) {
        tDate.setDate(tDate.getDate() + 60);
        const yyyy = tDate.getFullYear();
        const mm = String(tDate.getMonth() + 1).padStart(2, '0');
        const dd = String(tDate.getDate()).padStart(2, '0');
        methods.setValue('details.visa_expiry_date', `${yyyy}-${mm}-${dd}`);
      }
    }
  }, [categoryWatch, travelDateWatch, methods]);

  const onSubmit = async (data: UAEVisaFormValues) => {
    startTransition(async () => {
      try {
        let customerId = data.customerId;

        if (data.isNewCustomer && data.newCustomer) {
          const formData = new FormData();
          formData.set('name', data.newCustomer.name);
          if (data.newCustomer.phone) formData.set('phone', data.newCustomer.phone);
          if (data.newCustomer.email) formData.set('email', data.newCustomer.email);
          if (data.newCustomer.passport_no) formData.set('passport_no', data.newCustomer.passport_no);
          formData.set('metadata', JSON.stringify({}));
          
          const res = await addCustomer(formData);
          if (res.error || !res.data) throw new Error(res.error || 'Failed to create customer');
          customerId = res.data.id;
        }

        if (!customerId) throw new Error('Customer ID is required');

        const receivingAmount = Number(data.financials.amount) - Number(data.financials.discount);
        const balance = receivingAmount - Number(data.financials.supplier_cost) - Number(data.financials.refund);

        const payload = {
          customerId,
          referenceId: refId,
          category: data.category,
          status: data.status,
          details: data.details,
          financials: {
            ...data.financials,
            receiving_amount: receivingAmount,
            balance,
          },
        };

        let res;
        if (initialData) {
          res = await updateCustomerService(initialData.id, payload);
        } else {
          res = await addCustomerService(payload);
        }

        if (res.success) {
          router.push('/dashboard/uae-visa');
          router.refresh();
        } else {
          throw new Error(res.error || 'Failed to save');
        }
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/uae-visa" className="p-2 bg-[var(--sidebar-bg)] rounded-full hover:bg-[var(--card-border)] transition-colors">
            <ArrowLeft className="w-4 h-4 opacity-70" />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-normal tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#D97757]" />
              {initialData ? 'Edit UAE Visa Record' : 'New UAE Visa Record'}
            </h1>
            <p className="text-xs opacity-50 font-mono mt-1">Ref: {refId || '...'}</p>
          </div>
        </div>

        {initialData && (
          <button 
            type="button"
            onClick={() => setShowDocs(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-lg text-sm font-medium hover:bg-[var(--card-border)] transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 opacity-70" />
            Documents
          </button>
        )}
      </div>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <div className="card-anthropic p-6">
            <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">Customer</h3>
            <CustomerSelector 
              customers={customers} 
              readOnly={!!initialData} 
              defaultCustomerName={initialData?.customers?.name || customers.find(c => c.id === methods.watch('customerId'))?.name} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="card-anthropic p-6">
                <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">Visa Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField 
                    name="category" 
                    label="Visa Type *" 
                    component="select" 
                    options={UAE_VISA_CATEGORIES.map(c => ({ label: c, value: c }))} 
                    className="col-span-2" 
                  />
                  <FormField name="details.visa_issued_date" label="Issue Date" type="date" />
                  <FormField name="details.travel_date" label="Travel Date" type="date" />
                  <FormField name="details.visa_expiry_date" label="Expiry Date" type="date" />
                  <FormField name="details.visa_duration" label="Duration" component="select" options={[{label: '30 Days', value: '30 Days'}, {label: '60 Days', value: '60 Days'}, {label: '90 Days', value: '90 Days'}]} />
                  <FormField name="details.visa_supplier" label="Supplier" component="select" options={VISA_SUPPLIERS.map(s => ({label: s, value: s}))} />
                  <FormField name="status" label="Status" component="select" options={SERVICE_STATUSES.map(s => ({label: s, value: s}))} />
                </div>
              </div>

              <div className="card-anthropic p-6">
                <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">Additional Info</h3>
                <div className="space-y-4">
                  <FormField name="details.referred_by" label="Referred By (B2B/Agent)" />
                  <FormField name="details.comments" label="Comments" component="textarea" />
                  <FormField name="details.remark" label="Admin Remark (Private)" component="textarea" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <FinancialsSection />
              
              <div className="card-anthropic p-6 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 px-4 bg-[#D97757] hover:bg-[#c26243] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Visa Record</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full py-3 px-4 bg-transparent border border-[var(--card-border)] hover:bg-[var(--sidebar-bg)] rounded-lg font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>

      {initialData && showDocs && (
        <DocumentModal
          isOpen={showDocs}
          onClose={() => setShowDocs(false)}
          serviceId={initialData.id}
          customerId={initialData.customer_id}
          customerName={initialData.customers?.name || 'Customer'}
        />
      )}
    </div>
  );
}
