'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Briefcase, Tag, Loader2, User, Phone, Mail, DollarSign } from 'lucide-react';
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

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl z-10 scale-in-center overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--sidebar-bg)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D97757]/10 border border-[#D97757]/20 flex items-center justify-center text-[#D97757]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-semibold text-[var(--foreground)]">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <p className="text-xs opacity-60">Manage supplier credentials and default rate matrix</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 hover:bg-[var(--card-border)] rounded-lg transition-colors opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-[11px] font-semibold opacity-50 uppercase tracking-wider">
                Supplier Profile
              </h4>
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-80">
                  Supplier Name <span className="text-[#D97757]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                    <Briefcase className="w-4 h-4 text-[#D97757]" />
                  </div>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Incel Tourism LLC" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="input-anthropic w-full pl-10 pr-3 py-2.5 text-xs font-semibold" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-80">Contact Person</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none opacity-40">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="John Doe" 
                      value={contactPerson} 
                      onChange={e => setContactPerson(e.target.value)} 
                      className="input-anthropic w-full pl-9 pr-3 py-2 text-xs" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-80">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none opacity-40">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="+971 50 123 4567" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      className="input-anthropic w-full pl-9 pr-3 py-2 text-xs" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-80">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none opacity-40">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input 
                      type="email" 
                      placeholder="supplier@domain.ae" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="input-anthropic w-full pl-9 pr-3 py-2 text-xs" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--card-border)] pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-semibold opacity-50 uppercase tracking-wider">
                  Supplied Services & Default Rates
                </h4>
                <span className="text-[10px] font-mono opacity-50">
                  {services.length} rate{services.length !== 1 ? 's' : ''} configured
                </span>
              </div>

              {/* Add Service Rate Box */}
              <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-3.5 space-y-3">
                <p className="text-[11px] font-medium opacity-70">Add a service category with default cost & client price:</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-semibold mb-1 opacity-70">Category</label>
                    <select 
                      value={newServiceName} 
                      onChange={e => setNewServiceName(e.target.value)} 
                      className="input-anthropic w-full p-2 text-xs font-medium"
                    >
                      {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold mb-1 opacity-70">Default Cost (AED)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={newDefaultCost} 
                        onChange={e => setNewDefaultCost(e.target.value)} 
                        className="input-anthropic w-full p-2 text-xs font-mono" 
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold mb-1 opacity-70">Price (AED)</label>
                    <input 
                      type="number" 
                      value={newDefaultPrice} 
                      onChange={e => setNewDefaultPrice(e.target.value)} 
                      className="input-anthropic w-full p-2 text-xs font-mono" 
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button 
                      type="button" 
                      onClick={addServiceRow} 
                      className="w-full p-2 bg-[#D97757]/15 hover:bg-[#D97757]/25 border border-[#D97757]/30 rounded-lg text-[#D97757] font-semibold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>
                {newServiceName === 'Other' && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[10px] font-semibold mb-1 opacity-70">Custom Service Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Translation, VIP Lounge, Attestation" 
                      value={customServiceName} 
                      onChange={e => setCustomServiceName(e.target.value)} 
                      className="input-anthropic w-full p-2 text-xs border-[#D97757]/30 focus:border-[#D97757]" 
                    />
                  </div>
                )}
              </div>

              {/* Added Rates List */}
              <div className="space-y-1.5">
                {services.length === 0 ? (
                  <div className="text-xs text-center opacity-40 italic py-5 border border-dashed border-[var(--card-border)] rounded-xl bg-[var(--sidebar-bg)]/40">
                    No custom rates registered for this supplier yet.
                  </div>
                ) : (
                  <div className="border border-[var(--card-border)] rounded-xl overflow-hidden divide-y divide-[var(--card-border)]">
                    {services.map((srv, idx) => (
                      <div key={idx} className="bg-[var(--sidebar-bg)] px-3 py-2 flex items-center justify-between gap-3 text-xs hover:bg-[var(--card-border)]/20 transition-all">
                        <div className="font-semibold truncate flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-[#D97757] opacity-70 shrink-0" /> 
                          <span className="truncate">{srv.serviceName}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="font-mono text-right flex gap-3 text-[11px]">
                            <div><span className="opacity-50 text-[9px] block">Cost</span><span className="font-semibold">{srv.defaultCost} AED</span></div>
                            <div><span className="opacity-50 text-[9px] block">Price</span><span className="font-semibold text-[#D97757]">{srv.defaultPrice} AED</span></div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeServiceRow(idx)} 
                            className="text-red-500 hover:bg-red-500/10 p-1 rounded-md transition-all cursor-pointer" 
                            title="Remove Rate"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-[var(--card-border)] pt-4 flex items-center justify-end gap-2.5">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 border border-[var(--card-border)] hover:bg-[var(--sidebar-bg)] rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={modalLoading} 
                type="submit" 
                className="px-5 py-2 bg-[#D97757] text-[#F5F4EF] font-semibold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {modalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {modalLoading ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
