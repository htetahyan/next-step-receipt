'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { addCustomerService } from '@/app/actions/services';
import { uploadFiles } from '@/utils/uploadthing';
import { Loader2, UploadCloud, File, X, Plane, Building, Stamp } from 'lucide-react';
import { toast } from 'sonner';

import { SERVICE_CATEGORIES } from '@/lib/service-constants';

const CATEGORIES = [...SERVICE_CATEGORIES];

export default function NewServiceForm() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customerId');
  const router = useRouter();
  
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      
      // 1. Upload files to UploadThing if any
      const uploadedDocs: any[] = [];
      if (files.length > 0) {
        const uploadRes = await uploadFiles("customerDocument", {
          files: files,
        });

        if (uploadRes) {
          uploadRes.forEach(uploadedFile => {
            uploadedDocs.push({
              title: uploadedFile.name,
              file_url: uploadedFile.url,
              file_key: uploadedFile.key,
              tag: category
            });
          });
        }
      }

      // 2. Prepare database payload (matching Google Sheets structure)
      const data = {
        customerId: customerId,
        category: category,
        status: 'Open',
        details: {
          monthly_count: formData.get('monthly_count') || '',
          mode_of_visa: formData.get('mode_of_visa') || category,
          visa_issued_date: formData.get('visa_issued_date') || '',
          travel_date: formData.get('travel_date') || formData.get('departure_date') || '',
          departure_time: formData.get('departure_time') || '',
          destination: formData.get('destination') || '',
          hotel_name: formData.get('hotel_name') || '',
          check_in: formData.get('check_in') || '',
          check_out: formData.get('check_out') || '',
          visa_expiry_date: (() => {
            const travelDateStr = formData.get('travel_date') || formData.get('departure_date') || '';
            const isBusOrAirChange = category === 'Visa Change by Bus' || category === 'Visa Change by Air';
            if (isBusOrAirChange && travelDateStr) {
              const tDate = new Date(String(travelDateStr));
              if (!isNaN(tDate.getTime())) {
                tDate.setDate(tDate.getDate() + 60);
                const yyyy = tDate.getFullYear();
                const mm = String(tDate.getMonth() + 1).padStart(2, '0');
                const dd = String(tDate.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
              }
            }
            return formData.get('visa_expiry_date') || '';
          })(),
          visa_supplier: formData.get('visa_supplier') || '',
          visa_duration: formData.get('visa_duration') || '',
          handled_by: formData.get('handled_by') || '',
          referred_by: formData.get('referred_by') || '',
          remark: formData.get('remark') || '',
          comments: formData.get('comments') || '',
          documents: uploadedDocs
        },
        financials: {
          amount: Number(formData.get('amount') || 0),
          discount_agent_fees: Number(formData.get('discount_agent_fees') || 0),
          receiving_amount: Number(formData.get('receiving_amount') || 0),
          visa_fees_to_supplier: Number(formData.get('visa_fees_to_supplier') || 0),
          refund: formData.get('refund') || '',
          payment_method: formData.get('payment_method') || 'Cash',
          balance: formData.get('balance') || ''
        }
      };

      const res = await addCustomerService(data);
      if (res.success) {
        router.push(`/dashboard/customers/${customerId}`);
      } else {
        toast.error(res.error);
        setLoading(false);
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
      setLoading(false);
    }
  }

  if (!customerId) return <div className="text-center py-8 text-slate-500">Missing Customer ID. Please return to the Customer Hub.</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-[var(--sidebar-bg)] p-8 rounded-xl border border-[var(--card-border)]">
      
      <div>
        <label className="block text-sm font-medium mb-2 opacity-70">Service Category</label>
        <select 
          value={category} 
          onChange={e => setCategory(e.target.value)}
          className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="border-t border-[var(--card-border)] pt-8">
         <h3 className="font-serif text-lg mb-6 flex items-center gap-2">
            {category === 'Flight Booking' ? <Plane className="w-5 h-5 text-[#D97757]" /> : 
             category === 'Hotel Booking' ? <Building className="w-5 h-5 text-[#D97757]" /> : 
             <Stamp className="w-5 h-5 text-[#D97757]" />}
            Service Details
         </h3>
         
         {category === 'Flight Booking' ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-medium mb-2 opacity-70">Destination / Routing</label>
                 <input name="destination" placeholder="e.g. RGN-BKK-DXB" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium uppercase" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-2 opacity-70">Departure Date</label>
                 <input name="departure_date" type="date" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-2 opacity-70">Departure Time</label>
                 <input name="departure_time" type="time" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
              </div>
           </div>
         ) : category === 'Hotel Booking' ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-medium mb-2 opacity-70">Hotel Name / Location</label>
                 <input name="hotel_name" placeholder="e.g. JVC Room" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-2 opacity-70">Check-in Date</label>
                 <input name="check_in" type="date" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-2 opacity-70">Check-out Date</label>
                 <input name="check_out" type="date" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
              </div>
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-medium mb-2 opacity-70">Mode of Visa / Extension</label>
                 <input name="mode_of_visa" defaultValue={category} className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-2 opacity-70">Visa Supplier</label>
                 <input name="visa_supplier" placeholder="e.g. DAHR" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-2 opacity-70">Visa Duration</label>
                 <input name="visa_duration" placeholder="e.g. 60 Days" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-2 opacity-70">Monthly Count (Label)</label>
                 <input name="monthly_count" placeholder="e.g. Nov/2025" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
              </div>
           </div>
         )}
      </div>

      <div className="border-t border-[var(--card-border)] pt-8">
         <h3 className="font-serif text-lg mb-6">Important Dates</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
               <label className="block text-sm font-medium mb-2 opacity-70">Visa Issued Date</label>
               <input name="visa_issued_date" type="date" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
            </div>
            <div>
               <label className="block text-sm font-medium mb-2 opacity-70">Travel Date</label>
               <input name="travel_date" type="date" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
            </div>
            <div>
               <label className="block text-sm font-medium mb-2 opacity-70">Visa Expiry Date</label>
               <input name="visa_expiry_date" type="date" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
            </div>
         </div>
      </div>

      <div className="border-t border-[var(--card-border)] pt-8">
         <h3 className="font-serif text-lg mb-6">Financials (Auto-generates Invoice)</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
               <label className="block text-sm font-medium mb-2 opacity-70">Amount (AED)</label>
               <input name="amount" type="number" required defaultValue="0" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-mono" />
            </div>
            <div>
               <label className="block text-sm font-medium mb-2 opacity-70">Discount / Agent Fees</label>
               <input name="discount_agent_fees" type="number" defaultValue="0" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-mono" />
            </div>
            <div>
               <label className="block text-sm font-medium mb-2 opacity-70">Receiving Amount</label>
               <input name="receiving_amount" type="number" defaultValue="0" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-mono" />
            </div>
            <div>
               <label className="block text-sm font-medium mb-2 opacity-70">Visa Fees to Supplier</label>
               <input name="visa_fees_to_supplier" type="number" defaultValue="0" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-mono" />
            </div>
            <div>
               <label className="block text-sm font-medium mb-2 opacity-70">Refund</label>
               <input name="refund" placeholder="e.g. 40 AED" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-mono" />
            </div>
            <div>
               <label className="block text-sm font-medium mb-2 opacity-70">Balance</label>
               <input name="balance" placeholder="e.g. Deposit 1000 AED" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-mono" />
            </div>
            <div>
               <label className="block text-sm font-medium mb-2 opacity-70">Payment Method</label>
               <select name="payment_method" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Kpay">Kpay</option>
                  <option value="FOC">FOC</option>
                  <option value="Company Account">Company Account</option>
                  <option value="Other">Other</option>
               </select>
            </div>
         </div>
      </div>

      <div className="border-t border-[var(--card-border)] pt-8">
         <h3 className="font-serif text-lg mb-6">Additional Information</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-medium mb-2 opacity-70">Handled By (Staff)</label>
                <input name="handled_by" placeholder="e.g. Staff Name" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
             </div>
             <div>
                <label className="block text-sm font-medium mb-2 opacity-70">Referred By (Agent)</label>
                <input name="referred_by" placeholder="e.g. Agent Name" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
             </div>
             <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 opacity-70">Remark</label>
                <input name="remark" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
             </div>
            <div className="md:col-span-2">
               <label className="block text-sm font-medium mb-2 opacity-70">Comments</label>
               <input name="comments" className="w-full rounded-md border border-[var(--card-border)] p-3 bg-[var(--background)] font-medium" />
            </div>
         </div>
      </div>

      <div className="border-t border-[var(--card-border)] pt-8">
         <h3 className="font-serif text-lg mb-6 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 opacity-70" /> Attach Documents
         </h3>
         <div className="border border-dashed border-[var(--card-border)] rounded-md p-8 text-center hover:bg-[var(--card-border)] transition-colors">
            <input type="file" multiple onChange={handleFileChange} className="hidden" id="doc-upload" />
            <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center gap-2">
               <UploadCloud className="w-8 h-8 opacity-40" />
               <span className="text-sm font-medium hover:underline text-[#D97757]">Click to browse</span>
               <span className="text-xs opacity-50">Upload passport copies, photos, visas (PDF, JPG) up to 10 files</span>
            </label>
         </div>
         {files.length > 0 && (
           <div className="mt-4 space-y-2">
             {files.map((f, i) => (
               <div key={i} className="flex items-center justify-between p-3 bg-[var(--background)] rounded border border-[var(--card-border)]">
                 <div className="flex items-center gap-3">
                   <File className="w-4 h-4 opacity-50" />
                   <span className="text-sm font-medium truncate max-w-[200px]">{f.name}</span>
                 </div>
                 <button type="button" onClick={() => removeFile(i)} className="opacity-50 hover:text-red-500 hover:opacity-100 p-1 transition-all">
                   <X className="w-4 h-4" />
                 </button>
               </div>
             ))}
           </div>
         )}
      </div>

      <button disabled={loading} type="submit" className="w-full py-4 bg-[#D97757] text-[#F5F4EF] rounded-md font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-2 mt-8">
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        {loading ? 'Processing & Uploading...' : 'Save Service & Generate Invoice'}
      </button>
    </form>
  );
}
