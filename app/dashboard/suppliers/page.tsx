'use client';

import React, { useState, useEffect } from 'react';
import { getSuppliers } from '@/app/actions/suppliers';
import { toast } from 'sonner';
import { Plus, LayoutGrid, Table2 } from 'lucide-react';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission, UserProfile } from '@/lib/auth-permissions';
import SupplierCards, { Supplier } from './components/SupplierCards';
import SupplierModal from './components/SupplierModal';
import SupplierRateCardTable from './components/SupplierRateCardTable';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';

type Tab = 'suppliers' | 'ratecard';

export default function SuppliersPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('suppliers');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function init() {
      const p = await getCurrentUserProfile();
      setProfile(p);
      loadSuppliers();
    }
    init();
  }, []);

  const canCreate = checkPermission(profile, 'suppliers', 'create');
  const canEdit = checkPermission(profile, 'suppliers', 'edit');
  const canDelete = checkPermission(profile, 'suppliers', 'delete');

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

  async function handleConfirmDelete() {
    if (!deletingSupplier) return;
    setIsDeleting(true);
    const { deleteSupplier } = await import('@/app/actions/suppliers');
    const res = await deleteSupplier(deletingSupplier.id);
    setIsDeleting(false);
    if (res.success) {
      toast.success('Supplier deleted');
      setDeletingSupplier(null);
      loadSuppliers();
    } else {
      toast.error(res.error || 'Failed to delete supplier');
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--card-border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif text-[var(--foreground)]">Suppliers & Rates</h1>
          </div>
          <p className="text-sm opacity-60 mt-1.5 ml-1">Manage suppliers, service rates, and compare pricing across providers</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && activeTab === 'suppliers' && (
            <button
              onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-3 bg-[#D97757] hover:opacity-90 text-[#F5F4EF] font-medium rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              Add New Supplier
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-1.5 w-fit">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'suppliers' ? 'bg-[var(--background)] shadow-sm text-[var(--foreground)]' : 'text-[var(--foreground)] opacity-50 hover:opacity-80'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Suppliers
        </button>
        <button
          onClick={() => setActiveTab('ratecard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'ratecard' ? 'bg-[var(--background)] shadow-sm text-[var(--foreground)]' : 'text-[var(--foreground)] opacity-50 hover:opacity-80'
          }`}
        >
          <Table2 className="w-4 h-4" />
          Rate Card
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'suppliers' ? (
        <SupplierCards
          suppliers={suppliers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          loading={loading}
          canEdit={canEdit}
          canDelete={canDelete}
          canCreate={canCreate}
          onEdit={(supplier) => { setEditingSupplier(supplier); setIsModalOpen(true); }}
          onDelete={(id, name) => setDeletingSupplier({ id, name })}
        />
      ) : (
        <SupplierRateCardTable
          suppliers={suppliers.map(s => ({ id: s.id, name: s.name }))}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      {/* Add / Edit Supplier Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingSupplier={editingSupplier}
        onSaved={() => { setIsModalOpen(false); loadSuppliers(); }}
      />

      {/* Delete Supplier Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Supplier"
        itemType="supplier"
        itemName={deletingSupplier?.name || ''}
        isDeleting={isDeleting}
        description="Are you sure you want to delete this supplier? This will remove the supplier and their configured rates."
      />
    </div>
  );
}
