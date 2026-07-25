'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addCustomerService } from '@/app/actions/services';
import { getPresignedUrl } from '@/app/actions/r2';
import { addDocument } from '@/app/actions/documents';
import { createClient } from '@/utils/supabase/client';
import { getSuppliers } from '@/app/actions/suppliers';
import { Loader2, UploadCloud, File, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'Passport Renew',
  'UAE Visit Visa',
  'Visa Extension B2B',
  'Visa Extension A2A',
  'Inside Visa',
  'Flight Service',
  'Other'
];

interface NewServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerMetadata?: any;
}

export default function NewServiceDialog({ isOpen, onClose, customerId, customerName, customerMetadata }: NewServiceDialogProps) {
  const router = useRouter();
  const supabase = createClient();

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // Suppliers & Prefill States
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [amount, setAmount] = useState('0');
  const [supplierCost, setSupplierCost] = useState('0');

  useEffect(() => {
    if (isOpen) {
      getSuppliers().then(res => {
        if (res.success && res.data) {
          setSuppliers(res.data);
        }
      });
    }
  }, [isOpen]);

  const activeSupplier = suppliers.find(s => s.id === selectedSupplierId);

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    if (!supplierId) {
      setAmount('0');
      setSupplierCost('0');
    } else {
      const s = suppliers.find(x => x.id === supplierId);
      if (s && s.services && s.services.length > 0) {
        // Automatically default to the first supplied service if available
        const srv = s.services[0];
        setCategory(CATEGORIES.includes(srv.serviceName) ? srv.serviceName : 'Other');
        if (!CATEGORIES.includes(srv.serviceName)) {
          setCustomCategory(srv.serviceName);
        }
        setAmount(String(srv.defaultPrice || 0));
        setSupplierCost(String(srv.defaultCost || 0));
      }
    }
  };

  const handleSupplierServiceChange = (serviceIdx: number) => {
    if (activeSupplier && activeSupplier.services && activeSupplier.services[serviceIdx]) {
      const srv = activeSupplier.services[serviceIdx];
      setCategory(CATEGORIES.includes(srv.serviceName) ? srv.serviceName : 'Other');
      if (!CATEGORIES.includes(srv.serviceName)) {
        setCustomCategory(srv.serviceName);
      }
      setAmount(String(srv.defaultPrice || 0));
      setSupplierCost(String(srv.defaultCost || 0));
    }
  };

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

      // 1. Upload files to Cloudflare R2 if any
      const uploadedDocs = [];
      if (files.length > 0) {
        for (const file of files) {
          const presignedRes = await getPresignedUrl(file.name, file.type);
          if (presignedRes.success && presignedRes.uploadUrl) {
            const uploadRes = await fetch(presignedRes.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type,
              },
            });
            if (uploadRes.ok) {
              uploadedDocs.push({
                title: file.name,
                file_url: presignedRes.publicUrl,
                file_key: presignedRes.fileKey,
                tag: category
              });
            } else {
              console.error("Failed to upload to R2:", uploadRes.statusText);
            }
          } else {
            console.error("Failed to get presigned URL:", presignedRes.error);
          }
        }
      }

      // 2. Prepare database payload
      const finalCategory = category === 'Other' ? (customCategory || 'Other Service') : category;
      const numAmount = Number(amount || 0);
      const numCost = Number(supplierCost || 0);

      const data = {
        customerId: customerId,
        category: finalCategory,
        status: 'Open',
        details: {
          travel_date: formData.get('travel_date'),
          passport_expiry: formData.get('passport_expiry'),
          notes: formData.get('notes'),
          documents: uploadedDocs, // Save document references in the service JSON
          visa_supplier: activeSupplier?.name || null,
        },
        financials: {
          amount: numAmount,
          discount: 0,
          receiving_amount: numAmount,
          supplier_cost: numCost,
          refund: 0,
          balance: numAmount - numCost,
        }
      };

      const res = await addCustomerService(data);
      if (res.success) {
        const createdService = res.data;
        if (createdService && uploadedDocs.length > 0) {
          for (const doc of uploadedDocs) {
            await addDocument({
              customerId: customerId,
              serviceId: createdService.id,
              title: doc.title,
              file_url: doc.file_url!,
              file_key: doc.file_key!,
              tag: finalCategory
            });
          }
        }
        onClose();
        router.refresh(); // Refresh the page to show the new service
      } else {
        toast.error(res.error);
        setLoading(false);
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container max-w-2xl max-h-[90vh] scale-in-center" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between flex-shrink-0 bg-[var(--sidebar-bg)]">
          <div>
            <h3 className="text-xl font-serif text-[var(--foreground)] flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#D97757]" />
              Add New Service
            </h3>
            <p className="text-sm opacity-60 mt-1">For {customerName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--card-border)] rounded-full transition-colors">
            <X className="h-6 w-6 opacity-50" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 opacity-70">Service Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="input-anthropic w-full p-3 font-medium"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {category === 'Other' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium mb-2 opacity-70">Custom Service Name</label>
                  <input 
                    required 
                    value={customCategory} 
                    onChange={e => setCustomCategory(e.target.value)} 
                    placeholder="e.g. Translation Service, Attestation" 
                    className="input-anthropic w-full p-3 font-medium border-[#D97757]/30 focus:border-[#D97757]" 
                  />
                </div>
              )}
            </div>

            {/* Dynamic Fields */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 opacity-70">Travel Date (if applicable)</label>
                <input name="travel_date" type="date" className="input-anthropic w-full p-3 font-medium" />
              </div>
              <div>
                 <label className="block text-sm font-medium mb-2 opacity-70">Passport Expiry</label>
                 <input 
                   name="passport_expiry" 
                   type="date" 
                   defaultValue={customerMetadata?.expiry_date || ''}
                   className="input-anthropic w-full p-3 font-medium" 
                 />
              </div>
            </div>

            <div>
               <label className="block text-sm font-medium mb-2 opacity-70">Notes / Specifics</label>
               <input name="notes" placeholder="Any specific requirements" className="input-anthropic w-full p-3 font-medium" />
            </div>

            <div className="border-t border-[var(--card-border)] pt-6">
               <h3 className="font-serif text-lg mb-4 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 opacity-70" /> Attach Documents
               </h3>
               <div className="border border-dashed border-[var(--card-border)] rounded-md p-8 text-center hover:bg-[var(--sidebar-bg)] transition-colors">
                  <input type="file" multiple onChange={handleFileChange} className="hidden" id="doc-upload" />
                  <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center gap-2">
                     <UploadCloud className="w-8 h-8 opacity-40" />
                     <span className="text-sm font-medium hover:underline text-[#D97757]">Click to browse</span>
                     <span className="text-xs opacity-50">Upload passport copies, photos, visas (PDF, JPG)</span>
                  </label>
               </div>
               {files.length > 0 && (
                 <div className="mt-4 space-y-2">
                   {files.map((f, i) => (
                     <div key={i} className="flex items-center justify-between p-3 bg-[var(--sidebar-bg)] rounded border border-[var(--card-border)]">
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

             <div className="border-t border-[var(--card-border)] pt-6 space-y-4">
               <h3 className="font-serif text-lg">Supplier & Rate Prefilling</h3>
               <div className="grid grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-medium mb-2 opacity-70">Supplier (Optional)</label>
                   <select
                     value={selectedSupplierId}
                     onChange={e => handleSupplierChange(e.target.value)}
                     className="input-anthropic w-full p-3 font-medium text-sm"
                   >
                     <option value="">No Supplier (Manual Entry)</option>
                     {suppliers.map(s => (
                       <option key={s.id} value={s.id}>{s.name}</option>
                     ))}
                   </select>
                 </div>

                 {activeSupplier && activeSupplier.services && activeSupplier.services.length > 0 && (
                   <div className="animate-in fade-in duration-300">
                     <label className="block text-sm font-medium mb-2 opacity-70">Supplier's Rate List</label>
                     <select
                       onChange={e => handleSupplierServiceChange(Number(e.target.value))}
                       className="input-anthropic w-full p-3 font-medium text-sm"
                       defaultValue="0"
                     >
                       {activeSupplier.services.map((srv: any, idx: number) => (
                         <option key={idx} value={idx}>
                           {srv.serviceName} ({srv.defaultPrice} AED / Cost: {srv.defaultCost} AED)
                         </option>
                       ))}
                     </select>
                   </div>
                 )}
               </div>
             </div>

             <div className="border-t border-[var(--card-border)] pt-6">
                <h3 className="font-serif text-lg mb-4">Financials (Auto-generates Invoice)</h3>
                <div className="grid grid-cols-2 gap-6">
                   <div>
                      <label className="block text-sm font-medium mb-2 opacity-70">Amount to Charge (AED)</label>
                      <input 
                        name="amount" 
                        type="number" 
                        required 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)}
                        className="input-anthropic w-full p-3 font-mono" 
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium mb-2 opacity-70">Supplier Cost (AED)</label>
                      <input 
                        name="supplier_cost" 
                        type="number" 
                        value={supplierCost} 
                        onChange={e => setSupplierCost(e.target.value)}
                        className="input-anthropic w-full p-3 font-mono" 
                      />
                   </div>
                </div>
             </div>

            <button disabled={loading} type="submit" className="w-full py-4 bg-[#D97757] text-[#F5F4EF] rounded-md font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Processing & Uploading...' : 'Save Service & Generate Invoice'}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.3); border-radius: 20px; }
      `}</style>
    </div>
  );
}