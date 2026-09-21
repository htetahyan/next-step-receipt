'use client';

import Link from 'next/link';
import { Check, CheckCircle, Copy, Edit3, Loader2, MessageCircle, Pencil, Phone, PlusCircle, Shield, Trash2, X } from 'lucide-react';
import Pagination from '@/components/Pagination';
import VisaStatusControl from './VisaStatusControl';
import { DateInfo, ExpiryInfo, getWhatsAppUrl } from '@/lib/visaTracker';

export default function VisaListTable({
  items,
  density,
  dateInfo,
  getExpiryInfo,
  canEdit,
  canDelete,
  statusSavingId,
  editingRefId,
  isSavingRef,
  deletingId,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onOpen,
  onStatus,
  onSaveRef,
  setEditingRefId,
  onDeleteTarget,
}: {
  items: any[];
  density: 'compact' | 'normal';
  dateInfo: DateInfo;
  getExpiryInfo: (s: any) => ExpiryInfo;
  canEdit: boolean;
  canDelete: boolean;
  statusSavingId: string | null;
  editingRefId: { id: string; value: string } | null;
  isSavingRef: boolean;
  deletingId: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (p: number) => void;
  onOpen: (s: any) => void;
  onStatus: (id: string, status: string) => void;
  onSaveRef: (id: string, value: string) => void;
  setEditingRefId: (v: { id: string; value: string } | null) => void;
  onDeleteTarget: (t: { id: string; ref: string; name: string }) => void;
}) {
  const th = density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs';
  void dateInfo;

  return (
    <div className="card-anthropic overflow-hidden">
      <div className="overflow-x-auto max-h-[calc(100vh-230px)] relative">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] uppercase tracking-wider opacity-90">
            <tr>
              {['Ref ID', 'Customer / Phone', 'Mode / Category', 'Supplier', 'Duration', 'Visa Expiry'].map((h) => (
                <th key={h} className={`${th} font-semibold`}>{h}</th>
              ))}
              <th className={`${th} font-semibold text-right`}>Amount</th>
              <th className={`${th} font-semibold text-right`}>Receiving</th>
              <th className={`${th} font-semibold text-right`}>Supplier Cost</th>
              <th className={`${th} font-semibold`}>Payment</th>
              <th className={`${th} font-semibold`}>Status</th>
              <th className={`${th} font-semibold text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {items.map((service) => (
              <VisaRow
                key={service.id}
                service={service}
                density={density}
                info={getExpiryInfo(service)}
                canEdit={canEdit}
                canDelete={canDelete}
                statusSavingId={statusSavingId}
                editingRefId={editingRefId}
                isSavingRef={isSavingRef}
                deletingId={deletingId}
                onOpen={onOpen}
                onStatus={onStatus}
                onSaveRef={onSaveRef}
                setEditingRefId={setEditingRefId}
                onDeleteTarget={onDeleteTarget}
              />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-16 text-center">
                  <div className="inline-flex flex-col items-center gap-3">
                    <Shield className="w-10 h-10 opacity-20" />
                    <p className="opacity-50 font-serif">No visa records found.</p>
                    <Link href="/dashboard/uae-visa/new" className="text-[#D97757] text-sm font-medium hover:underline">Add your first record</Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={onPageChange} />
    </div>
  );
}

function VisaRow({
  service, density, info, canEdit, canDelete, statusSavingId, editingRefId, isSavingRef, deletingId,
  onOpen, onStatus, onSaveRef, setEditingRefId, onDeleteTarget,
}: any) {
  const customer = service.customers;
  const details = service.details || {};
  const fin = service.financials || {};
  const { expiryStr, isExpiringThisMonth, isExpiringNextMonth, isExpired, daysRemaining } = info;
  const phoneNum = customer?.phone || details?.phone;
  const cellPad = density === 'compact' ? 'px-3 py-1.5' : 'px-4 py-2.5';
  const wa = getWhatsAppUrl(phoneNum, customer?.name || details?.customer_name, service.reference_id, expiryStr);

  return (
    <tr
      onClick={() => onOpen(service)}
      className={`hover:bg-[var(--sidebar-bg)] cursor-pointer group ${isExpired ? 'bg-red-500/5' : isExpiringThisMonth ? 'bg-amber-500/5' : ''}`}
    >
      <td className={cellPad} onClick={(e) => canEdit && e.stopPropagation()}>
        {editingRefId?.id === service.id ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editingRefId?.value || ''}
              onChange={(e) => setEditingRefId({ id: service.id, value: e.target.value.toUpperCase() })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editingRefId) onSaveRef(service.id, editingRefId.value);
                if (e.key === 'Escape') setEditingRefId(null);
              }}
              autoFocus
              className="px-1.5 py-0.5 text-xs font-mono font-bold w-24 rounded border border-[#D97757] bg-[var(--background)] text-[#D97757] uppercase"
            />
            <button disabled={isSavingRef} onClick={() => editingRefId && onSaveRef(service.id, editingRefId.value)} className="p-1 text-emerald-600">
              {isSavingRef ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setEditingRefId(null)} className="p-1 text-red-500"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <div className={`inline-flex items-center gap-1.5 ${canEdit ? 'cursor-pointer' : ''}`} onClick={() => canEdit && setEditingRefId({ id: service.id, value: service.reference_id || '' })}>
            <span className="font-mono text-xs text-[#D97757] font-bold">{service.reference_id || '—'}</span>
            {canEdit && <Pencil className="w-3 h-3 opacity-40 text-[#D97757]" />}
          </div>
        )}
      </td>
      <td className={cellPad}>
        <div className="font-semibold text-sm">{customer?.name || details?.customer_name || '—'}</div>
        <div className="text-[11px] opacity-70 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span>Pass: {customer?.passport_no || details?.passport_no || '—'}</span>
          {phoneNum && (
            <>
              <span className="text-[#D97757] font-sans font-semibold flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{phoneNum}</span>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-emerald-600">
                  <MessageCircle className="w-3 h-3" />
                </a>
              )}
            </>
          )}
        </div>
      </td>
      <td className={`${cellPad} text-xs font-medium`}>{service.category}</td>
      <td className={`${cellPad} text-xs`}>{details?.visa_supplier || '—'}</td>
      <td className={`${cellPad} text-xs`}>{details?.visa_duration || '—'}</td>
      <td className={`${cellPad} text-xs`}>
        {expiryStr ? (
          <div className={`font-mono font-semibold ${isExpired ? 'text-red-600' : isExpiringThisMonth ? 'text-amber-600' : ''}`}>
            {expiryStr}
            {(isExpired || isExpiringThisMonth || isExpiringNextMonth) && (
              <div className="text-[9px] uppercase font-bold mt-0.5">{isExpired ? 'Expired' : `${daysRemaining}d`}</div>
            )}
          </div>
        ) : <span className="opacity-40">—</span>}
      </td>
      <td className={`${cellPad} text-right font-mono text-xs`}>{Number(fin?.amount || 0).toLocaleString()}</td>
      <td className={`${cellPad} text-right font-mono text-xs text-blue-600 font-semibold`}>{Number(fin?.receiving_amount || 0).toLocaleString()}</td>
      <td className={`${cellPad} text-right font-mono text-xs text-amber-600`}>{Number(fin?.supplier_cost || 0).toLocaleString()}</td>
      <td className={`${cellPad} text-xs capitalize`}>{fin?.payment_method || details?.payment_method || '—'}</td>
      <td className={cellPad}>
        <VisaStatusControl
          status={service.status}
          expired={!!isExpired}
          canEdit={canEdit}
          saving={statusSavingId === service.id}
          onChange={(next) => onStatus(service.id, next)}
        />
      </td>
      <td className={`${cellPad} text-right`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
          <button onClick={() => onOpen(service)} className="p-1 text-[#D97757]" title="Quick Edit"><Edit3 className="w-3.5 h-3.5" /></button>
          <Link href={`/dashboard/uae-visa/new?customerId=${service.customer_id}`} className="p-1 text-blue-600" title="Extend"><PlusCircle className="w-3.5 h-3.5" /></Link>
          {canEdit && service.status !== 'Closed' && (
            <button onClick={() => onStatus(service.id, 'Closed')} className="p-1 text-green-600" title="Close"><CheckCircle className="w-3.5 h-3.5" /></button>
          )}
          <Link href={`/dashboard/uae-visa/new?duplicate=${service.id}&customerId=${service.customer_id || ''}`} className="p-1" title="Duplicate"><Copy className="w-3.5 h-3.5" /></Link>
          {canDelete && (
            <button
              onClick={() => onDeleteTarget({ id: service.id, ref: service.reference_id, name: customer?.name || details?.customer_name || 'Visa Record' })}
              disabled={deletingId === service.id}
              className="p-1 hover:text-red-500"
            >
              {deletingId === service.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
