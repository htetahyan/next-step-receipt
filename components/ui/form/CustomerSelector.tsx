'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Shield, Search, UserPlus, X, Check, Loader2, Phone, FileText, Mail, User, ArrowRight } from 'lucide-react';
import { inputCls, labelCls, errorCls, FormField } from './FormField';
import { searchCustomers, getCustomerById } from '@/app/actions/customers';

interface CustomerSelectorProps {
  customers: any[];
  readOnly?: boolean;
  defaultCustomerName?: string;
}

export function CustomerSelector({ customers, readOnly, defaultCustomerName }: CustomerSelectorProps) {
  const { watch, setValue, formState: { errors } } = useFormContext();
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [serverResults, setServerResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isNewCustomer = watch('isNewCustomer');
  const selectedCustomerId = watch('customerId');
  const selectedCustomerName = defaultCustomerName || watch('_selectedCustomerName') || selectedCustomerData?.name;

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hydrate full customer details when selectedCustomerId is present
  useEffect(() => {
    if (selectedCustomerId) {
      // 1. Check local customers array
      const local = customers.find((c) => c.id === selectedCustomerId);
      if (local) {
        setSelectedCustomerData(local);
        if (!watch('_selectedCustomerName')) {
          setValue('_selectedCustomerName', local.name);
        }
        return;
      }

      // 2. Fetch from database if not in preloaded 100
      let isMounted = true;
      getCustomerById(selectedCustomerId).then((cust) => {
        if (isMounted && cust) {
          setSelectedCustomerData(cust);
          if (!watch('_selectedCustomerName')) {
            setValue('_selectedCustomerName', cust.name);
          }
        }
      });

      return () => {
        isMounted = false;
      };
    } else {
      setSelectedCustomerData(null);
    }
  }, [selectedCustomerId, customers, setValue, watch]);

  // Debounced database search across entire customers table
  useEffect(() => {
    const q = customerSearch.trim();
    if (!q) {
      setServerResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchCustomers(q);
        setServerResults(results || []);
      } catch (err) {
        console.error('Customer live search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Merge local instant matches + server results (deduplicated by ID)
  const combinedCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    const map = new Map<string, any>();

    // If search is empty, return top recent customers
    if (!q) {
      return customers.slice(0, 10);
    }

    // 1. Add server results first (accurate across the entire database)
    serverResults.forEach((c) => {
      if (c && c.id) map.set(c.id, c);
    });

    // 2. Also check in-memory customers prop for instant 0ms results
    customers.forEach((c) => {
      if (!c || !c.id) return;
      const name = (c.name || '').toLowerCase();
      const passport = (c.passport_no || c.passportNo || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const email = (c.email || '').toLowerCase();

      if (
        name.includes(q) ||
        passport.includes(q) ||
        phone.includes(q) ||
        email.includes(q)
      ) {
        if (!map.has(c.id)) {
          map.set(c.id, c);
        }
      }
    });

    return Array.from(map.values()).slice(0, 25);
  }, [customerSearch, serverResults, customers]);

  const selectCustomer = (c: any) => {
    setValue('customerId', c.id, { shouldValidate: true });
    setValue('_selectedCustomerName', c.name);
    setSelectedCustomerData(c);
    setCustomerSearch('');
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const clearSelection = () => {
    setValue('customerId', '', { shouldValidate: true });
    setValue('_selectedCustomerName', '');
    setSelectedCustomerData(null);
    setCustomerSearch('');
    setShowDropdown(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCreateNewWithTerm = (name: string) => {
    setValue('isNewCustomer', true);
    setValue('customerId', '');
    setValue('_selectedCustomerName', '');
    setValue('newCustomer.name', name);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || combinedCustomers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < combinedCustomers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && combinedCustomers[selectedIndex]) {
        e.preventDefault();
        selectCustomer(combinedCustomers[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  if (readOnly) {
    return (
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[var(--sidebar-bg)] flex items-center justify-center">
          <Shield className="w-5 h-5 opacity-40" />
        </div>
        <div>
          <div className="font-medium text-base">{selectedCustomerName || 'Selected Customer'}</div>
          <div className="text-xs opacity-50 font-mono mt-0.5">
            {selectedCustomerData?.passport_no && `Pass: ${selectedCustomerData.passport_no} · `}
            {selectedCustomerData?.phone && `Tel: ${selectedCustomerData.phone}`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6" ref={wrapperRef}>
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-medium flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#D97757]" />
          {isNewCustomer ? 'Create New Customer' : 'Customer Details'}
        </label>
        <button
          type="button"
          onClick={() => {
            const nextMode = !isNewCustomer;
            setValue('isNewCustomer', nextMode);
            if (nextMode) {
              setValue('customerId', '');
              setValue('_selectedCustomerName', '');
              if (customerSearch.trim()) {
                setValue('newCustomer.name', customerSearch.trim());
              }
            } else {
              setValue('newCustomer', null);
            }
          }}
          className="text-xs text-[#D97757] hover:underline font-medium cursor-pointer"
        >
          {isNewCustomer ? '← Select Existing Instead' : '+ New Customer'}
        </button>
      </div>

      {!isNewCustomer ? (
        <div className="space-y-3 relative">
          {/* If a customer is selected, show selected card */}
          {selectedCustomerId ? (
            <div className="flex items-center justify-between p-3.5 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl transition-all shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#D97757]/15 text-[#D97757] flex items-center justify-center font-bold font-serif text-base shrink-0">
                  {selectedCustomerName ? selectedCustomerName[0]?.toUpperCase() : <User className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
                    <span>{selectedCustomerName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">Selected</span>
                  </div>
                  <div className="text-xs opacity-60 font-mono flex items-center gap-2 mt-0.5 flex-wrap">
                    {(selectedCustomerData?.passport_no || selectedCustomerData?.passportNo) && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {selectedCustomerData?.passport_no || selectedCustomerData?.passportNo}
                      </span>
                    )}
                    {selectedCustomerData?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedCustomerData.phone}
                      </span>
                    )}
                    {selectedCustomerData?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {selectedCustomerData.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-1.5 text-xs text-[#D97757] hover:bg-[#D97757]/10 rounded-lg font-medium border border-[#D97757]/30 transition-colors cursor-pointer"
              >
                Change Customer
              </button>
            </div>
          ) : (
            /* Search input when no customer is selected */
            <div className="relative">
              <div className="relative">
                <div className="absolute left-3.5 inset-y-0 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 opacity-40" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowDropdown(true);
                    setSelectedIndex(-1);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search customer by name, passport number, or phone..."
                  className={`${inputCls} pl-10 pr-20`}
                  autoComplete="off"
                />
                <div className="absolute right-3 inset-y-0 flex items-center gap-1.5">
                  {isSearching && <Loader2 className="w-4 h-4 animate-spin text-[#D97757]" />}
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearch('');
                        setShowDropdown(true);
                        inputRef.current?.focus();
                      }}
                      className="p-1 opacity-40 hover:opacity-80 rounded-full transition-opacity cursor-pointer flex items-center justify-center"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-1.5">
                    {/* Header showing match count */}
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider opacity-50 flex items-center justify-between border-b border-[var(--card-border)] mb-1">
                      <span>{customerSearch.trim() ? `Search Results (${combinedCustomers.length})` : 'Recent Customers'}</span>
                      {isSearching && <span className="text-[#D97757] normal-case font-normal">Searching database...</span>}
                    </div>

                    {combinedCustomers.map((c, index) => {
                      const isHighlighted = selectedIndex === index;
                      const passport = c.passport_no || c.passportNo;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                            isHighlighted ? 'bg-[#D97757]/10 text-[var(--foreground)]' : 'hover:bg-[var(--sidebar-bg)]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--card-border)] flex items-center justify-center text-xs font-bold font-serif opacity-75 shrink-0">
                              {c.name ? c.name[0]?.toUpperCase() : 'C'}
                            </div>
                            <div>
                              <div className="text-sm font-semibold leading-tight">{c.name}</div>
                              <div className="text-[11px] opacity-60 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                                {passport ? (
                                  <span className="text-[#D97757] font-semibold">Pass: {passport}</span>
                                ) : (
                                  <span>No passport</span>
                                )}
                                {c.phone && <span>· Tel: {c.phone}</span>}
                                {c.email && <span>· {c.email}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="text-xs opacity-40 flex items-center gap-1 font-mono">
                            <span>Select</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </button>
                      );
                    })}

                    {combinedCustomers.length === 0 && !isSearching && (
                      <div className="px-4 py-4 text-center">
                        <p className="text-sm opacity-60">No customer found for &ldquo;{customerSearch}&rdquo;</p>
                        <button
                          type="button"
                          onClick={() => handleCreateNewWithTerm(customerSearch.trim())}
                          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D97757]/10 text-[#D97757] hover:bg-[#D97757]/20 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Create &ldquo;{customerSearch.trim()}&rdquo; as new customer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {errors.customerId && <p className={errorCls}>{errors.customerId.message as string}</p>}
        </div>
      ) : (
        /* Create New Customer Form */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--sidebar-bg)] border border-[var(--card-border)]">
          <FormField name="newCustomer.name" label="Full Name *" placeholder="e.g. John Doe" />
          <FormField name="newCustomer.phone" label="Phone" placeholder="e.g. +971 50 123 4567" />
          <FormField name="newCustomer.email" label="Email" type="email" placeholder="e.g. client@example.com" />
          <FormField name="newCustomer.passport_no" label="Passport No" placeholder="e.g. N1234567" />
        </div>
      )}
    </div>
  );
}
