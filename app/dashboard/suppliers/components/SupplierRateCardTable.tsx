'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getRateCards, upsertRateCard, deleteRateCard, bulkImportRateCards, RateCard } from '@/app/actions/rate-cards';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Save, FileSpreadsheet, ChevronDown, ChevronRight } from 'lucide-react';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';

interface Supplier {
  id: string;
  name: string;
}

interface Props {
  suppliers: Supplier[];
  canEdit: boolean;
  canDelete?: boolean;
}

export default function SupplierRateCardTable({ suppliers, canEdit, canDelete = false }: Props) {
  const [rows, setRows] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getRateCards();
    if (res.success) {
      setRows(res.data);
    } else {
      toast.error(res.error || 'Failed to load rate cards');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const sections = useMemo(() => {
    const grouped: Record<string, RateCard[]> = {};
    rows.forEach(r => {
      const sec = r.section || 'Visa';
      if (!grouped[sec]) grouped[sec] = [];
      grouped[sec].push(r);
    });
    return grouped;
  }, [rows]);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  };

  const handleCellSave = async (row: RateCard, field: string, value: string) => {
    if (!canEdit) return;
    setSaving(row.id + field);
    const payload: any = {};

    if (field.startsWith('supplier:')) {
      const supplierName = field.replace('supplier:', '');
      payload.supplier_costs = { ...row.supplier_costs, [supplierName]: value };
    } else {
      payload[field] = value;
    }

    const res = await upsertRateCard(row.id, payload);
    if (res.success && res.data) {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...res.data } : r));
    } else {
      toast.error('Failed to save');
    }
    setSaving(null);
  };

  const handleAddRow = async (section: string) => {
    const maxSort = rows.filter(r => r.section === section).reduce((max, r) => Math.max(max, r.sort_order), 0);
    const res = await upsertRateCard(null, {
      visa_type: 'New Entry',
      section,
      sort_order: maxSort + 1,
      supplier_costs: {},
      selling_price: '',
      sub_agent_price: '',
      other_agent_price: '',
      remark: '',
      required_documents: '',
    });
    if (res.success && res.data) {
      setRows(prev => [...prev, res.data!]);
      toast.success('Row added');
    } else {
      toast.error('Failed to add row');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deleteRateCard(deleteTarget.id);
    setIsDeleting(false);
    if (res.success) {
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
      toast.success('Rate card entry deleted');
      setDeleteTarget(null);
    } else {
      toast.error(res.error || 'Failed to delete');
    }
  };

  const handleSeedData = async () => {
    if (rows.length > 0) {
      if (!confirm('Rate card already has data. This will add the default entries. Continue?')) return;
    }
    toast.loading('Importing default rate card data...', { id: 'seed' });
    const seedRows = getDefaultRateCardData(suppliers);
    const res = await bulkImportRateCards(seedRows);
    if (res.success) {
      toast.success(`Imported ${res.count} entries`, { id: 'seed' });
      loadData();
    } else {
      toast.error(res.error || 'Import failed', { id: 'seed' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#D97757]" />
        <span className="text-sm opacity-60">Loading rate card...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm opacity-60">
          {rows.length} entries across {Object.keys(sections).length} section(s)
        </p>
        {canEdit && (
          <div className="flex items-center gap-2">
            {rows.length === 0 && (
              <button onClick={handleSeedData} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Import Default Rates
              </button>
            )}
            <button onClick={() => handleAddRow('Visa')} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#D97757] text-white rounded-lg hover:opacity-90 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Visa Row
            </button>
            <button onClick={() => handleAddRow('Other Services')} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[var(--card-border)] rounded-lg hover:bg-[var(--sidebar-bg)] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Other Service
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--sidebar-bg)] border-b border-[var(--card-border)]">
                <th className="px-3 py-2.5 text-left font-semibold sticky left-0 bg-[var(--sidebar-bg)] z-10 min-w-[200px]">Visa Type & Duration</th>
                {suppliers.map(s => (
                  <th key={s.id} className="px-3 py-2.5 text-center font-semibold min-w-[100px] whitespace-nowrap">{s.name}</th>
                ))}
                <th className="px-3 py-2.5 text-center font-semibold min-w-[130px] text-[#D97757]">Selling Price</th>
                <th className="px-3 py-2.5 text-center font-semibold min-w-[120px]">Sub-Agent Price</th>
                <th className="px-3 py-2.5 text-center font-semibold min-w-[120px]">Other Agent</th>
                <th className="px-3 py-2.5 text-left font-semibold min-w-[150px]">Remark</th>
                <th className="px-3 py-2.5 text-left font-semibold min-w-[200px]">Required Documents</th>
                {canEdit && <th className="px-3 py-2.5 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {Object.entries(sections).map(([section, sectionRows]) => (
                <React.Fragment key={section}>
                  <tr className="bg-[var(--sidebar-bg)]/60 cursor-pointer" onClick={() => toggleSection(section)}>
                    <td colSpan={suppliers.length + 6 + (canEdit ? 1 : 0)} className="px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-[#D97757]">
                      <div className="flex items-center gap-1.5">
                        {collapsedSections.has(section) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {section} ({sectionRows.length})
                      </div>
                    </td>
                  </tr>
                  {!collapsedSections.has(section) && sectionRows.map(row => (
                    <tr key={row.id} className="border-b border-[var(--card-border)] hover:bg-[var(--sidebar-bg)]/40 transition-colors">
                      <td className="px-1 py-1 sticky left-0 bg-[var(--background)] z-10">
                        <EditableCell value={row.visa_type} onSave={v => handleCellSave(row, 'visa_type', v)} isSaving={saving === row.id + 'visa_type'} canEdit={canEdit} className="font-semibold" />
                      </td>
                      {suppliers.map(s => (
                        <td key={s.id} className="px-1 py-1 text-center">
                          <EditableCell value={row.supplier_costs?.[s.name] || ''} onSave={v => handleCellSave(row, `supplier:${s.name}`, v)} isSaving={saving === row.id + `supplier:${s.name}`} canEdit={canEdit} className="font-mono text-center" />
                        </td>
                      ))}
                      <td className="px-1 py-1 text-center">
                        <EditableCell value={row.selling_price} onSave={v => handleCellSave(row, 'selling_price', v)} isSaving={saving === row.id + 'selling_price'} canEdit={canEdit} className="font-mono text-center font-semibold text-[#D97757]" />
                      </td>
                      <td className="px-1 py-1 text-center">
                        <EditableCell value={row.sub_agent_price} onSave={v => handleCellSave(row, 'sub_agent_price', v)} isSaving={saving === row.id + 'sub_agent_price'} canEdit={canEdit} className="font-mono text-center" />
                      </td>
                      <td className="px-1 py-1 text-center">
                        <EditableCell value={row.other_agent_price} onSave={v => handleCellSave(row, 'other_agent_price', v)} isSaving={saving === row.id + 'other_agent_price'} canEdit={canEdit} className="font-mono text-center" />
                      </td>
                      <td className="px-1 py-1">
                        <EditableCell value={row.remark} onSave={v => handleCellSave(row, 'remark', v)} isSaving={saving === row.id + 'remark'} canEdit={canEdit} />
                      </td>
                      <td className="px-1 py-1">
                        <EditableCell value={row.required_documents} onSave={v => handleCellSave(row, 'required_documents', v)} isSaving={saving === row.id + 'required_documents'} canEdit={canEdit} />
                      </td>
                      {canDelete && (
                        <td className="px-1 py-1 text-center">
                          <button
                            onClick={() => setDeleteTarget({ id: row.id, name: row.visa_type })}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors opacity-40 hover:opacity-100 cursor-pointer"
                            title="Delete row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="border border-dashed border-[var(--card-border)] rounded-xl py-12 text-center">
          <FileSpreadsheet className="h-10 w-10 mx-auto opacity-30 text-[#D97757] mb-3" />
          <h3 className="font-serif text-lg mb-1">No Rate Card Data</h3>
          <p className="text-xs opacity-50 max-w-sm mx-auto mb-4">Import the default visa pricing data or add entries manually.</p>
          {canEdit && (
            <button onClick={handleSeedData} className="px-5 py-2.5 bg-[#D97757] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors">
              Import Default Rates
            </button>
          )}
        </div>
      )}

      {/* Delete Rate Card Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Rate Card Row"
        itemType="rate card entry"
        itemName={deleteTarget?.name || ''}
        isDeleting={isDeleting}
        description="Are you sure you want to delete this pricing row from the rate card? This action cannot be undone."
      />
    </div>
  );
}

// Inline editable cell component
function EditableCell({ value, onSave, isSaving, canEdit, className = '' }: {
  value: string;
  onSave: (v: string) => void;
  isSaving: boolean;
  canEdit: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  if (!canEdit) {
    return <span className={`block px-2 py-1.5 ${className}`}>{value || '—'}</span>;
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft !== value) onSave(draft); }}
        onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); if (draft !== value) onSave(draft); } if (e.key === 'Escape') { setEditing(false); setDraft(value); } }}
        className={`w-full px-2 py-1 border border-[#D97757] rounded bg-[var(--background)] outline-none text-xs ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => { setEditing(true); setDraft(value); }}
      className={`block px-2 py-1.5 cursor-pointer hover:bg-[var(--card-border)]/40 rounded transition-colors min-h-[28px] ${className} ${isSaving ? 'opacity-50' : ''}`}
      title="Click to edit"
    >
      {value || <span className="opacity-20">—</span>}
    </span>
  );
}

// Default seed data matching user's CSV
function getDefaultRateCardData(suppliers: Supplier[]) {
  const s = (costs: Record<string, string>) => {
    const mapped: Record<string, string> = {};
    for (const [name, val] of Object.entries(costs)) {
      const supplier = suppliers.find(sup => sup.name.toLowerCase().includes(name.toLowerCase()));
      if (supplier) mapped[supplier.name] = val;
      else mapped[name] = val;
    }
    return mapped;
  };

  return [
    { visa_type: 'Visit Visa (30 Days)', section: 'Visa', sort_order: 1, supplier_costs: s({ 'AKSM': '285', 'DAHR': '290', 'Select': '290' }), selling_price: '449 ( EID+500/1000 )', sub_agent_price: '400', other_agent_price: '400', remark: '', required_documents: '(1) Photo (2) Passport (3) Passport cover page (other nationality)' },
    { visa_type: 'Visit Visa (60 Days)', section: 'Visa', sort_order: 2, supplier_costs: s({ 'AKSM': '410', 'DAHR': '425', 'Select': '415' }), selling_price: '649 ( EID+500/1000 )', sub_agent_price: '550', other_agent_price: '550', remark: '', required_documents: '' },
    { visa_type: 'Visit Visa (Kids, 30 Days)', section: 'Visa', sort_order: 3, supplier_costs: s({ 'DAHR': '40' }), selling_price: '250 ( EID+500 )', sub_agent_price: '200', other_agent_price: '', remark: 'Must apply together with parents', required_documents: '(1) Photo (2) Passport (3) Passport cover page (other nationality) (4) Birth Certificate' },
    { visa_type: 'Visit Visa (Kids, 60 Days)', section: 'Visa', sort_order: 4, supplier_costs: s({ 'AKSM': '60', 'DAHR': '70' }), selling_price: '400 ( EID+500 )', sub_agent_price: '350', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Inside Visa Extension (30 Days) DXB', section: 'Visa', sort_order: 5, supplier_costs: s({ 'AKSM': '900', 'DAHR': '900' }), selling_price: '1100', sub_agent_price: '1050', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Inside Visa Extension (30 Days) SHJ', section: 'Visa', sort_order: 6, supplier_costs: s({ 'AKSM': '900', 'DAHR': '950' }), selling_price: '1150', sub_agent_price: '1100', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Cancel Visa (Visa Change by Bus)', section: 'Visa', sort_order: 7, supplier_costs: s({ 'AKSM': '635', 'DAHR': '240+440' }), selling_price: '850 ( EID )', sub_agent_price: '', other_agent_price: '', remark: '', required_documents: '(1) Photo (2) Passport (3) Cancel Visa (4) UAE ID' },
    { visa_type: 'Visit Visa (Visa Change by Bus) SHJ', section: 'Visa', sort_order: 8, supplier_costs: s({ 'AKSM': '1120', 'DAHR': '240+850' }), selling_price: '1350 ( 1050 )', sub_agent_price: '1300', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Visit Visa (Visa Change by Bus) Dubai', section: 'Visa', sort_order: 9, supplier_costs: s({ 'AKSM': 'N/A', 'DAHR': '240+950' }), selling_price: '1350', sub_agent_price: '1300', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Visa Change by Air - FLY DUBAI', section: 'Visa', sort_order: 10, supplier_costs: s({ 'AKSM': '1445', 'DAHR': '1205+415' }), selling_price: '1750 ( EID+500 )', sub_agent_price: '1700', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Cancel Visa (Visa Change by Air - Oman)', section: 'Visa', sort_order: 11, supplier_costs: s({ 'AKSM': '1145/1245', 'DAHR': '855+435' }), selling_price: '1550', sub_agent_price: '1500', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Visit Visa (Visa Change by Air - Kuwait)', section: 'Visa', sort_order: 12, supplier_costs: s({ 'DAHR': '855+435' }), selling_price: '1550', sub_agent_price: '1500', other_agent_price: '', remark: '', required_documents: '(1) Photo (2) Passport (3) Cancel Visa / Visit Visa' },
    { visa_type: 'Visit Visa (Visa Change by Air - Oman)', section: 'Visa', sort_order: 13, supplier_costs: s({ 'DAHR': '1055+450' }), selling_price: '1505', sub_agent_price: '1700', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Multi Entry Visa (30 Days) Dubai', section: 'Visa', sort_order: 14, supplier_costs: s({ 'AKSM': '510', 'DAHR': '450' }), selling_price: '750', sub_agent_price: '750', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Multi Entry Visa (60 Days) Dubai', section: 'Visa', sort_order: 15, supplier_costs: s({ 'AKSM': '800', 'DAHR': '750' }), selling_price: '1000', sub_agent_price: '1000', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Multi Entry Visa (30 Days) SHJ with Deposit', section: 'Visa', sort_order: 16, supplier_costs: s({ 'DAHR': '750 + 2045' }), selling_price: '900 + 2045', sub_agent_price: '900 + 2045', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Multi Entry Visa (60 Days) SHJ with Deposit', section: 'Visa', sort_order: 17, supplier_costs: s({ 'DAHR': '850 + 2045' }), selling_price: '1000 + 2045', sub_agent_price: '1000 + 2045', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Multi Entry Visa (30 Days) SHJ', section: 'Visa', sort_order: 18, supplier_costs: s({ 'DAHR': '1050' }), selling_price: '1200', sub_agent_price: '1200', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Multi Entry Visa (60 Days) SHJ', section: 'Visa', sort_order: 19, supplier_costs: s({ 'DAHR': '1180' }), selling_price: '1330', sub_agent_price: '1330', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Transit Visa (48 Hours)', section: 'Visa', sort_order: 20, supplier_costs: s({ 'DAHR': '120' }), selling_price: '220', sub_agent_price: '220', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Transit Visa (96 Hours)', section: 'Visa', sort_order: 21, supplier_costs: s({ 'DAHR': '240' }), selling_price: '360', sub_agent_price: '340', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'SHJ (With Deposit) 30days Visa', section: 'Visa', sort_order: 22, supplier_costs: s({ 'DAHR': '520 + (1035 Deposit)' }), selling_price: '', sub_agent_price: '', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'SHJ (With Deposit) 60days Visa', section: 'Visa', sort_order: 23, supplier_costs: s({ 'DAHR': '650 + (1035 Deposit)' }), selling_price: '', sub_agent_price: '', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'SHJ (Without Deposit) 60days Visa', section: 'Visa', sort_order: 24, supplier_costs: s({ 'DAHR': '850' }), selling_price: '', sub_agent_price: '', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Hotel Booking', section: 'Other Services', sort_order: 1, supplier_costs: s({ 'DAHR': '1' }), selling_price: '50', sub_agent_price: '50', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Dummy Return Ticket (valid for 24hr)', section: 'Other Services', sort_order: 2, supplier_costs: s({ 'AKSM': '20', 'DAHR': '25' }), selling_price: '100', sub_agent_price: '50', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Japan Visa', section: 'Other Services', sort_order: 3, supplier_costs: s({ 'DAHR': 'Service Fees (300) + Embassy (120)' }), selling_price: '', sub_agent_price: '', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'Korea Visa', section: 'Other Services', sort_order: 4, supplier_costs: s({ 'DAHR': 'Service Fees (400) + Embassy (350)' }), selling_price: '', sub_agent_price: '', other_agent_price: '', remark: '', required_documents: '' },
    { visa_type: 'India Visa', section: 'Other Services', sort_order: 5, supplier_costs: s({ 'DAHR': 'Service + Evisa fees (150)' }), selling_price: '', sub_agent_price: '', other_agent_price: '', remark: '', required_documents: '' },
  ];
}
