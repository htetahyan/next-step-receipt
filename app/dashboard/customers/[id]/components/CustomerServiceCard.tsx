'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Pencil, Check, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { quickUpdateService } from '@/app/actions/services';
import { parseFinancialNumber } from '@/lib/financialUtils';
import { SERVICE_STATUSES } from '@/lib/service-constants';
import { mapCategoryToModule } from '@/lib/auth-permissions';

interface CustomerServiceCardProps {
  service: any;
  onUpdated?: () => void;
}

export function CustomerServiceCard({ service, onUpdated }: CustomerServiceCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const details = (service.details as any) || {};
  const fin = (service.financials as any) || {};

  const amount = parseFinancialNumber(fin.amount, 0);
  const discount = parseFinancialNumber(fin.discount, 0);
  const receiving = parseFinancialNumber(fin.receiving_amount, amount - discount);
  const supplierCost = parseFinancialNumber(fin.supplier_cost, 0);
  const refund = parseFinancialNumber(fin.refund, 0);
  const profit = receiving - supplierCost - refund;
  const balance = parseFinancialNumber(fin.balance, 0);

  const moduleKey = mapCategoryToModule(service.category);
  const isAirTicket = moduleKey === 'air_tickets';
  const isTourPackage = moduleKey === 'tour_packages';
  const isOtherVisa = moduleKey === 'other_visa';
  const isCustomService = moduleKey === 'custom_service';
  const isUAEVisa = moduleKey === 'uae_visa';

  let editUrl = `/dashboard/uae-visa/${service.id}`;
  if (isAirTicket) editUrl = `/dashboard/air-tickets/${service.id}`;
  else if (isTourPackage) editUrl = `/dashboard/tour-packages/${service.id}`;
  else if (isOtherVisa) editUrl = `/dashboard/other-visa/${service.id}`;
  else if (isCustomService) editUrl = `/dashboard/custom-service/${service.id}`;

  const [editForm, setEditForm] = useState({
    reference_id: service.reference_id || '',
    status: service.status || 'Open',
    category: service.category || '',
    amount: String(amount),
    discount: String(discount),
    supplier_cost: String(supplierCost),
    refund: String(refund),
    payment_method: fin.payment_method || details.payment_method || 'Bank Transfer',
    // Details
    travel_date: details.travel_date || details.departure_date || '',
    return_date: details.return_date || '',
    visa_issued_date: details.visa_issued_date || '',
    visa_expiry_date: details.visa_expiry_date || '',
    visa_duration: details.visa_duration || '30 Days',
    visa_supplier: details.visa_supplier || details.supplier_name || '',
    supplier_name: details.supplier_name || details.visa_supplier || '',
    airline: details.airline || '',
    sector: details.sector || details.destination || '',
    pnr: details.pnr || '',
    ticket_no: details.ticket_no || '',
    tour_plans: details.tour_plans || '',
    destination: details.destination || '',
    departure_time: details.departure_time || '',
    booking_date: details.booking_date || '',
    handled_by: details.handled_by || '',
    referred_by: details.referred_by || '',
    comments: details.comments || details.notes || '',
    remark: details.remark || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const numAmount = parseFinancialNumber(editForm.amount, 0);
      const numDiscount = parseFinancialNumber(editForm.discount, 0);
      const numSupplierCost = parseFinancialNumber(editForm.supplier_cost, 0);
      const numRefund = parseFinancialNumber(editForm.refund, 0);
      const receivingAmount = numAmount - numDiscount;
      const calcBalance = receivingAmount - numSupplierCost - numRefund;

      const updatedPayload = {
        reference_id: editForm.reference_id ? editForm.reference_id.trim().toUpperCase() : null,
        category: editForm.category || service.category,
        status: editForm.status,
        details: {
          ...details,
          travel_date: editForm.travel_date || null,
          return_date: editForm.return_date || null,
          visa_issued_date: editForm.visa_issued_date || null,
          visa_expiry_date: editForm.visa_expiry_date || null,
          visa_duration: editForm.visa_duration || null,
          visa_supplier: editForm.visa_supplier || editForm.supplier_name || null,
          supplier_name: editForm.supplier_name || editForm.visa_supplier || null,
          airline: editForm.airline || null,
          sector: editForm.sector || null,
          pnr: editForm.pnr || null,
          ticket_no: editForm.ticket_no || null,
          tour_plans: editForm.tour_plans || null,
          destination: editForm.destination || null,
          departure_time: editForm.departure_time || null,
          booking_date: editForm.booking_date || null,
          handled_by: editForm.handled_by || null,
          referred_by: editForm.referred_by || null,
          comments: editForm.comments || null,
          remark: editForm.remark || null,
        },
        financials: {
          ...fin,
          amount: numAmount,
          discount: numDiscount,
          receiving_amount: receivingAmount,
          supplier_cost: numSupplierCost,
          refund: numRefund,
          balance: calcBalance,
          payment_method: editForm.payment_method,
        },
      };

      const res = await quickUpdateService(service.id, updatedPayload);
      if (res.success) {
        toast.success('Service updated successfully');
        setIsEditing(false);
        if (onUpdated) onUpdated();
      } else {
        toast.error(res.error || 'Failed to update service');
      }
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 rounded-xl bg-[var(--anthropic-surface)] border border-[var(--card-border)] space-y-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-serif text-lg flex items-center gap-2">
            <span>{service.category}</span>
            {details?.passengers && details.passengers.length > 1 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D97757]/15 text-[#D97757] font-sans font-semibold font-mono">
                {details.passengers.length} Pax
              </span>
            )}
          </div>
          {isEditing ? (
            <input
              type="text"
              value={editForm.reference_id}
              onChange={e => setEditForm({ ...editForm, reference_id: e.target.value.toUpperCase() })}
              placeholder="Ref ID"
              className="text-xs font-mono text-[#D97757] bg-[var(--background)] px-2 py-0.5 rounded font-semibold border border-[var(--card-border)] w-24 uppercase focus:outline-none focus:ring-1 focus:ring-[#D97757]"
              title="Edit Reference ID"
            />
          ) : (
            service.reference_id && (
              <span className="text-xs font-mono text-[#D97757] bg-[#D97757]/10 px-2 py-0.5 rounded font-semibold">
                {service.reference_id}
              </span>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <div className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded bg-[var(--background)] opacity-80 border border-[var(--card-border)] font-bold">
              {service.status}
            </div>
          )}
          {!isEditing ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md hover:bg-[var(--background)] text-gray-500 hover:text-[#D97757] transition-colors"
                title="Quick Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <Link
                href={editUrl}
                className="p-1.5 rounded-md hover:bg-[var(--background)] text-gray-500 hover:text-[#D97757] transition-colors"
                title="Full Edit Page"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-md hover:bg-[var(--background)] text-gray-500 hover:text-red-500 transition-colors"
              title="Cancel Edit"
            >
              <X className="w-4 h-4" />
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
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                >
                  {SERVICE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Departure Date</label>
                <input
                  type="date"
                  value={editForm.travel_date}
                  onChange={(e) => setEditForm({ ...editForm, travel_date: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Airline</label>
                <input
                  type="text"
                  value={editForm.airline}
                  placeholder="e.g. Emirates"
                  onChange={(e) => setEditForm({ ...editForm, airline: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Sector (Route)</label>
                <input
                  type="text"
                  value={editForm.sector}
                  placeholder="e.g. DXB-LHR"
                  onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">PNR</label>
                <input
                  type="text"
                  value={editForm.pnr}
                  onChange={(e) => setEditForm({ ...editForm, pnr: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Ticket No</label>
                <input
                  type="text"
                  value={editForm.ticket_no}
                  onChange={(e) => setEditForm({ ...editForm, ticket_no: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
            </div>
          ) : isUAEVisa ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs opacity-70 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                >
                  {SERVICE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Travel Date</label>
                <input
                  type="date"
                  value={editForm.travel_date}
                  onChange={(e) => setEditForm({ ...editForm, travel_date: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Issued Date</label>
                <input
                  type="date"
                  value={editForm.visa_issued_date}
                  onChange={(e) => setEditForm({ ...editForm, visa_issued_date: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editForm.visa_expiry_date}
                  onChange={(e) => setEditForm({ ...editForm, visa_expiry_date: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Duration</label>
                <select
                  value={editForm.visa_duration}
                  onChange={(e) => setEditForm({ ...editForm, visa_duration: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                >
                  <option value="30 Days">30 Days</option>
                  <option value="60 Days">60 Days</option>
                  <option value="90 Days">90 Days</option>
                  <option value="48 Hours">48 Hours</option>
                  <option value="96 Hours">96 Hours</option>
                </select>
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Supplier</label>
                <input
                  type="text"
                  value={editForm.visa_supplier}
                  onChange={(e) => setEditForm({ ...editForm, visa_supplier: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
            </div>
          ) : isTourPackage ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs opacity-70 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                >
                  {SERVICE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Travel Date</label>
                <input
                  type="date"
                  value={editForm.travel_date}
                  onChange={(e) => setEditForm({ ...editForm, travel_date: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Supplier</label>
                <input
                  type="text"
                  value={editForm.supplier_name}
                  onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Tour Plans / Details</label>
                <input
                  type="text"
                  value={editForm.tour_plans}
                  onChange={(e) => setEditForm({ ...editForm, tour_plans: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs opacity-70 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                >
                  {SERVICE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Travel Date</label>
                <input
                  type="date"
                  value={editForm.travel_date}
                  onChange={(e) => setEditForm({ ...editForm, travel_date: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Supplier</label>
                <input
                  type="text"
                  value={editForm.visa_supplier}
                  onChange={(e) => setEditForm({ ...editForm, visa_supplier: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs opacity-70 mb-1">Destination</label>
                <input
                  type="text"
                  value={editForm.destination}
                  onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                  className="input-anthropic w-full text-sm py-1.5"
                />
              </div>
            </div>
          )}

          {/* Financials Quick Edit */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--background)] p-3 rounded-lg border border-[var(--card-border)]">
            <div>
              <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1">Amount</label>
              <input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                className="input-anthropic w-full text-xs py-1"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1">Discount</label>
              <input
                type="number"
                value={editForm.discount}
                onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })}
                className="input-anthropic w-full text-xs py-1"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1">Supplier Cost</label>
              <input
                type="number"
                value={editForm.supplier_cost}
                onChange={(e) => setEditForm({ ...editForm, supplier_cost: e.target.value })}
                className="input-anthropic w-full text-xs py-1"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider opacity-60 mb-1">Payment Method</label>
              <select
                value={editForm.payment_method}
                onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                className="input-anthropic w-full text-xs py-1"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-xs rounded-md bg-[var(--background)] hover:bg-[var(--card-border)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 text-xs rounded-md bg-[#D97757] text-white hover:bg-[#c66446] transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Multi-Pax Travelers Roster */}
          {details?.passengers && details.passengers.length > 1 && (
            <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--card-border)] space-y-1.5 text-xs">
              <div className="font-semibold text-[#D97757] text-[11px] flex items-center justify-between">
                <span>Travelers ({details.passengers.length} Pax):</span>
                <span className="opacity-60 font-mono">Group Booking</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {details.passengers.map((pax: any, i: number) => (
                  <div key={pax.id || i} className="px-2 py-1 rounded bg-[var(--anthropic-surface)] border border-[var(--card-border)] font-mono text-[11px]">
                    <span className="font-semibold">{i + 1}. {pax.name}</span>
                    {pax.passport_no && <span className="opacity-70 ml-1">({pax.passport_no})</span>}
                    {pax.ticket_no && <span className="text-[#D97757] ml-1">Tkt: {pax.ticket_no}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Details Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs opacity-80 border-t border-[var(--card-border)] pt-3">
            {isAirTicket ? (
              <>
                {(details.destination || details.sector) && (
                  <div>
                    <span className="opacity-50">Destination:</span>{' '}
                    <span className="font-medium font-mono text-[#D97757]">
                      {details.destination || details.sector}
                    </span>
                  </div>
                )}
                {details.airline && (
                  <div>
                    <span className="opacity-50">Airline:</span> <span className="font-medium">{details.airline}</span>
                  </div>
                )}
                {(details.departure_date || details.travel_date) && (
                  <div>
                    <span className="opacity-50">Departure Date:</span>{' '}
                    <span className="font-medium">{details.departure_date || details.travel_date}</span>
                  </div>
                )}
                {details.pnr && (
                  <div>
                    <span className="opacity-50">PNR:</span> <span className="font-mono font-medium">{details.pnr}</span>
                  </div>
                )}
                {details.ticket_no && (
                  <div>
                    <span className="opacity-50">Ticket No:</span>{' '}
                    <span className="font-mono font-medium">{details.ticket_no}</span>
                  </div>
                )}
              </>
            ) : isUAEVisa ? (
              <>
                {details.visa_issued_date && (
                  <div>
                    <span className="opacity-50">Issued:</span>{' '}
                    <span className="font-medium">{details.visa_issued_date}</span>
                  </div>
                )}
                {details.travel_date && (
                  <div>
                    <span className="opacity-50">Travel:</span>{' '}
                    <span className="font-medium">{details.travel_date}</span>
                  </div>
                )}
                {details.visa_expiry_date && (
                  <div>
                    <span className="opacity-50">Expiry:</span>{' '}
                    <span className="font-medium font-mono text-[#D97757]">{details.visa_expiry_date}</span>
                  </div>
                )}
                {details.visa_duration && (
                  <div>
                    <span className="opacity-50">Duration:</span>{' '}
                    <span className="font-medium">{details.visa_duration}</span>
                  </div>
                )}
                {details.visa_supplier && (
                  <div>
                    <span className="opacity-50">Supplier:</span>{' '}
                    <span className="font-medium">{details.visa_supplier}</span>
                  </div>
                )}
              </>
            ) : isTourPackage ? (
              <>
                {details.travel_date && (
                  <div>
                    <span className="opacity-50">Travel Date:</span>{' '}
                    <span className="font-medium">{details.travel_date}</span>
                  </div>
                )}
                {(details.supplier_name || details.visa_supplier) && (
                  <div>
                    <span className="opacity-50">Supplier:</span>{' '}
                    <span className="font-medium">{details.supplier_name || details.visa_supplier}</span>
                  </div>
                )}
                {(details.tour_plans || details.destination) && (
                  <div className="col-span-2">
                    <span className="opacity-50">Plans / Details:</span>{' '}
                    <span className="font-medium">{details.tour_plans || details.destination}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {details.destination && (
                  <div>
                    <span className="opacity-50">Destination:</span>{' '}
                    <span className="font-medium font-mono text-[#D97757]">{details.destination}</span>
                  </div>
                )}
                {details.travel_date && (
                  <div>
                    <span className="opacity-50">Travel:</span>{' '}
                    <span className="font-medium">{details.travel_date}</span>
                  </div>
                )}
                {details.visa_expiry_date && (
                  <div>
                    <span className="opacity-50">Expiry:</span>{' '}
                    <span className="font-medium font-mono text-[#D97757]">{details.visa_expiry_date}</span>
                  </div>
                )}
              </>
            )}

            {details.handled_by && (
              <div>
                <span className="opacity-50">Handled By:</span> <span className="font-medium">{details.handled_by}</span>
              </div>
            )}
            {details.referred_by && (
              <div>
                <span className="opacity-50">Referred By:</span>{' '}
                <span className="font-medium">{details.referred_by}</span>
              </div>
            )}
            {(details.comments || details.notes) && (
              <div className="col-span-2">
                <span className="opacity-50">Note / Comments:</span>{' '}
                <span className="font-medium">{details.comments || details.notes}</span>
              </div>
            )}
            {details.remark && (
              <div className="col-span-2">
                <span className="opacity-50">Remark:</span>{' '}
                <span className="font-medium text-amber-600">{details.remark}</span>
              </div>
            )}
          </div>

          {/* Financials Summary */}
          <div className="mt-4 pt-4 border-t border-[var(--card-border)] bg-[var(--background)] p-3 rounded-lg text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="opacity-60">Amount / Rate:</span>
              <span>{amount.toLocaleString()} AED</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-500">
                <span className="opacity-60">Discount / Agent Fee:</span>
                <span>-{discount.toLocaleString()} AED</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-blue-600">
              <span className="opacity-70">Receiving Amount:</span>
              <span>{receiving.toLocaleString()} AED</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span className="opacity-70">Supplier Cost:</span>
              <span>{supplierCost.toLocaleString()} AED</span>
            </div>
            {refund > 0 && (
              <div className="flex justify-between text-red-500">
                <span className="opacity-70">Refund:</span>
                <span>-{refund.toLocaleString()} AED</span>
              </div>
            )}
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
}
