'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save, Loader2, FileText, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ZodType } from 'zod';

import { addCustomerService, updateCustomerService, generateReferenceId } from '@/app/actions/services';
import { addCustomer } from '@/app/actions/customers';
import DocumentModal from '@/components/DocumentModal';
import { CustomerSelector } from '@/components/ui/form/CustomerSelector';
import { FinancialsSection } from '@/components/ui/form/FinancialsSection';
import { StaffAdditionalInfoFields } from './fields/StaffAdditionalInfoFields';
import { UserProfile } from '@/lib/auth-permissions';
import { RateCard } from '@/app/actions/rate-cards';

export interface ServiceFormShellProps<T extends Record<string, any>> {
  title: string;
  icon: LucideIcon;
  refPrefix: string;
  redirectPath: string;
  schema: ZodType<T, any, any>;
  defaultValues: T;
  customers: any[];
  suppliers?: any[];
  rateCards?: RateCard[];
  initialData?: any;
  duplicateData?: any;
  currentUser?: UserProfile | null;
  renderCategoryFields: (methods: UseFormReturn<T>) => React.ReactNode;
  onAutoFill?: (watchedValues: any, setValue: UseFormReturn<T>['setValue']) => void;
}

export function ServiceFormShell<T extends Record<string, any>>({
  title,
  icon: Icon,
  refPrefix,
  redirectPath,
  schema,
  defaultValues,
  customers,
  suppliers = [],
  rateCards = [],
  initialData,
  duplicateData,
  currentUser,
  renderCategoryFields,
  onAutoFill,
}: ServiceFormShellProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId') || '';

  const [saving, setSaving] = useState(false);
  const [refId, setRefId] = useState(initialData?.reference_id || '');
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    if (!initialData) {
      generateReferenceId(refPrefix).then((id) => setRefId(id));
    }
  }, [initialData, refPrefix]);

  const methods = useForm<T>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      ...defaultValues,
      customerId:
        initialData?.customer_id ||
        duplicateData?.customer_id ||
        preselectedCustomerId ||
        (defaultValues as any).customerId ||
        '',
    } as any,
  });

  // Execute module-specific auto-fill only when non-financial trigger fields change
  useEffect(() => {
    if (!initialData && onAutoFill) {
      const subscription = methods.watch((values, { name }) => {
        // If the user is modifying financials or free-text fields directly, do not re-trigger autofill
        if (
          name &&
          (name.startsWith('financials.') ||
            name.startsWith('details.comments') ||
            name.startsWith('details.remark') ||
            name.startsWith('details.travel_date') ||
            name.startsWith('details.visa_issued_date') ||
            name.startsWith('details.visa_expiry_date') ||
            name.startsWith('details.ticket_no') ||
            name.startsWith('details.pnr'))
        ) {
          return;
        }
        onAutoFill(values, methods.setValue);
      });
      return () => subscription.unsubscribe();
    }
  }, [methods, initialData, onAutoFill]);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      let customerId = data.customerId;

      // Inline new customer creation
      if (data.isNewCustomer && data.newCustomer) {
        const formData = new FormData();
        formData.set('name', data.newCustomer.name);
        if (data.newCustomer.phone) formData.set('phone', data.newCustomer.phone);
        if (data.newCustomer.email) formData.set('email', data.newCustomer.email);
        if (data.newCustomer.passport_no) formData.set('passport_no', data.newCustomer.passport_no);
        formData.set('metadata', JSON.stringify({}));

        const res = await addCustomer(formData);
        if (res.error || !res.data) {
          throw new Error(res.error || 'Failed to create customer');
        }
        customerId = res.data.id;
      }

      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const receivingAmount = Number(data.financials?.amount || 0) - Number(data.financials?.discount || 0);
      const balance = receivingAmount - Number(data.financials?.supplier_cost || 0) - Number(data.financials?.refund || 0);

      const payload = {
        customerId,
        referenceId: refId,
        category: data.category,
        status: data.status || 'Open',
        details: data.details || {},
        financials: {
          ...(data.financials || {}),
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
        toast.success(initialData ? 'Record updated successfully' : 'Record created successfully');
        router.push(redirectPath);
        router.refresh();
      } else {
        throw new Error(res.error || 'Failed to save record');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={redirectPath}
            className="p-2 bg-[var(--sidebar-bg)] rounded-full hover:bg-[var(--card-border)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 opacity-70" />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-normal tracking-tight flex items-center gap-2">
              <Icon className="w-5 h-5 text-[#D97757]" />
              {initialData ? `Edit ${title}` : `New ${title}`}
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
          {/* Customer Selection Card */}
          <div className="card-anthropic p-6">
            <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">
              Customer
            </h3>
            <CustomerSelector
              customers={customers}
              readOnly={!!initialData}
              defaultCustomerName={
                initialData?.customers?.name ||
                customers.find((c) => c.id === methods.watch('customerId' as any))?.name
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Category Specific Details + Staff Info */}
            <div className="md:col-span-2 space-y-6">
              {renderCategoryFields(methods)}
              <StaffAdditionalInfoFields />
            </div>

            {/* Right Column: Financials + Submit */}
            <div className="space-y-6">
              <FinancialsSection />

              <div className="card-anthropic p-6 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 px-4 bg-[#D97757] hover:bg-[#c26243] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> {initialData ? 'Update Record' : 'Save Record'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>

      {/* Document Modal */}
      {initialData && (
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
