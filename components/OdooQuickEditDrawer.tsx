'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Shield, User, DollarSign, Calendar, FileText, CheckCircle, PlusCircle, Copy, Trash2, Loader2, Phone, ExternalLink, Eye, Download, Image as ImageIcon, Paperclip, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { quickUpdateService, deleteCustomerService } from '@/app/actions/services';
import { STATUS_COLORS } from '@/lib/statusColors';
import DocumentModal from '@/components/DocumentModal';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import { getDocuments } from '@/app/actions/documents';
import { downloadDocumentFile, isImageFile } from '@/lib/downloadHelper';

interface Props {
  service: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedService: any) => void;
  onDelete: (serviceId: string) => void;
  canDelete?: boolean;
  suppliersList?: string[];
  categoriesList?: string[];
}

const STAGES = ['Open', 'In Progress', 'Closed', 'Cancelled', 'Refund Pending'];

export default function OdooQuickEditDrawer({
  service,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  canDelete = false,
  suppliersList = [],
  categoriesList = [],
}: Props) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'documents' | 'passengers' | 'all'>('overview');

  // Form State
  const [referenceId, setReferenceId] = useState('');
  const [status, setStatus] = useState('Open');
  const [category, setCategory] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [passportNo, setPassportNo] = useState('');

  // Details
  const [visaSupplier, setVisaSupplier] = useState('');
  const [visaDuration, setVisaDuration] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [visaIssuedDate, setVisaIssuedDate] = useState('');
  const [visaExpiryDate, setVisaExpiryDate] = useState('');
  const [handledBy, setHandledBy] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [comments, setComments] = useState('');

  // Financials
  const [amount, setAmount] = useState<number | string>(0);
  const [receivingAmount, setReceivingAmount] = useState<number | string>(0);
  const [supplierCost, setSupplierCost] = useState<number | string>(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Documents
  const [documents, setDocuments] = useState<any[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchServiceDocs = useCallback(async () => {
    if (service?.customer_id) {
      const res = await getDocuments(service.customer_id, service.id);
      if (!res.error && res.documents) {
        setDocuments(res.documents);
      }
    }
  }, [service?.customer_id, service?.id]);

  // Populate state when service changes
  useEffect(() => {
    if (service) {
      const cust = service.customers || {};
      const det = (service.details as any) || {};
      const fin = (service.financials as any) || {};

      setReferenceId(service.reference_id || '');
      setStatus(service.status || 'Open');
      setCategory(service.category || 'UAE Visit Visa 30 Days');
      setCustomerName(cust.name || det.customer_name || '');
      setPhone(cust.phone || det.phone || '');
      setPassportNo(cust.passport_no || det.passport_no || '');

      setVisaSupplier(det.visa_supplier || '');
      setVisaDuration(det.visa_duration || '30 days');
      setTravelDate(det.travel_date || '');
      setVisaIssuedDate(det.visa_issued_date || '');
      setVisaExpiryDate(det.visa_expiry_date || '');
      setHandledBy(det.handled_by || '');
      setReferredBy(det.referred_by || '');
      setComments(det.comments || det.remark || det.notes || '');

      setAmount(fin.amount || 0);
      setReceivingAmount(fin.receiving_amount || 0);
      setSupplierCost(fin.supplier_cost || 0);
      setPaymentMethod(fin.payment_method || 'cash');
    }
  }, [service]);

  useEffect(() => {
    if (isOpen && service?.customer_id) {
      fetchServiceDocs();
    }
  }, [isOpen, service?.customer_id, fetchServiceDocs]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !service) return null;

  // Real-time Gross Profit calculation
  const numReceiving = Number(receivingAmount) || 0;
  const numSupplierCost = Number(supplierCost) || 0;
  const grossProfit = numReceiving - numSupplierCost;

  // WhatsApp reminder URL
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${customerName || 'Customer'},\nRegarding your UAE Visit Visa (Ref: ${referenceId || service?.reference_id || ''}, Expiry: ${visaExpiryDate || 'N/A'}). Please let us know if you need any assistance with extension or renewals.\nBest regards,\nNextStep Travel & Tourism`
  )}` : null;

  const handleStageChange = async (nextStatus: string) => {
    if (nextStatus === status) return;
    setStatus(nextStatus);

    // Optimistic Update
    const optimisticService = {
      ...service,
      status: nextStatus,
    };
    onUpdate(optimisticService);

    toast.loading(`Updating status to ${nextStatus}...`, { id: 'status-update' });

    const res = await quickUpdateService(service.id, { status: nextStatus });
    if (res.success && res.service) {
      onUpdate(res.service);
      toast.success(`Status updated to "${nextStatus}"`, { id: 'status-update' });
    } else {
      // Rollback on error
      setStatus(service.status);
      onUpdate(service);
      toast.error(res.error || 'Failed to update status', { id: 'status-update' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    toast.loading('Saving service changes...', { id: 'drawer-save' });

    const updatedDetails = {
      ...(service.details || {}),
      visa_supplier: visaSupplier,
      visa_duration: visaDuration,
      travel_date: travelDate,
      visa_issued_date: visaIssuedDate,
      visa_expiry_date: visaExpiryDate,
      handled_by: handledBy,
      referred_by: referredBy,
      comments: comments,
      customer_name: customerName,
      phone: phone,
      passport_no: passportNo,
    };

    const updatedFinancials = {
      ...(service.financials || {}),
      amount: Number(amount) || 0,
      receiving_amount: Number(receivingAmount) || 0,
      supplier_cost: Number(supplierCost) || 0,
      payment_method: paymentMethod,
    };

    const cleanRef = referenceId.trim().toUpperCase();

    // Optimistic Update
    const optimisticService = {
      ...service,
      reference_id: cleanRef,
      status,
      category,
      details: updatedDetails,
      financials: updatedFinancials,
      customers: {
        ...(service.customers || {}),
        name: customerName,
        phone,
        passport_no: passportNo,
      },
    };
    onUpdate(optimisticService);

    const res = await quickUpdateService(service.id, {
      reference_id: cleanRef,
      status,
      category,
      details: updatedDetails,
      financials: updatedFinancials,
      customer: {
        name: customerName,
        phone,
        passport_no: passportNo,
      },
    });

    setSaving(false);

    if (res.success && res.service) {
      onUpdate(res.service);
      toast.success('Service updated successfully!', { id: 'drawer-save' });
      onClose();
    } else {
      // Revert if error
      onUpdate(service);
      toast.error(res.error || 'Failed to save changes', { id: 'drawer-save' });
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    const res = await deleteCustomerService(service.id);
    setDeleting(false);
    setShowDeleteModal(false);

    if (res.success) {
      toast.success('Service deleted successfully');
      onClose();
      onDelete(service.id);
    } else {
      toast.error(res.error || 'Failed to delete service');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-2xl bg-[var(--card-bg)] border-l border-[var(--card-border)] shadow-2xl flex flex-col h-full z-10 slide-in-right">
        
        {/* Top Header */}
        <div className="p-5 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-6 h-6 text-[#D97757]" />
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--card-border)]">
                    <span className="text-[10px] opacity-50 font-mono">REF:</span>
                    <input
                      type="text"
                      value={referenceId}
                      onChange={e => setReferenceId(e.target.value.toUpperCase())}
                      placeholder="e.g. AE0001"
                      className="font-mono text-xs font-bold text-[#D97757] bg-transparent focus:outline-none w-24 uppercase"
                      title="Edit Reference ID"
                    />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#D97757]/10 text-[#D97757] font-semibold">
                    {category}
                  </span>
                </div>
                <h2 className="text-lg font-serif font-semibold line-clamp-1 mt-0.5">
                  {customerName || 'Customer Quick Form'}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--card-border)] transition-colors opacity-70 hover:opacity-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Odoo Interactive Statusbar Pipeline */}
          <div className="odoo-statusbar w-full pt-1">
            {STAGES.map(stage => {
              const isActive = status === stage;
              return (
                <button
                  key={stage}
                  onClick={() => handleStageChange(stage)}
                  className={`odoo-stage-btn ${isActive ? 'odoo-stage-btn-active' : 'odoo-stage-btn-inactive'}`}
                >
                  {stage}
                </button>
              );
            })}
          </div>

          {/* Segmented Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-[var(--card-border)] -mb-3 pt-2 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-[#D97757] text-[#D97757] font-semibold'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              Overview & Visa
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('financials')}
              className={`px-3 py-1.5 font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'financials'
                  ? 'border-[#D97757] text-[#D97757] font-semibold'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              Financials
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`px-3 py-1.5 font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'border-[#D97757] text-[#D97757] font-semibold'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span>Documents</span>
              {documents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#D97757]/15 text-[#D97757] font-mono font-bold">
                  {documents.length}
                </span>
              )}
            </button>
            {service.details?.passengers && service.details.passengers.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveTab('passengers')}
                className={`px-3 py-1.5 font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'passengers'
                    ? 'border-[#D97757] text-[#D97757] font-semibold'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <span>Travelers</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#D97757]/15 text-[#D97757] font-mono font-bold">
                  {service.details.passengers.length}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 font-medium border-b-2 transition-all cursor-pointer ml-auto text-[11px] ${
                activeTab === 'all'
                  ? 'border-[#D97757] text-[#D97757] font-semibold'
                  : 'border-transparent opacity-40 hover:opacity-100'
              }`}
            >
              View All
            </button>
          </div>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          
          {/* Section 1: Customer Info */}
          {(activeTab === 'overview' || activeTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-1.5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[#D97757]">
                  <User className="w-4 h-4" />
                  <span>Customer Information</span>
                </div>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
                    title="Send WhatsApp Visa Message"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Client</span>
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold opacity-70 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full input-anthropic px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold opacity-70 mb-1 block">Passport No</label>
                  <input
                    type="text"
                    value={passportNo}
                    onChange={e => setPassportNo(e.target.value)}
                    placeholder="Passport #"
                    className="w-full input-anthropic px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold opacity-70 mb-1 block">Phone Number</label>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Mobile / WhatsApp"
                        className="w-full input-anthropic px-3 py-2 text-sm font-mono"
                      />
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#D97757] hover:opacity-80"
                          title="Call Customer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center shrink-0 shadow-xs"
                        title="Open WhatsApp Chat with Client"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multi-Pax Travelers Section */}
          {(activeTab === 'passengers' || activeTab === 'all' || activeTab === 'overview') && service.details?.passengers && service.details.passengers.length > 1 && (
            <div className="p-3 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--card-border)] space-y-2">
              <div className="text-xs font-semibold text-[#D97757] flex items-center justify-between">
                <span>Travelers / Passengers ({service.details.passengers.length} Pax)</span>
                <span className="text-[10px] opacity-60 font-mono">Group Booking</span>
              </div>
              <div className="divide-y divide-[var(--card-border)] text-xs">
                {service.details.passengers.map((pax: any, i: number) => (
                  <div key={pax.id || i} className="py-1.5 flex items-center justify-between font-mono">
                    <div>
                      <span className="font-semibold">{i + 1}. {pax.name}</span>
                      {pax.nationality && <span className="opacity-60 ml-2">({pax.nationality})</span>}
                    </div>
                    <div className="text-[11px] opacity-80">
                      {pax.passport_no ? `Pass: ${pax.passport_no}` : ''}
                      {pax.ticket_no ? ` · Tkt: ${pax.ticket_no}` : ''}
                      {pax.visa_app_no ? ` · App: ${pax.visa_app_no}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Visa Details */}
          {(activeTab === 'overview' || activeTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[#D97757] border-b border-[var(--card-border)] pb-1.5">
                <Shield className="w-4 h-4" />
                <span>Visa & Service Details</span>
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold opacity-70 mb-1 block">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full input-anthropic px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold opacity-70 mb-1 block">Visa Supplier</label>
                <input
                  type="text"
                  value={visaSupplier}
                  onChange={e => setVisaSupplier(e.target.value)}
                  list="supplier-suggestions"
                  placeholder="e.g. Musafir, Rayna..."
                  className="w-full input-anthropic px-3 py-2 text-sm"
                />
                <datalist id="supplier-suggestions">
                  {suppliersList.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div>
                <label className="text-xs font-semibold opacity-70 mb-1 block">Duration</label>
                <input
                  type="text"
                  value={visaDuration}
                  onChange={e => setVisaDuration(e.target.value)}
                  placeholder="e.g. 30 days, 60 days"
                  className="w-full input-anthropic px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold opacity-70 mb-1 block">Visa Issued Date</label>
                <input
                  type="date"
                  value={visaIssuedDate}
                  onChange={e => setVisaIssuedDate(e.target.value)}
                  className="w-full input-anthropic px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold opacity-70 mb-1 block">Travel Date</label>
                <input
                  type="date"
                  value={travelDate}
                  onChange={e => setTravelDate(e.target.value)}
                  className="w-full input-anthropic px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold opacity-70 mb-1 block font-bold text-amber-600 dark:text-amber-400">
                  Visa Expiry Date
                </label>
                <input
                  type="date"
                  value={visaExpiryDate}
                  onChange={e => setVisaExpiryDate(e.target.value)}
                  className="w-full input-anthropic px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300 border-amber-300"
                />
              </div>

              <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold opacity-70 mb-1 block">Handled By (Staff)</label>
                  <input
                    type="text"
                    value={handledBy}
                    onChange={e => setHandledBy(e.target.value)}
                    placeholder="Staff / Handled by name"
                    className="w-full input-anthropic px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold opacity-70 mb-1 block">Referred By (Agent)</label>
                  <input
                    type="text"
                    value={referredBy}
                    onChange={e => setReferredBy(e.target.value)}
                    placeholder="Agent / Reference name"
                    className="w-full input-anthropic px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Financials */}
          {(activeTab === 'financials' || activeTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[#D97757] border-b border-[var(--card-border)] pb-1.5">
                <DollarSign className="w-4 h-4" />
                <span>Financial Metrics & Accounting</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold opacity-70 mb-1 block">Total Amount (AED)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full input-anthropic px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold opacity-70 mb-1 block">Receiving (AED)</label>
                  <input
                    type="number"
                    value={receivingAmount}
                    onChange={e => setReceivingAmount(e.target.value)}
                    className="w-full input-anthropic px-3 py-2 text-sm font-mono text-blue-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold opacity-70 mb-1 block">Supplier Cost (AED)</label>
                  <input
                    type="number"
                    value={supplierCost}
                    onChange={e => setSupplierCost(e.target.value)}
                    className="w-full input-anthropic px-3 py-2 text-sm font-mono text-amber-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold opacity-70 mb-1 block">Gross Profit</label>
                  <div className={`px-3 py-2 rounded-lg font-mono text-sm font-bold border ${
                    grossProfit >= 0
                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                      : 'bg-red-500/10 text-red-600 border-red-500/20'
                  }`}>
                    {grossProfit.toLocaleString()} AED
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold opacity-70 mb-1 block">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full input-anthropic px-3 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="credit">On Credit</option>
                </select>
              </div>
            </div>
          )}

          {/* Section 4: Remarks / Notes */}
          {(activeTab === 'overview' || activeTab === 'all') && (
            <div className="space-y-2">
              <label className="text-xs font-semibold opacity-70 block">Notes & Internal Remarks</label>
              <textarea
                rows={3}
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Add any internal comments or specific requirements..."
                className="w-full input-anthropic p-3 text-sm"
              />
            </div>
          )}

          {/* Section 5: Documents & Attachments */}
          {(activeTab === 'documents' || activeTab === 'all') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-1.5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[#D97757]">
                  <Paperclip className="w-4 h-4" />
                  <span>Documents & Attachments ({documents.length})</span>
                </div>
                {service?.customer_id && (
                  <button
                    type="button"
                    onClick={() => setIsDocModalOpen(true)}
                    className="text-xs font-semibold text-[#D97757] hover:underline flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Manage / Upload
                  </button>
                )}
              </div>

              {documents.length === 0 ? (
                <div className="text-xs opacity-50 py-3 text-center border border-dashed border-[var(--card-border)] rounded-lg">
                  No files attached to this service record.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {documents.map((doc, idx) => {
                    const url = doc.file_url || doc.fileUrl;
                    const isImg = url ? isImageFile(url, doc.title) : false;
                    return (
                      <div
                        key={doc.id || idx}
                        onClick={() => {
                          setViewerIndex(idx);
                          setIsViewerOpen(true);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--sidebar-bg)] hover:bg-[var(--card-border)] transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isImg ? <ImageIcon className="w-4 h-4 text-[#D97757] shrink-0" /> : <FileText className="w-4 h-4 text-[#D97757] shrink-0" />}
                          <span className="text-xs font-medium truncate group-hover:text-[#D97757] transition-colors">{doc.title}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setViewerIndex(idx);
                              setIsViewerOpen(true);
                            }}
                            className="p-1 rounded hover:bg-[#D97757]/10 text-[#D97757]"
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {url && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadDocumentFile(url, doc.title);
                              }}
                              className="p-1 rounded hover:bg-[var(--card-bg)] opacity-70 hover:opacity-100"
                              title="Direct Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-[var(--card-border)] bg-[var(--sidebar-bg)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/uae-visa/new?customerId=${service.customer_id || ''}`}
              className="px-3 py-2 rounded-lg bg-[#D97757] text-white hover:bg-[#c26243] text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Extend Visa
            </Link>

            <Link
              href={`/dashboard/uae-visa/new?duplicate=${service.id}&customerId=${service.customer_id || ''}`}
              className="px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-medium flex items-center gap-1.5 hover:bg-[var(--sidebar-bg)] transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </Link>

            <Link
              href={`/dashboard/uae-visa/${service.id}`}
              className="px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-medium flex items-center gap-1.5 hover:bg-[var(--sidebar-bg)] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Full Page
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting}
                className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#D97757] text-white hover:bg-[#c26243] text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Quick Save
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Visa Record"
          itemType="visa record"
          itemName={service?.reference_id || 'Visa Service'}
          isDeleting={deleting}
          description="Are you sure you want to delete this visa record? This will permanently remove the service and its records."
        />

        {/* Upload & Manager Modal */}
        {service?.customer_id && (
          <DocumentModal
            isOpen={isDocModalOpen}
            onClose={() => {
              setIsDocModalOpen(false);
              fetchServiceDocs();
            }}
            customerId={service.customer_id}
            serviceId={service.id}
            customerName={customerName || 'Customer'}
          />
        )}

        {/* Interactive Lightbox Document Viewer */}
        <DocumentViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          documents={documents}
          initialIndex={viewerIndex}
        />
      </div>
    </div>
  );
}
