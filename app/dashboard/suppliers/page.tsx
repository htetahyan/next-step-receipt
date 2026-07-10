'use client';

import React, { useState, useEffect } from 'react';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '@/app/actions/suppliers';
import { toast } from 'sonner';
import { 
  Plus, Edit2, Trash2, Mail, Phone, User, Briefcase, 
  DollarSign, Tag, Check, X, Search, Loader2, ArrowLeft 
} from 'lucide-react';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

const DEFAULT_CATEGORIES = [
  'UAE Visit Visa 30 Days',
  'UAE Visit Visa 60 Days',
  'UAE Transit Visa',
  'UAE Multi Entry Visa',
  'Visa Change by Bus',
  'Visa Change by Air',
  'Inside Visa Extension',
  'Oman Visit Visa',
  '30 Days Visa Extension',
  'Air Ticket',
  'Dummy Ticket',
  'Ticket + Hotel Package',
  'Passport Renew',
  'Schengen / EU Visa',
  'Japan Visa',
  'China Visa',
  'Korea Visa',
  'Other'
];

interface SupplierService {
  serviceName: string;
  defaultCost: number;
  defaultPrice: number;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  services: SupplierService[];
  createdAt: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // 8 suppliers per page (2 columns x 4 rows)
  
  // Form states
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [services, setServices] = useState<SupplierService[]>([]);
  
  // Service edit row states
  const [newServiceName, setNewServiceName] = useState(DEFAULT_CATEGORIES[0]);
  const [customServiceName, setCustomServiceName] = useState('');
  const [newDefaultCost, setNewDefaultCost] = useState('0');
  const [newDefaultPrice, setNewDefaultPrice] = useState('0');

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  async function loadSuppliers() {
    setLoading(true);
    const res = await getSuppliers();
    if (res.success && res.data) {
      setSuppliers(res.data as any[]);
    } else {
      toast.error(res.error || 'Failed to load suppliers');
    }
    setLoading(false);
  }

  const openAddModal = () => {
    setEditingSupplier(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setServices([]);
    setNewServiceName(DEFAULT_CATEGORIES[0]);
    setCustomServiceName('');
    setNewDefaultCost('0');
    setNewDefaultPrice('0');
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setContactPerson(supplier.contactPerson || '');
    setPhone(supplier.phone || '');
    setEmail(supplier.email || '');
    setServices(supplier.services || []);
    setNewServiceName(DEFAULT_CATEGORIES[0]);
    setCustomServiceName('');
    setNewDefaultCost('0');
    setNewDefaultPrice('0');
    setIsModalOpen(true);
  };

  const addServiceRow = () => {
    const finalName = newServiceName === 'Other' ? (customServiceName || 'Other Service') : newServiceName;
    if (!finalName.trim()) {
      toast.error('Please enter a service name');
      return;
    }

    // Check if service already exists
    if (services.some(s => s.serviceName.toLowerCase() === finalName.toLowerCase())) {
      toast.error('This service is already added for this supplier');
      return;
    }

    setServices([
      ...services,
      {
        serviceName: finalName,
        defaultCost: Number(newDefaultCost) || 0,
        defaultPrice: Number(newDefaultPrice) || 0,
      }
    ]);

    // Reset inputs
    setNewDefaultCost('0');
    setNewDefaultPrice('0');
    setCustomServiceName('');
  };

  const removeServiceRow = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Supplier Name is required');
      return;
    }

    setModalLoading(true);
    const payload = {
      name,
      contactPerson: contactPerson || undefined,
      phone: phone || undefined,
      email: email || undefined,
      services,
    };

    let res;
    if (editingSupplier) {
      res = await updateSupplier(editingSupplier.id, payload);
    } else {
      res = await addSupplier(payload);
    }

    if (res.success) {
      toast.success(editingSupplier ? 'Supplier updated successfully' : 'Supplier added successfully');
      setIsModalOpen(false);
      loadSuppliers();
    } else {
      toast.error(res.error || 'Failed to save supplier');
    }
    setModalLoading(false);
  }

  async function handleDelete(id: string, sName: string) {
    if (!confirm(`Are you sure you want to delete ${sName}?`)) return;

    const res = await deleteSupplier(id);
    if (res.success) {
      toast.success('Supplier deleted');
      loadSuppliers();
    } else {
      toast.error(res.error || 'Failed to delete supplier');
    }
  }

  const filteredSuppliers = React.useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.services.some(srv => srv.serviceName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [suppliers, searchQuery]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  const paginatedSuppliers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSuppliers, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--card-border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-[var(--card-border)] rounded-full transition-colors text-[var(--foreground)] opacity-60 hover:opacity-100">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-serif text-[var(--foreground)]">Suppliers & rates</h1>
          </div>
          <p className="text-sm opacity-60 mt-1.5 ml-10">Manage external suppliers, default services, and prefilled costs/prices</p>
        </div>

        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-3 bg-[#D97757] hover:opacity-90 text-[#F5F4EF] font-medium rounded-lg shadow-sm transition-all md:self-end"
        >
          <Plus className="h-5 w-5" />
          Add New Supplier
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-4 flex items-center gap-3 shadow-xs">
        <Search className="h-5 w-5 opacity-40" />
        <input 
          type="text"
          placeholder="Search by supplier name, contact person, or services..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-transparent border-0 outline-none w-full text-sm font-medium focus:ring-0 placeholder:opacity-50 text-[var(--foreground)]"
        />
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#D97757]" />
          <p className="text-sm opacity-60 font-medium">Loading suppliers...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="border border-dashed border-[var(--card-border)] rounded-xl py-16 px-4 text-center">
          <Briefcase className="h-12 w-12 mx-auto opacity-30 text-[#D97757] mb-3" />
          <h3 className="text-lg font-serif mb-1">No suppliers found</h3>
          <p className="text-sm opacity-60 max-w-md mx-auto">Create a supplier to manage services and automatically pre-fill purchase cost and charge prices when adding services to users.</p>
        </div>
      ) : (
        /* Suppliers Grid */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedSuppliers.map((supplier) => (
              <div 
                key={supplier.id}
                className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Supplier Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-serif text-[var(--foreground)] font-semibold">{supplier.name}</h3>
                      {supplier.contactPerson && (
                        <p className="text-xs opacity-60 flex items-center gap-1.5 mt-1 font-medium">
                          <User className="h-3 w-3 text-[#D97757]" />
                          {supplier.contactPerson}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 bg-[var(--background)] p-1 rounded-lg border border-[var(--card-border)]">
                      <button 
                        onClick={() => openEditModal(supplier)}
                        className="p-1.5 text-blue-500 hover:bg-[var(--card-border)] rounded-md transition-all"
                        title="Edit Supplier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(supplier.id, supplier.name)}
                        className="p-1.5 text-red-500 hover:bg-[var(--card-border)] rounded-md transition-all"
                        title="Delete Supplier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-[var(--card-border)] pt-4 mb-4 opacity-75">
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="h-3.5 w-3.5 opacity-50" />
                      <span className="truncate">{supplier.phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 opacity-50" />
                      <span className="truncate">{supplier.email || '—'}</span>
                    </div>
                  </div>

                  {/* Services supplied */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-50">Supplied Services & Rates</p>
                    {supplier.services.length === 0 ? (
                      <p className="text-xs opacity-40 italic">No services listed yet</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                        {supplier.services.map((srv, idx) => (
                          <div 
                            key={idx}
                            className="bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="font-semibold truncate flex items-center gap-1.5 text-[var(--foreground)]">
                              <Tag className="h-3 w-3 opacity-40 text-[#D97757]" />
                              <span className="truncate">{srv.serviceName}</span>
                            </div>
                            <div className="flex gap-4 text-[10px] font-mono text-right flex-shrink-0">
                              <div>
                                <span className="opacity-50 block">Cost (AED)</span>
                                <span className="font-semibold">{Number(srv.defaultCost).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="opacity-50 block">Price (AED)</span>
                                <span className="font-semibold text-[#D97757]">{Number(srv.defaultPrice).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--card-border)] flex items-center justify-between text-[10px] opacity-40">
                  <span>Supplier ID: {supplier.id.slice(0, 8)}</span>
                  <span>Created {new Date(supplier.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredSuppliers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container max-w-2xl max-h-[90vh] scale-in-center" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--sidebar-bg)]">
              <h3 className="text-xl font-serif text-[var(--foreground)] flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#D97757]" />
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-[var(--card-border)] rounded-full">
                <X className="h-6 w-6 opacity-50" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Details Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold opacity-50 uppercase tracking-wider">Supplier Information</h4>
                  
                  <div>
                    <label className="block text-xs font-medium mb-1.5 opacity-70">Supplier Name *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Incel Tourism"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="input-anthropic w-full p-3 text-sm font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5 opacity-70">Contact Person</label>
                      <input 
                        type="text"
                        placeholder="John Doe"
                        value={contactPerson}
                        onChange={e => setContactPerson(e.target.value)}
                        className="input-anthropic w-full p-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 opacity-70">Phone Number</label>
                      <input 
                        type="text"
                        placeholder="+971 50 123 4567"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="input-anthropic w-full p-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 opacity-70">Email Address</label>
                      <input 
                        type="email"
                        placeholder="supplier@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="input-anthropic w-full p-3 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Services and Pricing Manager */}
                <div className="border-t border-[var(--card-border)] pt-6 space-y-4">
                  <h4 className="text-sm font-semibold opacity-50 uppercase tracking-wider">Supplied Services & Default Rates</h4>
                  
                  {/* Dynamic Rate Form Row */}
                  <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-4 space-y-4">
                    <p className="text-xs font-medium opacity-60">Add a service category with default supplier cost & client price:</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-semibold mb-1 opacity-70">Category</label>
                        <select
                          value={newServiceName}
                          onChange={e => setNewServiceName(e.target.value)}
                          className="input-anthropic w-full p-2.5 text-xs font-medium"
                        >
                          {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-semibold mb-1 opacity-70">Default Cost (AED)</label>
                        <input 
                          type="number"
                          value={newDefaultCost}
                          onChange={e => setNewDefaultCost(e.target.value)}
                          className="input-anthropic w-full p-2.5 text-xs font-mono"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-semibold mb-1 opacity-70">Default Price (AED)</label>
                        <input 
                          type="number"
                          value={newDefaultPrice}
                          onChange={e => setNewDefaultPrice(e.target.value)}
                          className="input-anthropic w-full p-2.5 text-xs font-mono"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <button
                          type="button"
                          onClick={addServiceRow}
                          className="w-full p-2.5 bg-[#D97757]/10 hover:bg-[#D97757]/20 border border-[#D97757]/20 rounded-lg text-[#D97757] font-semibold text-xs transition-all flex items-center justify-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                      </div>
                    </div>

                    {newServiceName === 'Other' && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="block text-[10px] font-semibold mb-1 opacity-70">Custom Service Name</label>
                        <input 
                          type="text"
                          placeholder="e.g. Translation, VIP Lounge"
                          value={customServiceName}
                          onChange={e => setCustomServiceName(e.target.value)}
                          className="input-anthropic w-full p-2.5 text-xs border-[#D97757]/20 focus:border-[#D97757]"
                        />
                      </div>
                    )}
                  </div>

                  {/* List of current added services for this supplier */}
                  <div className="space-y-2">
                    {services.length === 0 ? (
                      <p className="text-xs text-center opacity-40 italic py-6 border border-dashed border-[var(--card-border)] rounded-xl">
                        No services added yet. Add at least one above!
                      </p>
                    ) : (
                      <div className="border border-[var(--card-border)] rounded-xl overflow-hidden divide-y divide-[var(--card-border)]">
                        {services.map((srv, idx) => (
                          <div 
                            key={idx}
                            className="bg-[var(--sidebar-bg)] p-3 flex items-center justify-between gap-4 text-xs hover:bg-[var(--card-border)]/20 transition-all"
                          >
                            <div className="font-semibold truncate flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-[#D97757] opacity-60" />
                              <span className="truncate">{srv.serviceName}</span>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="font-mono text-right flex gap-4">
                                <div>
                                  <span className="opacity-50 text-[9px] block">Cost</span>
                                  <span className="font-semibold">{srv.defaultCost} AED</span>
                                </div>
                                <div>
                                  <span className="opacity-50 text-[9px] block">Price</span>
                                  <span className="font-semibold text-[#D97757]">{srv.defaultPrice} AED</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeServiceRow(idx)}
                                className="text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-all"
                                title="Remove Rate"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="border-t border-[var(--card-border)] pt-6 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-3 border border-[var(--card-border)] hover:bg-[var(--card-border)]/50 rounded-lg text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={modalLoading}
                    type="submit"
                    className="px-6 py-3 bg-[#D97757] text-[#F5F4EF] font-semibold rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
                  >
                    {modalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {modalLoading ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.3); border-radius: 20px; }
      `}</style>
    </div>
  );
}
