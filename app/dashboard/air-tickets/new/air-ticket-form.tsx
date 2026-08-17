'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plane, Save, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';

import { addCustomerService, updateCustomerService, generateReferenceId } from '@/app/actions/services';
import { SERVICE_STATUSES } from '@/lib/service-constants';
import { toast } from 'sonner';
import { addCustomer } from '@/app/actions/customers';
import DocumentModal from '@/components/DocumentModal';
import { airTicketSchema, AirTicketFormValues } from '@/lib/validations/serviceSchemas';
import { FormField } from '@/components/ui/form/FormField';
import { CustomerSelector } from '@/components/ui/form/CustomerSelector';
import { FinancialsSection } from '@/components/ui/form/FinancialsSection';

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

export default function AirTicketForm({ customers, suppliers = [], rateCards = [], initialData, duplicateData, currentUser }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId') || '';
  const [saving, setSaving] = useState(false);
  const [refId, setRefId] = useState(initialData?.reference_id || '');
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    if (!initialData) generateReferenceId('AT').then(id => setRefId(id));
  }, [initialData]);

  const defaultHandledBy = initialData?.details?.handled_by || duplicateData?.details?.handled_by || currentUser?.fullName || (currentUser?.email ? currentUser.email.split('@')[0] : '') || '';

  const methods = useForm<AirTicketFormValues>({
    resolver: zodResolver(airTicketSchema) as any,
    defaultValues: {
      customerId: initialData?.customer_id || duplicateData?.customer_id || preselectedCustomerId || '',
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
      }
    }
  });

  const categoryWatch = methods.watch('category');
  const airlineWatch = methods.watch('details.airline');

  useEffect(() => {
    if (!initialData && (airlineWatch || categoryWatch)) {
      const match = findSupplierRate(suppliers, airlineWatch, categoryWatch, rateCards);
      if (match) {
        let updated = false;
        if (match.cost > 0) {
          methods.setValue('financials.supplier_cost', match.cost, { shouldDirty: true });
          updated = true;
        }
        if (match.price > 0) {
          methods.setValue('financials.amount', match.price, { shouldDirty: true });
          updated = true;
        }
        if (updated) {
          toast.info(`Rates auto-filled from ${match.supplierName}: Cost ${match.cost} AED, Price ${match.price} AED`);
        }
      }
    }
  }, [airlineWatch, categoryWatch, suppliers, rateCards, initialData, methods]);

  const onSubmit = async (data: AirTicketFormValues) => {
    setSaving(true);
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
        router.push('/dashboard/air-tickets');
        router.refresh();
      } else {
        throw new Error(res.error || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tripType = categoryWatch;

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/air-tickets" className="p-2 bg-[var(--sidebar-bg)] rounded-full hover:bg-[var(--card-border)] transition-colors">
            <ArrowLeft className="w-4 h-4 opacity-70" />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-normal tracking-tight flex items-center gap-2">
              <Plane className="w-5 h-5 text-[#D97757]" />
              {initialData ? 'Edit Air Ticket Record' : 'New Air Ticket Record'}
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
                <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">Ticket Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField 
                    name="category" 
                    label="Trip Type *" 
                    component="select" 
                    options={[
                      { label: 'One Way', value: 'One Way' },
                      { label: 'Round Trip', value: 'Round Trip' },
                      { label: 'Multi City', value: 'Multi City' }
                    ]} 
                    className="col-span-2" 
                  />
                  <FormField name="details.airline" label="Airline" />
                  <FormField name="details.sector" label="Sector (e.g. DXB-LHR)" />
                  <FormField name="details.pnr" label="PNR / Booking Ref" />
                  <FormField name="details.ticket_no" label="Ticket Number" />
                  <FormField name="details.travel_date" label="Departure Date" type="date" />
                  {(tripType === 'Round Trip' || tripType === 'Multi City') && (
                    <FormField name="details.return_date" label="Return/Next Date" type="date" />
                  )}
                  <FormField name="status" label="Status" component="select" options={SERVICE_STATUSES.map(s => ({label: s, value: s}))} className="col-span-2" />
                </div>
              </div>

              <div className="card-anthropic p-6">
                <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">Staff & Additional Info</h3>
                <div className="space-y-4">
                  <FormField name="details.handled_by" label="Handled By / Served By (Staff)" placeholder="e.g. Staff Name" />
                  <FormField name="details.referred_by" label="Referred By (B2B/Agent)" placeholder="e.g. Agent Name" />
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
                  disabled={saving}
                  className="w-full py-3 px-4 bg-[#D97757] hover:bg-[#c26243] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Ticket Record</>
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
