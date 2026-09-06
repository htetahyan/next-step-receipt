'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addCustomerService } from '@/app/actions/services';
import { getPresignedUrl } from '@/app/actions/r2';
import { addDocument } from '@/app/actions/documents';
import { getSuppliers } from '@/app/actions/suppliers';
import {
  Loader2,
  UploadCloud,
  File,
  X,
  Shield,
  Plane,
  Globe,
  Map,
  Plus,
  Wrench,
  ArrowRight,
  Calendar,
  Building2,
  DollarSign,
  FileText,
  Paperclip,
} from 'lucide-react';
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
}: NewServiceDialogProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'quick' | 'full'>('full');
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

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

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
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
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

  const fullFormLinks = [
    {
      label: 'UAE Visa',
      href: `/dashboard/uae-visa/new?customerId=${customerId}`,
      icon: Shield,
      description: '30/60 Days Tourist, A2A, Freelance Visas',
      color: 'text-[#D97757] bg-[#D97757]/10 border-[#D97757]/20 group-hover:border-[#D97757]',
    },
    {
      label: 'Air Ticket',
      href: `/dashboard/air-tickets/new?customerId=${customerId}`,
      icon: Plane,
      description: 'One-Way, Round-Trip, Multi-City Flights',
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20 group-hover:border-blue-500',
    },
    {
      label: 'Tour Package',
      href: `/dashboard/tour-packages/new?customerId=${customerId}`,
      icon: Map,
      description: 'Holiday itineraries, Hotels & Excursions',
      color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500',
    },
    {
      label: 'Other Visa',
      href: `/dashboard/other-visa/new?customerId=${customerId}`,
      icon: Globe,
      description: 'Schengen, UK, USA, Oman, Saudi Visas',
      color: 'text-purple-600 bg-purple-500/10 border-purple-500/20 group-hover:border-purple-500',
    },
    {
      label: 'Custom Service',
      href: `/dashboard/custom-service/new?customerId=${customerId}`,
      icon: Wrench,
      description: 'Dummy flight, Attestation, Extensions, Insurance',
      color: 'text-orange-600 bg-orange-500/10 border-orange-500/20 group-hover:border-orange-500',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl z-10 scale-in-center overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D97757]/10 text-[#D97757] flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-medium text-[var(--foreground)]">Add New Service</h3>
                <span className="text-[10px] font-mono font-bold bg-[#D97757]/10 text-[#D97757] px-2 py-0.5 rounded-full">
                  Client Pre-Selected
                </span>
              </div>
              <p className="text-xs opacity-60">
                Booking record for <strong className="text-[var(--foreground)]">{customerName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 hover:bg-[var(--card-border)] rounded-lg text-gray-400 hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Switcher */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-1 bg-[var(--sidebar-bg)] p-1 rounded-lg border border-[var(--card-border)] w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('full')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'full'
                  ? 'bg-[var(--card-bg)] text-[var(--foreground)] shadow-xs font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              🚀 Dedicated Service Modules
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quick')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'quick'
                  ? 'bg-[var(--card-bg)] text-[var(--foreground)] shadow-xs font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              ⚡ Fast Inline Entry
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'full' ? (
            /* Dedicated Service Module Cards */
            <div className="space-y-3">
              <p className="text-xs opacity-60">
                Launch the specialized multi-field booking form with rate card auto-fill, supplier costing, and document staging:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {fullFormLinks.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <Link
                      key={mod.label}
                      href={mod.href}
                      onClick={onClose}
                      className="group flex items-start gap-3 p-3 rounded-xl border border-[var(--card-border)] bg-[var(--anthropic-surface)] hover:bg-[var(--sidebar-bg)] transition-all shadow-xs hover:border-[#D97757]/50"
                    >
                      <div className={`p-2.5 rounded-lg border shrink-0 ${mod.color} transition-transform group-hover:scale-105`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--foreground)] group-hover:text-[#D97757] transition-colors">
                            {mod.label}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#D97757]" />
                        </div>
                        <p className="text-[11px] opacity-60 mt-0.5 line-clamp-1">{mod.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Quick Add Inline Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium opacity-80 mb-1">
                    Service Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-anthropic w-full text-xs h-9"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {category === 'Other' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium opacity-80 mb-1">
                      Custom Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Translation, Certificate Attestation"
                      className="input-anthropic w-full text-xs h-9"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium opacity-80 mb-1">Travel / Execution Date</label>
                  <div className="relative">
                    <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <input name="travel_date" type="date" className="input-anthropic w-full pl-8 pr-3 text-xs h-9 font-mono" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium opacity-80 mb-1">Supplier Provider</label>
                  <div className="relative">
                    <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-gray-400">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      className="input-anthropic w-full pl-8 pr-3 text-xs h-9"
                    >
                      <option value="">No Supplier (In-house / Manual)</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium opacity-80 mb-1">
                    Selling / Receiving Amount (AED) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-gray-400">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                    <input
                      name="amount"
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="input-anthropic w-full pl-8 pr-3 text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium opacity-80 mb-1">Direct Supplier Cost (AED)</label>
                  <div className="relative">
                    <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-gray-400">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                    <input
                      name="supplier_cost"
                      type="number"
                      value={supplierCost}
                      onChange={(e) => setSupplierCost(e.target.value)}
                      className="input-anthropic w-full pl-8 pr-3 text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium opacity-80 mb-1">Notes & Specifications</label>
                  <div className="relative">
                    <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-gray-400">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <input
                      name="notes"
                      placeholder="Remarks, booking reference, or special instructions..."
                      className="input-anthropic w-full pl-8 pr-3 text-xs h-9"
                    />
                  </div>
                </div>

                {/* Staged File Attachments */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium opacity-80 mb-1">Attach Documents (Optional)</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[var(--card-border)] bg-[var(--sidebar-bg)] hover:bg-[var(--card-border)] text-xs cursor-pointer transition-colors">
                      <Paperclip className="w-3.5 h-3.5 text-[#D97757]" />
                      Browse Files
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                    </label>
                    <span className="text-[11px] opacity-50">PDF, JPG, PNG up to 10MB</span>
                  </div>

                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--sidebar-bg)] border border-[var(--card-border)] text-[11px]"
                        >
                          <File className="w-3 h-3 text-[#D97757]" />
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="p-0.5 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--card-border)]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 h-8.5 rounded-lg border border-[var(--card-border)] text-xs font-medium hover:bg-[var(--sidebar-bg)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 h-8.5 bg-[#D97757] hover:bg-[#c66446] text-white text-xs font-medium rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating Service...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Create Service
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}