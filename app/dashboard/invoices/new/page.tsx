'use client'

import React, { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Plus, Trash2, Download, Image as ImageIcon, Loader2, Calendar } from 'lucide-react';
import InvoiceTemplate, { InvoiceData } from '@/components/InvoiceTemplate';
import { createClient } from '@/utils/supabase/client';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { getSettings } from '@/app/actions/settings';
import CustomerAutocomplete from '@/components/CustomerAutocomplete';

export default function NewInvoicePage() {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const { register, control, watch, handleSubmit, setValue } = useForm<InvoiceData>({
    defaultValues: {
      invoiceNumber: `Next - 01/26`,
      date: format(new Date(), 'dd-MM-yyyy'),
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      items: [
        { id: '1', description: '', quantity: 1, rate: 0, amount: 0 }
      ],
      paymentMethod: 'Cash',
      vatRate: 5,
      isVatExempt: true
    }
  });

  const handleCustomerSelect = (customer: any) => {
    setValue('customerName', customer.name);
    if (customer.id) {
       setSelectedCustomerId(customer.id);
       setValue('customerEmail', customer.email || '');
       setValue('customerPhone', customer.phone || '');
    } else {
       setSelectedCustomerId(null);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      const data = await getSettings();
      if (data) setSettings(data);
    }
    loadSettings();
  }, []);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  // Suggest invoice number
  useEffect(() => {
    const fetchLastInvoice = async () => {
      // Query for the most recent invoice number explicitly
      const { data } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastNo = data[0].invoice_number;
        // Regex to extract the number and the year (e.g., from 'Next - 01/26')
        const match = lastNo.match(/Next\s*-\s*(\d+)\/(\d+)/) || lastNo.match(/(\d+)\/(\d+)/);
        
        if (match) {
          const nextVal = parseInt(match[1]) + 1;
          const yearSuffix = match[2];
          const paddedVal = String(nextVal).padStart(2, '0');
          setValue('invoiceNumber', `Next - ${paddedVal}/${yearSuffix}`);
        }
      }
    };
    fetchLastInvoice();
  }, [supabase, setValue]);

  const watchItems = watch('items') || [];
  const watchVatRate = watch('vatRate') || 0;
  const watchIsVatExempt = watch('isVatExempt') || false;
  
  // Calculate totals
  const subtotal = watchItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.rate) || 0), 0);
  const vatAmount = watchIsVatExempt ? 0 : subtotal * (Number(watchVatRate) / 100);
  const totalAmount = subtotal + vatAmount;

  // We need to compile the data to pass to the preview
  const data: InvoiceData = {
    ...watch(),
    subtotal,
    vatAmount,
    totalAmount,
    companyName: settings?.company_name,
    companyAddress: settings?.company_address,
    bankName: settings?.bank_name,
    bankBranch: settings?.bank_branch,
    bankIban: settings?.bank_iban,
    bankAccountNo: settings?.bank_account_no,
  };

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      const element = invoiceRef.current;
      
      // Sanitizing filename (Windows does not allow / in filenames)
      const sanitizedNo = (data.invoiceNumber || 'invoice').replace(/[/\\?%*:|"<>]/g, '-');
      
      const imgData = await toPng(element, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (1131 * pdfWidth) / 800;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${sanitizedNo}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error generating PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    try {
      const { toPng } = await import('html-to-image');
      const element = invoiceRef.current;
      const sanitizedNo = (data.invoiceNumber || 'invoice').replace(/[/\\?%*:|"<>]/g, '-');
      
      const imgData = await toPng(element, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const link = document.createElement('a');
      link.download = `${sanitizedNo}.png`;
      link.href = imgData;
      link.click();
    } catch (e) {
      console.error(e);
      alert('Error generating Image');
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (formData: InvoiceData) => {
    setIsSaving(true);
    try {
       let customerId = selectedCustomerId;

       // If new customer, create first
       if (!customerId) {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert([{
               name: formData.customerName,
               email: formData.customerEmail,
               phone: formData.customerPhone
            }])
            .select()
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
       }

       // Create Invoice
       const { data: invoice, error: invoiceError } = await supabase
         .from('invoices')
         .insert([{
            customer_id: customerId,
            invoice_number: formData.invoiceNumber,
            date: format(new Date(), 'yyyy-MM-dd'),
            subtotal: subtotal,
            vat_amount: vatAmount,
            total_amount: totalAmount,
            payment_method: (formData.paymentMethod || 'cash').toLowerCase()
         }])
         .select()
         .single();

       if (invoiceError) throw invoiceError;

       // Create Invoice Items
       const invoiceItems = formData.items.map(item => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: Number(item.quantity) * Number(item.rate)
       }));

       const { error: itemsError } = await supabase
         .from('invoice_items')
         .insert(invoiceItems);

       if (itemsError) throw itemsError;

       alert('Invoice saved successfully!');
       router.push('/dashboard/invoices');
    } catch (e: any) {
       console.error(e);
       alert(e.message || 'Error saving invoice');
    } finally {
       setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Form Sidebar */}
      <div className="w-[450px] flex-shrink-0 flex flex-col bg-white border border-[#e2e8f0] rounded-xl shadow-sm dark:bg-[#0f172a] dark:border-[#1e293b] overflow-y-auto">
        <div className="p-6 border-b border-[#e2e8f0] dark:border-[#1e293b]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Invoice</h2>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 flex-1">
          {/* General Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Invoice Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Invoice NO.</label>
                <input {...register('invoiceNumber')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <div className="relative">
                      <ReactDatePicker
                        className="w-full rounded-md border border-slate-300 pl-10 pr-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
                        onChange={(date: Date | null) => field.onChange(date ? format(date, 'dd-MM-yyyy') : '')}
                        selected={field.value ? new Date(field.value.split('-').reverse().join('-')) : null}
                        dateFormat="dd-MM-yyyy"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                />
              </div>
            </div>
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Payment Method</label>
                <select {...register('paymentMethod')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700">
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Tabby">Tabby</option>
                </select>
              </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* VAT Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">VAT Settings</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">VAT Rate (%)</label>
                <input 
                  type="number" 
                  {...register('vatRate')} 
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50" 
                  disabled={watchIsVatExempt}
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="vatExempt"
                  {...register('isVatExempt')} 
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:bg-slate-800 dark:border-slate-700" 
                />
                <label htmlFor="vatExempt" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  VAT Exempt
                </label>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Customer Details</h3>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
              <CustomerAutocomplete 
                onSelect={handleCustomerSelect} 
                defaultValue={watch('customerName')}
                name="customerName"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <input {...register('customerEmail')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                <input {...register('customerPhone')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700" />
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Line Items</h3>
              <button 
                type="button" 
                onClick={() => append({ id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 })}
                className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="relative p-3 border border-slate-200 rounded-lg dark:border-slate-700">
                  <button type="button" onClick={() => remove(index)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500">
                     <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                    <input {...register(`items.${index}.description`)} className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:bg-slate-800 dark:border-slate-700" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                      <input type="number" {...register(`items.${index}.quantity`)} className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:bg-slate-800 dark:border-slate-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Rate</label>
                      <input type="number" {...register(`items.${index}.rate`)} className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:bg-slate-800 dark:border-slate-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-[#e2e8f0] dark:border-[#1e293b] flex flex-col gap-3">
          <button 
            type="button" 
            onClick={handleSubmit(onSubmit)} 
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : null}
            {isSaving ? 'Saving...' : 'Save Invoice'}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button" 
              disabled={isGenerating}
              onClick={handleDownloadPdf} 
              className="flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-lg transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Download className="w-4 h-4" /> {isGenerating ? 'Wait...' : 'PDF'}
            </button>
            <button 
              type="button" 
              disabled={isGenerating}
              onClick={handleDownloadImage} 
              className="flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-lg transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ImageIcon className="w-4 h-4" /> {isGenerating ? 'Wait...' : 'Image'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="flex-1 overflow-auto bg-gray-200/50 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] dark:bg-slate-900 flex items-start justify-center p-8">
         <div className="shadow-2xl scale-[0.5] sm:scale-[0.6] xl:scale-75 transform origin-top mb-16">
            <InvoiceTemplate 
              ref={invoiceRef} 
              data={{
                 ...data,
                 items: data.items.map(item => ({
                   ...item,
                   amount: Number(item.quantity) * Number(item.rate)
                 }))
              }} 
            />
         </div>
      </div>
    </div>
  );
}
