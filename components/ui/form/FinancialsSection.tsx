'use client';

import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField } from './FormField';
import { Users } from 'lucide-react';

export function FinancialsSection() {
  const { watch, setValue } = useFormContext();
  
  const amount = watch('financials.amount') || 0;
  const discount = watch('financials.discount') || 0;
  const supplierCost = watch('financials.supplier_cost') || 0;
  const refund = watch('financials.refund') || 0;
  const paxCount = Number(watch('details.pax_count') || watch('financials.pax_count')) || 1;

  const receivingAmount = Number(amount) - Number(discount);
  const balance = receivingAmount - Number(supplierCost) - Number(refund);

  return (
    <div className="card-anthropic p-6">
      <h3 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-3 mb-4 border-b border-[var(--card-border)]">Financial Details</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {paxCount > 1 && (
          <div className="col-span-2 p-2.5 bg-[#D97757]/10 rounded-lg border border-[#D97757]/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-[#D97757]">
              <Users className="w-3.5 h-3.5" />
              <span>Group Booking: {paxCount} Pax</span>
            </div>
            <span className="font-mono text-[#D97757] text-[11px]">
              {Number(amount) > 0 ? `${(Number(amount) / paxCount).toFixed(0)} AED / person` : 'Enter total for all pax'}
            </span>
          </div>
        )}
        <FormField name="financials.amount" label="Total Amount (AED) *" type="number" />
        <FormField name="financials.discount" label="Discount (AED)" type="number" />
        
        <div className="col-span-2 p-3 bg-[var(--sidebar-bg)] rounded-lg flex justify-between items-center border border-[var(--card-border)]">
          <span className="text-sm font-medium opacity-70">Receiving Amount</span>
          <span className="text-lg font-mono">{receivingAmount.toFixed(2)} AED</span>
        </div>

        <FormField name="financials.supplier_cost" label="Supplier Cost (AED)" type="number" />
        <FormField name="financials.refund" label="Refund (AED)" type="number" />

        <div className="col-span-2 p-3 bg-[#D97757]/10 text-[#D97757] rounded-lg flex justify-between items-center border border-[#D97757]/20 mt-2">
          <span className="text-sm font-medium">Profit / Balance</span>
          <span className="text-lg font-mono font-bold">{balance.toFixed(2)} AED</span>
        </div>

        <FormField 
          name="financials.payment_method" 
          label="Payment Method" 
          component="select"
          options={[
            { label: 'Cash', value: 'Cash' },
            { label: 'Bank Transfer', value: 'Bank Transfer' },
            { label: 'Credit Card', value: 'Credit Card' },
            { label: 'Credit', value: 'Credit' }
          ]} 
          className="col-span-2 mt-2" 
        />
      </div>
    </div>
  );
}
