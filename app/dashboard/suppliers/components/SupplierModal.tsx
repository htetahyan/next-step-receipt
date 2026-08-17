'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Briefcase, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { addSupplier, updateSupplier } from '@/app/actions/suppliers';
import type { Supplier, SupplierService } from './SupplierCards';

const DEFAULT_CATEGORIES = [
  'UAE Visit Visa 30 Days', 'UAE Visit Visa 60 Days', 'UAE Transit Visa',
  'UAE Multi Entry Visa', 'Visa Change by Bus', 'Visa Change by Air',
  'Inside Visa Extension', 'Oman Visit Visa', '30 Days Visa Extension',
  'Air Ticket', 'Dummy Ticket', 'Ticket + Hotel Package',
  'Passport Renew', 'Schengen / EU Visa', 'Japan Visa', 'China Visa', 'Korea Visa', 'Other'
];

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSupplier: Supplier | null;
  onSaved: () => void;
}

export default function SupplierModal({ isOpen, onClose, editingSupplier, onSaved }: SupplierModalProps) {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [services, setServices] = useState<SupplierService[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Service add row states
  const [newServiceName, setNewServiceName] = useState(DEFAULT_CATEGORIES[0]);
  const [customServiceName, setCustomServiceName] = useState('');
  const [newDefaultCost, setNewDefaultCost] = useState('0');
  const [newDefaultPrice, setNewDefaultPrice] = useState('0');

  useEffect(() => {
    if (isOpen) {
      if (editingSupplier) {
        setName(editingSupplier.name);
        setContactPerson(editingSupplier.contactPerson || '');
        setPhone(editingSupplier.phone || '');
        setEmail(editingSupplier.email || '');
        setServices(editingSupplier.services || []);
      } else {
        setName(''); setContactPerson(''); setPhone(''); setEmail('');
        setServices([]);
      }
      setNewServiceName(DEFAULT_CATEGORIES[0]); setCustomServiceName('');
      setNewDefaultCost('0'); setNewDefaultPrice('0');
    }
  }, [isOpen, editingSupplier]);

  if (!isOpen) return null;

  const addServiceRow = () => {
    const finalName = newServiceName === 'Other' ? (customServiceName || 'Other Service') : newServiceName;
    if (!finalName.trim()) { toast.error('Please enter a service name'); return; }
    if (services.some(s => s.serviceName.toLowerCase() === finalName.toLowerCase())) {
      toast.error('This service is already added'); return;
    }
    setServices([...services, { serviceName: finalName, defaultCost: Number(newDefaultCost) || 0, defaultPrice: Number(newDefaultPrice) || 0 }]);
    setNewDefaultCost('0'); setNewDefaultPrice('0'); setCustomServiceName('');
  };

  const removeServiceRow = (index: number) => setServices(services.filter((_, i) => i !== index));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Supplier Name is required'); return; }
    setModalLoading(true);
    const payload = { name, contactPerson: contactPerson || undefined, phone: phone || undefined, email: email || undefined, services };
    const res = editingSupplier ? await updateSupplier(editingSupplier.id, payload) : await addSupplier(payload);
    if (res.success) {
      toast.success(editingSupplier ? 'Supplier updated' : 'Supplier added');
      onSaved();
    } else {
      toast.error(res.error || 'Failed to save supplier');
    }
    setModalLoading(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container max-w-2xl max-h-[90vh] scale-in-center" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--sidebar-bg)]">
          <h3 className="text-xl font-serif text-[var(--foreground)] flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#D97757]" />
            {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--card-border)] rounded-full"><X className="h-6 w-6 opacity-50" /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold opacity-50 uppercase tracking-wider">Supplier Information</h4>
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-70">Supplier Name *</label>
                <input type="text" required placeholder="e.g. Incel Tourism" value={name} onChange={e => setName(e.target.value)} className="input-anthropic w-full p-3 text-sm font-semibold" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Contact Person</label>
                  <input type="text" placeholder="John Doe" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="input-anthropic w-full p-3 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Phone Number</label>
                  <input type="text" placeholder="+971 50 123 4567" value={phone} onChange={e => setPhone(e.target.value)} className="input-anthropic w-full p-3 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Email Address</label>
                  <input type="email" placeholder="supplier@example.com" value={email} onChange={e => setEmail(e.target.value)} className="input-anthropic w-full p-3 text-sm" />
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--card-border)] pt-6 space-y-4">
              <h4 className="text-sm font-semibold opacity-50 uppercase tracking-wider">Supplied Services & Default Rates</h4>
              <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-4 space-y-4">
                <p className="text-xs font-medium opacity-60">Add a service category with default supplier cost & client price:</p>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-semibold mb-1 opacity-70">Category</label>
                    <select value={newServiceName} onChange={e => setNewServiceName(e.target.value)} className="input-anthropic w-full p-2.5 text-xs font-medium">
                      {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-semibold mb-1 opacity-70">Default Cost (AED)</label>
                    <input type="number" value={newDefaultCost} onChange={e => setNewDefaultCost(e.target.value)} className="input-anthropic w-full p-2.5 text-xs font-mono" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-semibold mb-1 opacity-70">Default Price (AED)</label>
                    <input type="number" value={newDefaultPrice} onChange={e => setNewDefaultPrice(e.target.value)} className="input-anthropic w-full p-2.5 text-xs font-mono" />
                  </div>
                  <div className="md:col-span-2">
                    <button type="button" onClick={addServiceRow} className="w-full p-2.5 bg-[#D97757]/10 hover:bg-[#D97757]/20 border border-[#D97757]/20 rounded-lg text-[#D97757] font-semibold text-xs transition-all flex items-center justify-center gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>
                {newServiceName === 'Other' && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[10px] font-semibold mb-1 opacity-70">Custom Service Name</label>
                    <input type="text" placeholder="e.g. Translation, VIP Lounge" value={customServiceName} onChange={e => setCustomServiceName(e.target.value)} className="input-anthropic w-full p-2.5 text-xs border-[#D97757]/20 focus:border-[#D97757]" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {services.length === 0 ? (
                  <p className="text-xs text-center opacity-40 italic py-6 border border-dashed border-[var(--card-border)] rounded-xl">No services added yet.</p>
                ) : (
                  <div className="border border-[var(--card-border)] rounded-xl overflow-hidden divide-y divide-[var(--card-border)]">
                    {services.map((srv, idx) => (
                      <div key={idx} className="bg-[var(--sidebar-bg)] p-3 flex items-center justify-between gap-4 text-xs hover:bg-[var(--card-border)]/20 transition-all">
                        <div className="font-semibold truncate flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-[#D97757] opacity-60" /> <span className="truncate">{srv.serviceName}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="font-mono text-right flex gap-4">
                            <div><span className="opacity-50 text-[9px] block">Cost</span><span className="font-semibold">{srv.defaultCost} AED</span></div>
                            <div><span className="opacity-50 text-[9px] block">Price</span><span className="font-semibold text-[#D97757]">{srv.defaultPrice} AED</span></div>
                          </div>
                          <button type="button" onClick={() => removeServiceRow(idx)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-all" title="Remove Rate">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--card-border)] pt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} className="px-5 py-3 border border-[var(--card-border)] hover:bg-[var(--card-border)]/50 rounded-lg text-sm font-semibold transition-all">Cancel</button>
              <button disabled={modalLoading} type="submit" className="px-6 py-3 bg-[#D97757] text-[#F5F4EF] font-semibold rounded-lg hover:opacity-90 transition-all flex items-center gap-2">
                {modalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {modalLoading ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
