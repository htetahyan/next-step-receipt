'use client';

import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, FileText, X, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { updateCustomer } from '@/app/actions/customers';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    passport_no?: string | null;
    passportNo?: string | null;
    metadata?: any;
  };
  onSuccess?: () => void;
}

export default function EditCustomerModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: EditCustomerModalProps) {
  const [name, setName] = useState(customer.name || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [email, setEmail] = useState(customer.email || '');
  const [passportNo, setPassportNo] = useState(customer.passport_no || customer.passportNo || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if customer prop changes
  useEffect(() => {
    if (isOpen) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setPassportNo(customer.passport_no || customer.passportNo || '');
    }
  }, [isOpen, customer]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('phone', phone.trim());
      formData.append('email', email.trim());
      formData.append('passport_no', passportNo.trim().toUpperCase());

      const res = await updateCustomer(customer.id, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Customer profile updated successfully');
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update customer profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl z-10 scale-in-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D97757]/10 text-[#D97757] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-medium text-[var(--foreground)]">Edit Customer Profile</h3>
              <p className="text-xs opacity-60">Update primary client contact & passport information</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg hover:bg-[var(--card-border)] text-gray-400 hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium opacity-80 mb-1.5">
              Full Legal Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="input-anthropic w-full pl-9 pr-3 h-9 text-xs"
                autoFocus
              />
            </div>
          </div>

          {/* Passport Number */}
          <div>
            <label className="block text-xs font-medium opacity-80 mb-1.5">
              Passport Number
            </label>
            <div className="relative">
              <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-gray-400">
                <FileText className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={passportNo}
                onChange={(e) => setPassportNo(e.target.value.toUpperCase())}
                placeholder="e.g. A12345678"
                className="input-anthropic w-full pl-9 pr-3 h-9 text-xs font-mono uppercase"
              />
            </div>
          </div>

          {/* Phone / WhatsApp */}
          <div>
            <label className="block text-xs font-medium opacity-80 mb-1.5">
              Phone / WhatsApp
            </label>
            <div className="relative">
              <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-gray-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +971 50 123 4567"
                className="input-anthropic w-full pl-9 pr-3 h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-medium opacity-80 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                className="input-anthropic w-full pl-9 pr-3 h-9 text-xs"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--card-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 h-8.5 rounded-lg border border-[var(--card-border)] text-xs font-medium hover:bg-[var(--sidebar-bg)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 h-8.5 bg-[#D97757] hover:bg-[#c66446] text-white text-xs font-medium rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
