'use client';

import { User, Phone, Mail, FileText, ArrowLeft, Plus, Pencil, X, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import NewServiceDialog from '@/components/NewServiceDialog';
import DocumentModal from '@/components/DocumentModal';
import CustomerDocumentsSection from '@/components/CustomerDocumentsSection';
import { CustomerInvoicesSection } from './components/CustomerInvoicesSection';
import { CustomerServiceCard } from './components/CustomerServiceCard';
import { updateCustomer } from '@/app/actions/customers';

export default function CustomerHubClient({
  customer,
  services,
  pastInvoices,
  documents,
}: {
  customer: any;
  services: any[];
  pastInvoices: any[];
  documents: any[];
}) {
  const router = useRouter();
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  // Customer Profile Edit State
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState(customer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
  const [customerPassport, setCustomerPassport] = useState(
    customer?.passportNo || customer?.passport_no || ''
  );
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const handleSaveCustomer = async () => {
    setIsSavingCustomer(true);
    try {
      const formData = new FormData();
      formData.append('name', customerName);
      formData.append('phone', customerPhone);
      formData.append('email', customerEmail);
      formData.append('passport_no', customerPassport);

      const res = await updateCustomer(customer.id, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Customer profile updated');
        setIsEditingCustomer(false);
        router.refresh();
      }
    } catch (e: any) {
      toast.error('Failed to update customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/customers"
          className="p-2 bg-[var(--sidebar-bg)] rounded-full hover:bg-[var(--card-border)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 opacity-70" />
        </Link>
        <h1 className="text-3xl font-serif font-normal tracking-tight">Customer Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT COLUMN - Customer Identity */}
        <div className="md:col-span-1 space-y-6">
          <div className="card-anthropic p-8 relative">
            <div className="absolute top-6 right-6">
              {!isEditingCustomer ? (
                <button
                  onClick={() => setIsEditingCustomer(true)}
                  className="p-1.5 rounded-md hover:bg-[var(--anthropic-surface)] text-gray-500 hover:text-[#D97757] transition-colors"
                  title="Edit Customer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCustomer}
                    disabled={isSavingCustomer}
                    className="p-1.5 rounded-md bg-[#D97757]/10 text-[#D97757] hover:bg-[#D97757]/20 transition-colors"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingCustomer(false)}
                    disabled={isSavingCustomer}
                    className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="w-16 h-16 rounded-full bg-[var(--anthropic-surface)] flex items-center justify-center mb-6">
              <User className="w-6 h-6 opacity-60" />
            </div>

            {isEditingCustomer ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs opacity-70 mb-1">Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="input-anthropic w-full text-sm py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs opacity-70 mb-1">Phone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="input-anthropic w-full text-sm py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs opacity-70 mb-1">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="input-anthropic w-full text-sm py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs opacity-70 mb-1">Passport No.</label>
                  <input
                    type="text"
                    value={customerPassport}
                    onChange={(e) => setCustomerPassport(e.target.value)}
                    className="input-anthropic w-full text-sm py-1.5"
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-serif mb-6 leading-tight">{customer.name}</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 opacity-50" />
                    <span className="opacity-80">{customer.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 opacity-50" />
                    <span className="opacity-80">{customer.email || 'No email'}</span>
                  </div>
                  {(customer.passportNo || customer.passport_no) && (
                    <div className="flex items-center gap-3 text-sm pt-4 border-t border-[var(--card-border)]">
                      <FileText className="w-4 h-4 opacity-50" />
                      <span className="opacity-80 font-mono text-xs tracking-wider">
                        {customer.passportNo || customer.passport_no}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Services, Invoices, Documents */}
        <div className="md:col-span-2 space-y-8">
          {/* Active Services Section */}
          <div className="card-anthropic p-8">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--card-border)]">
              <h3 className="text-lg font-serif">Active Services</h3>
              <button
                onClick={() => setIsServiceDialogOpen(true)}
                className="text-sm font-medium text-[#D97757] hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            </div>

            <div className="space-y-6">
              {services.length === 0 ? (
                <div className="text-sm opacity-50 pb-4">No active services found.</div>
              ) : (
                services.map((service) => (
                  <CustomerServiceCard
                    key={service.id}
                    service={service}
                    onUpdated={() => router.refresh()}
                  />
                ))
              )}
            </div>
          </div>

          {/* Invoices Section */}
          <CustomerInvoicesSection customerId={customer.id} pastInvoices={pastInvoices} />

          {/* Documents Section */}
          <CustomerDocumentsSection
            documents={documents}
            onOpenModal={() => setIsDocsModalOpen(true)}
          />
        </div>
      </div>

      {/* Global Document Modal */}
      <DocumentModal
        isOpen={isDocsModalOpen}
        onClose={() => {
          setIsDocsModalOpen(false);
          router.refresh();
        }}
        customerId={customer.id}
        customerName={customer.name}
      />

      {/* Add New Service Dialog */}
      <NewServiceDialog
        isOpen={isServiceDialogOpen}
        onClose={() => {
          setIsServiceDialogOpen(false);
          router.refresh();
        }}
        customerId={customer.id}
        customerName={customer.name}
        customerMetadata={customer.metadata}
      />
    </div>
  );
}