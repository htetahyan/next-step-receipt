'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Loader2, 
  Briefcase, 
  User, 
  Phone, 
  Mail, 
  Tag, 
  Edit2, 
  Trash2 
} from 'lucide-react';
import Pagination from '@/components/Pagination';

export interface SupplierService {
  serviceName: string;
  defaultCost: number;
  defaultPrice: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  services: SupplierService[];
  createdAt: string;
}

interface SupplierCardsProps {
  suppliers: Supplier[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  loading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string, name: string) => void;
}

export default function SupplierCards({
  suppliers,
  searchQuery,
  onSearchChange,
  loading,
  canEdit,
  canDelete,
  canCreate,
  onEdit,
  onDelete
}: SupplierCardsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter suppliers
  const filteredSuppliers = suppliers.filter((supplier) => {
    const q = searchQuery.toLowerCase();
    const matchesName = supplier.name.toLowerCase().includes(q);
    const matchesContact = supplier.contactPerson?.toLowerCase().includes(q) || false;
    const matchesService = supplier.services?.some(s => 
      s.serviceName.toLowerCase().includes(q)
    ) || false;
    return matchesName || matchesContact || matchesService;
  });

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSuppliers = filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-md w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setCurrentPage(1); // Reset to page 1 on search
          }}
          placeholder="Search suppliers..."
          className="block w-full pl-10 pr-3 py-2 border border-[var(--card-border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#D97757] focus:border-[#D97757] sm:text-sm transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#D97757]" />
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-[var(--card-border)] border-dashed rounded-xl bg-[var(--sidebar-bg)]">
          <Briefcase className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-[var(--foreground)] mb-1">No suppliers found</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            {searchQuery 
              ? "We couldn't find any suppliers matching your search." 
              : "You haven't added any suppliers yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {currentSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden flex flex-col group hover:border-[#D97757]/30 transition-colors"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-[var(--card-border)] flex items-start justify-between bg-[var(--background)]/50">
                  <div className="flex items-center space-x-3 truncate">
                    <div className="p-2 bg-[#D97757]/10 rounded-lg shrink-0">
                      <Briefcase className="w-5 h-5 text-[#D97757]" />
                    </div>
                    <div className="truncate">
                      <h3 className="font-semibold text-[var(--foreground)] truncate" title={supplier.name}>
                        {supplier.name}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit && (
                      <button
                        onClick={() => onEdit(supplier)}
                        className="p-1.5 text-gray-400 hover:text-[#D97757] hover:bg-[#D97757]/10 rounded-md transition-colors"
                        title="Edit supplier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => onDelete(supplier.id, supplier.name)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Delete supplier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2.5">
                    {supplier.contactPerson && (
                      <div className="flex items-center text-sm text-gray-400">
                        <User className="w-4 h-4 mr-2.5 shrink-0 text-gray-500" />
                        <span className="truncate">{supplier.contactPerson}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center text-sm text-gray-400">
                        <Phone className="w-4 h-4 mr-2.5 shrink-0 text-gray-500" />
                        <span className="truncate">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center text-sm text-gray-400">
                        <Mail className="w-4 h-4 mr-2.5 shrink-0 text-gray-500" />
                        <span className="truncate" title={supplier.email}>{supplier.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Services */}
                  {supplier.services && supplier.services.length > 0 && (
                    <div className="mt-auto pt-4 border-t border-[var(--card-border)]">
                      <div className="flex items-center mb-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Tag className="w-3.5 h-3.5 mr-1.5" />
                        Services ({supplier.services.length})
                      </div>
                      <div className="custom-scrollbar overflow-y-auto max-h-[100px] pr-1 space-y-2">
                        {supplier.services.map((service, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm bg-[var(--background)] p-2 rounded border border-[var(--card-border)]">
                            <span className="truncate mr-2 text-[var(--foreground)]" title={service.serviceName}>
                              {service.serviceName}
                            </span>
                            <div className="flex flex-col items-end shrink-0 text-xs text-gray-400">
                              <span>Cost: {service.defaultCost}</span>
                              <span>Price: {service.defaultPrice}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredSuppliers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--card-border);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D97757;
        }
      `}</style>
    </div>
  );
}
