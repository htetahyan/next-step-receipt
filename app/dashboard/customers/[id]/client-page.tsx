'use client';

import { User, Phone, Mail, FileText, ArrowLeft, Receipt, Plus, Pencil, X, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import NewServiceDialog from '@/components/NewServiceDialog';
import DocumentModal from '@/components/DocumentModal';
import CustomerDocumentsSection from '@/components/CustomerDocumentsSection';
import { quickUpdateService } from '@/app/actions/services';
import { updateCustomer } from '@/app/actions/customers';

export default function CustomerHubClient({ customer, services, pastInvoices, documents }: {
  customer: any;
  services: any[];
  pastInvoices: any[];
  documents: any[];
}) {
  const router = useRouter();
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  // Customer Edit State
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState(customer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
  const [customerPassport, setCustomerPassport] = useState(customer?.passportNo || customer?.passport_no || '');
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

  // Service Edit State
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceEditData, setServiceEditData] = useState<any>({});
  const [isSavingService, setIsSavingService] = useState(false);

  const handleEditService = (service: any) => {
    setEditingServiceId(service.id);
    const details = service.details || {};
    const fin = service.financials || {};
    setServiceEditData({
      status: service.status || 'Open',
      category: service.category || '',
      travel_date: details.travel_date || details.departure_date || '',
      departure_date: details.departure_date || details.travel_date || '',
      departure_time: details.departure_time || '',
      booking_date: details.booking_date || '',
      destination: details.destination || details.sector || '',
      visa_expiry_date: details.visa_expiry_date || '',
      visa_issued_date: details.visa_issued_date || '',
      visa_duration: details.visa_duration || '',
      visa_supplier: details.visa_supplier || details.supplier_name || '',
      supplier_name: details.supplier_name || details.visa_supplier || '',
      tour_plans: details.tour_plans || '',
      handled_by: details.handled_by || '',
      referred_by: details.referred_by || '',
      comments: details.comments || details.notes || '',
      notes: details.notes || details.comments || '',
      remark: details.remark || '',
      amount: fin.amount || 0,
      discount: fin.discount || 0,
      supplier_cost: fin.supplier_cost || 0,
      refund: fin.refund || 0,
    });
  };

  const handleSaveService = async () => {
    if (!editingServiceId) return;
    setIsSavingService(true);
    try {
      const payload = {
        status: serviceEditData.status,
        details: {
          travel_date: serviceEditData.travel_date,
          departure_date: serviceEditData.departure_date || serviceEditData.travel_date,
          departure_time: serviceEditData.departure_time,
          booking_date: serviceEditData.booking_date,
          destination: serviceEditData.destination,
          visa_expiry_date: serviceEditData.visa_expiry_date,
          visa_issued_date: serviceEditData.visa_issued_date,
          visa_duration: serviceEditData.visa_duration,
          visa_supplier: serviceEditData.visa_supplier,
          supplier_name: serviceEditData.supplier_name,
          tour_plans: serviceEditData.tour_plans,
          handled_by: serviceEditData.handled_by,
          referred_by: serviceEditData.referred_by,
          comments: serviceEditData.comments,
          notes: serviceEditData.notes || serviceEditData.comments,
          remark: serviceEditData.remark,
        },
        financials: {
          amount: Number(serviceEditData.amount),
          discount: Number(serviceEditData.discount),
          supplier_cost: Number(serviceEditData.supplier_cost),
          refund: Number(serviceEditData.refund),
        }
      };
      const res = await quickUpdateService(editingServiceId, payload);
      if (res.success) {
        toast.success('Service updated successfully');
        setEditingServiceId(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update service');
      }
    } catch (e: any) {
      toast.error('Failed to update service');
    } finally {
      setIsSavingService(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/customers" className="p-2 bg-[var(--sidebar-bg)] rounded-full hover:bg-[var(--card-border)] transition-colors">
          <ArrowLeft className="w-4 h-4 opacity-70" />
        </Link>
        <h1 className="text-3xl font-serif font-normal tracking-tight">
          Customer Profile
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT COLUMN - Identity */}
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
                      <span className="opacity-80 font-mono text-xs tracking-wider">{customer.passportNo || customer.passport_no}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Services & Documents */}
        <div className="md:col-span-2 space-y-8">
          {/* Services Tab */}
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
                services.map(service => {
                  const details = (service.details as any) || {};
                  const fin = (service.financials as any) || {};
                  const amount = Number(fin.amount) || 0;
                  const discount = Number(fin.discount) || 0;
                  const receiving = Number(fin.receiving_amount) || (amount - discount);
                  const supplierCost = Number(fin.supplier_cost) || 0;
                  const refund = Number(fin.refund) || 0;
                  const profit = receiving - supplierCost - refund;
                  const balance = Number(fin.balance) || 0;

                  const isEditing = editingServiceId === service.id;

                  const catStr = String(service.category || '').toLowerCase();
                  const isAirTicket = catStr.includes('ticket') || catStr.includes('flight') || catStr.includes('airline') || catStr.includes('air');
                  const isUAEVisa = catStr.includes('uae') || catStr.includes('visit visa') || catStr.includes('inside') || catStr.includes('a2a') || catStr.includes('bus');
                  const isTourPackage = catStr.includes('tour') || catStr.includes('package') || catStr.includes('hotel') || catStr.includes('safari');

                  return (
                    <div key={service.id} className="p-6 rounded-xl bg-[var(--anthropic-surface)] border border-[var(--card-border)] space-y-4 relative">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-serif text-lg flex items-center gap-2">
                            {service.category}
                            {service.reference_id && (
                              <span className="text-xs font-mono text-[#D97757] bg-[#D97757]/10 px-2 py-0.5 rounded font-semibold">
                                {service.reference_id}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {!isEditing && (
                            <div className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded bg-[var(--background)] opacity-80 border border-[var(--card-border)] font-bold">
                              {service.status}
                            </div>
                          )}
                          {!isEditing && (
                            <button
                              onClick={() => handleEditService(service)}
                              className="p-1.5 rounded-md hover:bg-[var(--background)] text-gray-500 hover:text-[#D97757] transition-colors"
                              title="Edit Service"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-4 pt-2 border-t border-[var(--card-border)]">
                          {/* Category-Specific Form Fields */}
                          {isAirTicket ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Status</label>
                                <select
                                  value={serviceEditData.status}
                                  onChange={(e) => setServiceEditData({...serviceEditData, status: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                >
                                  <option value="Open">Open</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Closed">Closed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Departure Date</label>
                                <input
                                  type="date"
                                  value={serviceEditData.departure_date || serviceEditData.travel_date}
                                  onChange={(e) => setServiceEditData({...serviceEditData, departure_date: e.target.value, travel_date: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Destination / Route</label>
                                <input
                                  type="text"
                                  value={serviceEditData.destination}
                                  placeholder="e.g. RGN-BKK"
                                  onChange={(e) => setServiceEditData({...serviceEditData, destination: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Departure Time</label>
                                <input
                                  type="text"
                                  value={serviceEditData.departure_time}
                                  placeholder="e.g. 14:30"
                                  onChange={(e) => setServiceEditData({...serviceEditData, departure_time: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Booking Date</label>
                                <input
                                  type="date"
                                  value={serviceEditData.booking_date}
                                  onChange={(e) => setServiceEditData({...serviceEditData, booking_date: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Handled By (Staff)</label>
                                <input
                                  type="text"
                                  value={serviceEditData.handled_by}
                                  onChange={(e) => setServiceEditData({...serviceEditData, handled_by: e.target.value})}
                                  placeholder="e.g. Staff Name"
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Referred By (Agent)</label>
                                <input
                                  type="text"
                                  value={serviceEditData.referred_by}
                                  onChange={(e) => setServiceEditData({...serviceEditData, referred_by: e.target.value})}
                                  placeholder="e.g. Agent Name"
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                            </div>
                          ) : isUAEVisa ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Status</label>
                                <select
                                  value={serviceEditData.status}
                                  onChange={(e) => setServiceEditData({...serviceEditData, status: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                >
                                  <option value="Open">Open</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Closed">Closed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Travel Date</label>
                                <input
                                  type="date"
                                  value={serviceEditData.travel_date}
                                  onChange={(e) => setServiceEditData({...serviceEditData, travel_date: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Visa Issued Date</label>
                                <input
                                  type="date"
                                  value={serviceEditData.visa_issued_date}
                                  onChange={(e) => setServiceEditData({...serviceEditData, visa_issued_date: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Visa Expiry Date</label>
                                <input
                                  type="date"
                                  value={serviceEditData.visa_expiry_date}
                                  onChange={(e) => setServiceEditData({...serviceEditData, visa_expiry_date: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Visa Duration</label>
                                <input
                                  type="text"
                                  value={serviceEditData.visa_duration}
                                  placeholder="e.g. 30 Days"
                                  onChange={(e) => setServiceEditData({...serviceEditData, visa_duration: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Visa Supplier</label>
                                <input
                                  type="text"
                                  value={serviceEditData.visa_supplier}
                                  placeholder="e.g. DAHR"
                                  onChange={(e) => setServiceEditData({...serviceEditData, visa_supplier: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Handled By (Staff)</label>
                                <input
                                  type="text"
                                  value={serviceEditData.handled_by}
                                  placeholder="e.g. Staff Name"
                                  onChange={(e) => setServiceEditData({...serviceEditData, handled_by: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Referred By (Agent)</label>
                                <input
                                  type="text"
                                  value={serviceEditData.referred_by}
                                  placeholder="e.g. Agent Name"
                                  onChange={(e) => setServiceEditData({...serviceEditData, referred_by: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                            </div>
                          ) : isTourPackage ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Status</label>
                                <select
                                  value={serviceEditData.status}
                                  onChange={(e) => setServiceEditData({...serviceEditData, status: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                >
                                  <option value="Open">Open</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Closed">Closed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Travel Date</label>
                                <input
                                  type="date"
                                  value={serviceEditData.travel_date}
                                  onChange={(e) => setServiceEditData({...serviceEditData, travel_date: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Supplier Name</label>
                                <input
                                  type="text"
                                  value={serviceEditData.supplier_name}
                                  onChange={(e) => setServiceEditData({...serviceEditData, supplier_name: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Tour Plans / Details</label>
                                <input
                                  type="text"
                                  value={serviceEditData.tour_plans}
                                  onChange={(e) => setServiceEditData({...serviceEditData, tour_plans: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Handled By (Staff)</label>
                                <input
                                  type="text"
                                  value={serviceEditData.handled_by}
                                  placeholder="e.g. Staff Name"
                                  onChange={(e) => setServiceEditData({...serviceEditData, handled_by: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Referred By (Agent)</label>
                                <input
                                  type="text"
                                  value={serviceEditData.referred_by}
                                  placeholder="e.g. Agent Name"
                                  onChange={(e) => setServiceEditData({...serviceEditData, referred_by: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Status</label>
                                <select
                                  value={serviceEditData.status}
                                  onChange={(e) => setServiceEditData({...serviceEditData, status: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                >
                                  <option value="Open">Open</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Closed">Closed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Travel Date</label>
                                <input
                                  type="date"
                                  value={serviceEditData.travel_date}
                                  onChange={(e) => setServiceEditData({...serviceEditData, travel_date: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Destination Country</label>
                                <input
                                  type="text"
                                  value={serviceEditData.destination}
                                  onChange={(e) => setServiceEditData({...serviceEditData, destination: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Visa Expiry Date</label>
                                <input
                                  type="date"
                                  value={serviceEditData.visa_expiry_date}
                                  onChange={(e) => setServiceEditData({...serviceEditData, visa_expiry_date: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Handled By (Staff)</label>
                                <input
                                  type="text"
                                  value={serviceEditData.handled_by}
                                  placeholder="e.g. Staff Name"
                                  onChange={(e) => setServiceEditData({...serviceEditData, handled_by: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                              <div>
                                <label className="block text-xs opacity-70 mb-1">Referred By (Agent)</label>
                                <input
                                  type="text"
                                  value={serviceEditData.referred_by}
                                  placeholder="e.g. Agent Name"
                                  onChange={(e) => setServiceEditData({...serviceEditData, referred_by: e.target.value})}
                                  className="input-anthropic w-full text-sm py-1.5"
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--card-border)]">
                            <div>
                              <label className="block text-xs opacity-70 mb-1">Amount</label>
                              <input
                                type="number"
                                value={serviceEditData.amount}
                                onChange={(e) => setServiceEditData({...serviceEditData, amount: e.target.value})}
                                className="input-anthropic w-full text-sm py-1.5"
                              />
                            </div>
                            <div>
                              <label className="block text-xs opacity-70 mb-1">Discount</label>
                              <input
                                type="number"
                                value={serviceEditData.discount}
                                onChange={(e) => setServiceEditData({...serviceEditData, discount: e.target.value})}
                                className="input-anthropic w-full text-sm py-1.5"
                              />
                            </div>
                            <div>
                              <label className="block text-xs opacity-70 mb-1">Supplier Cost</label>
                              <input
                                type="number"
                                value={serviceEditData.supplier_cost}
                                onChange={(e) => setServiceEditData({...serviceEditData, supplier_cost: e.target.value})}
                                className="input-anthropic w-full text-sm py-1.5"
                              />
                            </div>
                            <div>
                              <label className="block text-xs opacity-70 mb-1">Refund</label>
                              <input
                                type="number"
                                value={serviceEditData.refund}
                                onChange={(e) => setServiceEditData({...serviceEditData, refund: e.target.value})}
                                className="input-anthropic w-full text-sm py-1.5"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 pt-2 border-t border-[var(--card-border)]">
                            <div>
                              <label className="block text-xs opacity-70 mb-1">Note / Comments</label>
                              <textarea
                                value={serviceEditData.comments}
                                onChange={(e) => setServiceEditData({...serviceEditData, comments: e.target.value})}
                                className="input-anthropic w-full text-sm py-1.5 min-h-[60px]"
                              />
                            </div>
                            <div>
                              <label className="block text-xs opacity-70 mb-1">Remark</label>
                              <textarea
                                value={serviceEditData.remark}
                                onChange={(e) => setServiceEditData({...serviceEditData, remark: e.target.value})}
                                className="input-anthropic w-full text-sm py-1.5 min-h-[60px]"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-4">
                            <button
                              onClick={() => setEditingServiceId(null)}
                              disabled={isSavingService}
                              className="px-4 py-2 text-sm rounded-md bg-[var(--background)] hover:bg-[var(--card-border)] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveService}
                              disabled={isSavingService}
                              className="px-4 py-2 text-sm rounded-md bg-[#D97757] text-white hover:bg-[#c66446] transition-colors flex items-center gap-2"
                            >
                              {isSavingService ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Service Details Grid - Category Smart */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs opacity-80 border-t border-[var(--card-border)] pt-3">
                            {isAirTicket ? (
                              <>
                                {(details.destination || details.sector) && <div><span className="opacity-50">Destination:</span> <span className="font-medium font-mono text-[#D97757]">{details.destination || details.sector}</span></div>}
                                {(details.departure_date || details.travel_date) && <div><span className="opacity-50">Departure Date:</span> <span className="font-medium">{details.departure_date || details.travel_date}</span></div>}
                                {details.departure_time && <div><span className="opacity-50">Departure Time:</span> <span className="font-medium">{details.departure_time}</span></div>}
                                {details.booking_date && <div><span className="opacity-50">Booking Date:</span> <span className="font-medium">{details.booking_date}</span></div>}
                                {details.handled_by && <div><span className="opacity-50">Handled By:</span> <span className="font-medium">{details.handled_by}</span></div>}
                                {details.referred_by && <div><span className="opacity-50">Referred By:</span> <span className="font-medium">{details.referred_by}</span></div>}
                              </>
                            ) : isUAEVisa ? (
                              <>
                                {details.visa_issued_date && <div><span className="opacity-50">Issued:</span> <span className="font-medium">{details.visa_issued_date}</span></div>}
                                {details.travel_date && <div><span className="opacity-50">Travel:</span> <span className="font-medium">{details.travel_date}</span></div>}
                                {details.visa_expiry_date && <div><span className="opacity-50">Expiry:</span> <span className="font-medium font-mono text-[#D97757]">{details.visa_expiry_date}</span></div>}
                                {details.visa_duration && <div><span className="opacity-50">Duration:</span> <span className="font-medium">{details.visa_duration}</span></div>}
                                {details.visa_supplier && <div><span className="opacity-50">Supplier:</span> <span className="font-medium">{details.visa_supplier}</span></div>}
                                {details.handled_by && <div><span className="opacity-50">Handled By:</span> <span className="font-medium">{details.handled_by}</span></div>}
                                {details.referred_by && <div><span className="opacity-50">Referred By:</span> <span className="font-medium">{details.referred_by}</span></div>}
                              </>
                            ) : isTourPackage ? (
                              <>
                                {details.travel_date && <div><span className="opacity-50">Travel Date:</span> <span className="font-medium">{details.travel_date}</span></div>}
                                {(details.supplier_name || details.visa_supplier) && <div><span className="opacity-50">Supplier:</span> <span className="font-medium">{details.supplier_name || details.visa_supplier}</span></div>}
                                {(details.tour_plans || details.destination) && <div className="col-span-2"><span className="opacity-50">Plans / Details:</span> <span className="font-medium">{details.tour_plans || details.destination}</span></div>}
                                {details.handled_by && <div><span className="opacity-50">Handled By:</span> <span className="font-medium">{details.handled_by}</span></div>}
                                {details.referred_by && <div><span className="opacity-50">Referred By:</span> <span className="font-medium">{details.referred_by}</span></div>}
                              </>
                            ) : (
                              <>
                                {details.destination && <div><span className="opacity-50">Destination:</span> <span className="font-medium font-mono text-[#D97757]">{details.destination}</span></div>}
                                {details.travel_date && <div><span className="opacity-50">Travel:</span> <span className="font-medium">{details.travel_date}</span></div>}
                                {details.visa_expiry_date && <div><span className="opacity-50">Expiry:</span> <span className="font-medium font-mono text-[#D97757]">{details.visa_expiry_date}</span></div>}
                                {details.handled_by && <div><span className="opacity-50">Handled By:</span> <span className="font-medium">{details.handled_by}</span></div>}
                                {details.referred_by && <div><span className="opacity-50">Referred By:</span> <span className="font-medium">{details.referred_by}</span></div>}
                              </>
                            )}

                            {(details.comments || details.notes) && <div className="col-span-2"><span className="opacity-50">Note / Comments:</span> <span className="font-medium">{details.comments || details.notes}</span></div>}
                            {details.remark && <div className="col-span-2"><span className="opacity-50">Remark:</span> <span className="font-medium text-amber-600">{details.remark}</span></div>}
                          </div>

                          {/* Financials Summary */}
                          <div className="mt-4 pt-4 border-t border-[var(--card-border)] bg-[var(--background)] p-3 rounded-lg text-xs space-y-1.5 font-mono">
                            <div className="flex justify-between"><span className="opacity-60">Amount / Rate:</span><span>{amount.toLocaleString()} AED</span></div>
                            {discount > 0 && <div className="flex justify-between text-red-500"><span className="opacity-60">Discount / Agent Fee:</span><span>-{discount.toLocaleString()} AED</span></div>}
                            <div className="flex justify-between font-bold text-blue-600"><span className="opacity-70">Receiving Amount:</span><span>{receiving.toLocaleString()} AED</span></div>
                            <div className="flex justify-between text-amber-600"><span className="opacity-70">Supplier Cost:</span><span>{supplierCost.toLocaleString()} AED</span></div>
                            {refund > 0 && <div className="flex justify-between text-red-500"><span className="opacity-70">Refund:</span><span>-{refund.toLocaleString()} AED</span></div>}
                            <div className="flex justify-between font-bold border-t border-black/10 dark:border-white/10 pt-1.5 text-green-600">
                              <span>Gross Profit (GP):</span>
                              <span>{profit.toLocaleString()} AED</span>
                            </div>
                            {(fin.payment_method || details.payment_method) && (
                              <div className="flex justify-between text-[11px] opacity-60 pt-1">
                                <span>Payment Method:</span>
                                <span>{fin.payment_method || details.payment_method}</span>
                              </div>
                            )}
                            {balance !== 0 && (
                              <div className="flex justify-between text-[11px] opacity-60">
                                <span>Balance:</span>
                                <span>{balance.toLocaleString()} AED</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Invoices Tab */}
          <div className="card-anthropic p-8">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--card-border)]">
              <h3 className="text-lg font-serif">Invoices</h3>
              <Link href={`/dashboard/invoices/new?customerId=${customer.id}`} className="text-sm font-medium text-[#D97757] hover:underline">
                Manual Invoice
              </Link>
            </div>
            <div className="space-y-2">
              {pastInvoices.length === 0 ? (
                <div className="text-sm opacity-50 pb-4">No invoices generated yet.</div>
              ) : (
                pastInvoices.map(inv => (
                  <Link
                    key={inv.id}
                    href={`/dashboard/invoices/${inv.id}`}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-[var(--anthropic-surface)] transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <Receipt className="w-4 h-4 opacity-50 group-hover:text-[#D97757] group-hover:opacity-100 transition-colors" />
                      <div>
                        <div className="text-sm font-medium group-hover:text-[#D97757] transition-colors">{inv.invoiceNumber}</div>
                        <div className="text-xs opacity-50">{inv.date}</div>
                      </div>
                    </div>
                    <div className="font-mono text-sm opacity-80 flex items-center gap-2">
                      <span>{Number(inv.totalAmount).toLocaleString()} AED</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#D97757] ml-1">View →</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Documents Section */}
          <CustomerDocumentsSection
            documents={documents}
            onOpenModal={() => setIsDocsModalOpen(true)}
          />
        </div>
      </div>

      <NewServiceDialog
        isOpen={isServiceDialogOpen}
        onClose={() => setIsServiceDialogOpen(false)}
        customerId={customer.id}
        customerName={customer.name}
        customerMetadata={customer.metadata}
      />

      <DocumentModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        customerId={customer.id}
        customerName={customer.name}
      />
    </div>
  );
}