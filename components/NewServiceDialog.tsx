'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addCustomerService } from '@/app/actions/services';
import { getPresignedUrl } from '@/app/actions/r2';
import { addDocument } from '@/app/actions/documents';
import { getSuppliers } from '@/app/actions/suppliers';
import { Loader2, UploadCloud, File, X, Shield, Plane, Globe, Map, Plus } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'UAE Visit Visa',
  'Air Ticket',
  'Tour Package',
  'Other Visa',
  'Passport Renew',
  'Visa Extension B2B',
  'Inside Visa',
  'Other',
];

interface NewServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerMetadata?: any;
}

export default function NewServiceDialog({
  isOpen,
  onClose,
  customerId,
  customerName,
  customerMetadata,
}: NewServiceDialogProps) {
  const router = useRouter();

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
      getSuppliers().then((res) => {
        if (res.success && res.data) {
          setSuppliers(res.data);
        }
      });
    }
  }, [isOpen]);

  const activeSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    if (!supplierId) {
      setAmount('0');
      setSupplierCost('0');
    } else {
      const s = suppliers.find((x) => x.id === supplierId);
      if (s && s.services && s.services.length > 0) {
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
                tag: category,
              });
            }
          }
        }
      }

      // 2. Prepare database payload
      const finalCategory = category === 'Other' ? customCategory || 'Other Service' : category;
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
          documents: uploadedDocs,
          visa_supplier: activeSupplier?.name || null,
        },
        financials: {
          amount: numAmount,
          discount: 0,
          receiving_amount: numAmount,
          supplier_cost: numCost,
          refund: 0,
          balance: numAmount - numCost,
        },
      };

      const res = await addCustomerService(data);
      if (res.success) {
        const createdService = res.service || res.data;
        if (createdService && uploadedDocs.length > 0) {
          for (const doc of uploadedDocs) {
            await addDocument({
              customerId: customerId,
              serviceId: createdService.id,
              title: doc.title,
              file_url: doc.file_url!,
              file_key: doc.file_key!,
              tag: finalCategory,
            });
          }
        }
        toast.success('Service created successfully');
        onClose();
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to create service');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--card-border)]">
          <div>
            <h3 className="text-xl font-serif font-normal">Add Service</h3>
            <p className="text-xs opacity-60 mt-0.5">For {customerName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--card-border)] rounded-full transition-colors">
            <X className="h-5 w-5 opacity-50" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Quick Launch Cards */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-medium opacity-60 mb-2">
              Launch Full Dedicated Form
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Link
                href={`/dashboard/uae-visa/new?customerId=${customerId}`}
                className="p-3 rounded-lg border border-[var(--card-border)] hover:border-[#D97757] hover:bg-[#D97757]/5 transition-all text-center group"
              >
                <Shield className="w-5 h-5 mx-auto mb-1.5 opacity-60 group-hover:text-[#D97757] group-hover:opacity-100 transition-colors" />
                <div className="text-xs font-medium">UAE Visa</div>
              </Link>
              <Link
                href={`/dashboard/air-tickets/new?customerId=${customerId}`}
                className="p-3 rounded-lg border border-[var(--card-border)] hover:border-[#D97757] hover:bg-[#D97757]/5 transition-all text-center group"
              >
                <Plane className="w-5 h-5 mx-auto mb-1.5 opacity-60 group-hover:text-[#D97757] group-hover:opacity-100 transition-colors" />
                <div className="text-xs font-medium">Air Ticket</div>
              </Link>
              <Link
                href={`/dashboard/tour-packages/new?customerId=${customerId}`}
                className="p-3 rounded-lg border border-[var(--card-border)] hover:border-[#D97757] hover:bg-[#D97757]/5 transition-all text-center group"
              >
                <Map className="w-5 h-5 mx-auto mb-1.5 opacity-60 group-hover:text-[#D97757] group-hover:opacity-100 transition-colors" />
                <div className="text-xs font-medium">Tour Package</div>
              </Link>
              <Link
                href={`/dashboard/other-visa/new?customerId=${customerId}`}
                className="p-3 rounded-lg border border-[var(--card-border)] hover:border-[#D97757] hover:bg-[#D97757]/5 transition-all text-center group"
              >
                <Globe className="w-5 h-5 mx-auto mb-1.5 opacity-60 group-hover:text-[#D97757] group-hover:opacity-100 transition-colors" />
                <div className="text-xs font-medium">Other Visa</div>
              </Link>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[var(--card-border)] w-full" />
            <span className="bg-[var(--card-bg)] px-3 text-[10px] uppercase tracking-widest opacity-40 absolute">
              Or Quick Add Here
            </span>
          </div>

          {/* Quick Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] uppercase tracking-wider font-medium opacity-60 mb-1">
                  Service Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-anthropic w-full text-sm py-2"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {category === 'Other' && (
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider font-medium opacity-60 mb-1">
                    Custom Service Name
                  </label>
                  <input
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Translation, Attestation"
                    className="input-anthropic w-full text-sm py-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium opacity-60 mb-1">
                  Travel Date
                </label>
                <input name="travel_date" type="date" className="input-anthropic w-full text-sm py-2" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium opacity-60 mb-1">
                  Supplier
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="input-anthropic w-full text-sm py-2"
                >
                  <option value="">No Supplier (Manual)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium opacity-60 mb-1">
                  Amount (AED)
                </label>
                <input
                  name="amount"
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-anthropic w-full text-sm py-2 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium opacity-60 mb-1">
                  Supplier Cost (AED)
                </label>
                <input
                  name="supplier_cost"
                  type="number"
                  value={supplierCost}
                  onChange={(e) => setSupplierCost(e.target.value)}
                  className="input-anthropic w-full text-sm py-2 font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] uppercase tracking-wider font-medium opacity-60 mb-1">
                  Notes
                </label>
                <input
                  name="notes"
                  placeholder="Additional notes"
                  className="input-anthropic w-full text-sm py-2"
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full py-3 bg-[#D97757] text-white rounded-lg font-medium hover:bg-[#c66446] transition-colors flex items-center justify-center gap-2 text-sm shadow-sm mt-4"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating Service...' : 'Create Quick Service'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}