'use client';

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Shield, Search, UserPlus } from 'lucide-react';
import { inputCls, labelCls, errorCls, FormField } from './FormField';

interface CustomerSelectorProps {
  customers: any[];
  readOnly?: boolean;
  defaultCustomerName?: string;
}

export function CustomerSelector({ customers, readOnly, defaultCustomerName }: CustomerSelectorProps) {
  const { watch, setValue, formState: { errors } } = useFormContext();
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const isNewCustomer = watch('isNewCustomer');
  const selectedCustomerId = watch('customerId');
  const selectedCustomerName = defaultCustomerName || watch('_selectedCustomerName');

  const filteredCustomers = customerSearch
    ? customers.filter(c =>
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.passport_no?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
      ).slice(0, 8)
    : customers.slice(0, 8);

  const selectCustomer = (c: any) => {
    setValue('customerId', c.id, { shouldValidate: true });
    setValue('_selectedCustomerName', c.name);
    setCustomerSearch('');
    setShowDropdown(false);
  };

  if (readOnly) {
    return (
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[var(--sidebar-bg)] flex items-center justify-center">
          <Shield className="w-5 h-5 opacity-40" />
        </div>
        <div>
          <div className="font-medium">{selectedCustomerName}</div>
          <div className="text-xs opacity-50">Customer selection cannot be changed.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-medium flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#D97757]" />
          {isNewCustomer ? 'Create New Customer' : 'Select Existing Customer'}
        </label>
        <button
          type="button"
          onClick={() => {
            setValue('isNewCustomer', !isNewCustomer);
            if (!isNewCustomer) {
              setValue('customerId', '');
              setValue('_selectedCustomerName', '');
            }
          }}
          className="text-xs text-[#D97757] hover:underline"
        >
          {isNewCustomer ? 'Select Existing Instead' : '+ New Customer'}
        </button>
      </div>

      {!isNewCustomer ? (
        <div className="space-y-3 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
            <input
              type="text"
              value={selectedCustomerName || customerSearch}
              onChange={e => {
                setCustomerSearch(e.target.value);
                setValue('customerId', '');
                setValue('_selectedCustomerName', '');
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search by name, passport, or phone..."
              className={`${inputCls} pl-10`}
            />
            {selectedCustomerId && (
              <button 
                type="button" 
                onClick={() => { 
                  setValue('customerId', '', { shouldValidate: true }); 
                  setValue('_selectedCustomerName', ''); 
                }} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#D97757] hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {showDropdown && !selectedCustomerId && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] shadow-lg max-h-48 overflow-y-auto">
              {filteredCustomers.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCustomer(c)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[var(--sidebar-bg)] transition-colors flex items-center justify-between border-b border-[var(--card-border)] last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-[11px] opacity-50 font-mono">{c.passport_no || 'No passport'} · {c.phone || 'No phone'}</div>
                  </div>
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="px-4 py-3 text-sm opacity-50">No customers found</div>
              )}
            </div>
          )}
          {errors.customerId && <p className={errorCls}>{errors.customerId.message as string}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <FormField name="newCustomer.name" label="Full Name *" placeholder="John Doe" />
          <FormField name="newCustomer.phone" label="Phone" placeholder="+971..." />
          <FormField name="newCustomer.email" label="Email" type="email" placeholder="john@example.com" />
          <FormField name="newCustomer.passport_no" label="Passport No" placeholder="A123..." />
        </div>
      )}
    </div>
  );
}
