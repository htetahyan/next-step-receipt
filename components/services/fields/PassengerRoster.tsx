'use client';

import React, { useState, useRef } from 'react';
import { Users, UserPlus, Trash2, Camera, Loader2, Check, FileText, Ticket, UserCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface Passenger {
  id: string;
  name: string;
  passport_no?: string;
  nationality?: string;
  dob?: string;
  gender?: string;
  ticket_no?: string;
  visa_app_no?: string;
}

interface PassengerRosterProps {
  passengers: Passenger[];
  onChange: (passengers: Passenger[]) => void;
  serviceCategory?: string;
  primaryCustomer?: {
    name?: string;
    passport_no?: string;
    phone?: string;
  } | null;
  onPassportScanned?: (file: File, extracted: any, index: number) => void;
}

export function PassengerRoster({
  passengers,
  onChange,
  serviceCategory = '',
  primaryCustomer,
  onPassportScanned,
}: PassengerRosterProps) {
  const [scanningIndex, setScanningIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const isAirTicket = serviceCategory.toLowerCase().includes('ticket') || serviceCategory.toLowerCase().includes('air');
  const isVisa = serviceCategory.toLowerCase().includes('visa');

  // Add new passenger
  const handleAddPassenger = () => {
    const newPax: Passenger = {
      id: `pax_${Date.now()}_${passengers.length + 1}`,
      name: '',
      passport_no: '',
      nationality: '',
    };
    onChange([...passengers, newPax]);
  };

  // Remove a passenger
  const handleRemovePassenger = (index: number) => {
    if (passengers.length <= 1) {
      // If only 1 remains, resetting to empty turns off multi-pax mode
      onChange([]);
      return;
    }
    const updated = passengers.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Update a field for a passenger
  const handleUpdateField = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  // Fill Pax 1 from Primary Customer
  const handleFillFromCustomer = (index: number) => {
    if (!primaryCustomer) return;
    const updated = [...passengers];
    updated[index] = {
      ...updated[index],
      name: primaryCustomer.name || updated[index].name,
      passport_no: primaryCustomer.passport_no || updated[index].passport_no,
    };
    onChange(updated);
    toast.success(`Copied details from ${primaryCustomer.name}`);
  };

  // Scan Passport for a specific passenger using Gemini API
  const handleScanPassport = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningIndex(index);
    try {
      const formData = new FormData();
      formData.append('passport', file);

      const res = await fetch('/api/parse-passport', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update passenger with extracted details
      const updated = [...passengers];
      updated[index] = {
        ...updated[index],
        name: data.name || updated[index].name,
        passport_no: (data.passport_no || updated[index].passport_no || '').toUpperCase().replace(/\s+/g, ''),
        nationality: data.nationality || updated[index].nationality,
        dob: data.dob || updated[index].dob,
        gender: data.gender || updated[index].gender,
      };
      onChange(updated);

      if (onPassportScanned) {
        onPassportScanned(file, data, index);
      }

      toast.success(`Passport scanned: ${data.name || 'Details extracted'}`);
    } catch (err: any) {
      toast.error(`Failed to scan passport: ${err.message}`);
    } finally {
      setScanningIndex(null);
      if (fileInputRefs.current[index]) {
        fileInputRefs.current[index]!.value = '';
      }
    }
  };

  const isMultiPax = passengers.length > 1;

  return (
    <div className="card-anthropic p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[var(--card-border)] gap-2">
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-[#D97757]" />
          <h3 className="text-xs font-serif uppercase tracking-wider opacity-70">
            Travelers & Passengers {isMultiPax && <span className="text-[#D97757] font-mono font-bold">({passengers.length} Pax)</span>}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {!isMultiPax ? (
            <button
              type="button"
              onClick={() => {
                // Initialize with Pax 1 (Primary) and Pax 2
                const pax1: Passenger = {
                  id: `pax_${Date.now()}_1`,
                  name: primaryCustomer?.name || '',
                  passport_no: primaryCustomer?.passport_no || '',
                };
                const pax2: Passenger = {
                  id: `pax_${Date.now()}_2`,
                  name: '',
                  passport_no: '',
                };
                onChange([pax1, pax2]);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--card-border)] hover:border-[#D97757] bg-[var(--sidebar-bg)] hover:bg-[#D97757]/10 text-xs font-medium text-[var(--foreground)] hover:text-[#D97757] transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#D97757]" />
              <span>+ Add Passenger (Multi-Pax / Group)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddPassenger}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#D97757]/10 text-[#D97757] hover:bg-[#D97757]/20 text-xs font-medium transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Traveler</span>
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                className="px-2 py-1 text-xs opacity-50 hover:opacity-100 hover:text-red-500 transition-colors cursor-pointer"
                title="Reset to Single Customer"
              >
                Reset to Solo (1 Pax)
              </button>
            </div>
          )}
        </div>
      </div>

      {!isMultiPax ? (
        <div className="text-xs opacity-60 flex items-center justify-between py-1 font-mono">
          <span>Solo booking: The selected customer is the primary traveler.</span>
          <span className="text-[11px] opacity-75">Need multiple travelers under 1 payer? Click &ldquo;+ Add Passenger&rdquo;</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-[var(--sidebar-bg)] rounded-xl border border-[var(--card-border)] text-xs opacity-75 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#D97757] shrink-0" />
            <span>
              <strong>Group / Agent Mode:</strong> The selected customer above will be billed as the payer/agent. Enter individual passenger names and passport numbers below.
            </span>
          </div>

          <div className="space-y-3">
            {passengers.map((pax, index) => {
              const isScanning = scanningIndex === index;
              return (
                <div
                  key={pax.id || index}
                  className="p-4 rounded-xl bg-[var(--sidebar-bg)] border border-[var(--card-border)] relative space-y-3 transition-all hover:border-[#D97757]/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#D97757]/15 text-[#D97757] text-xs font-bold font-serif flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        Passenger {index + 1} {index === 0 && '(Lead Traveler)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {index === 0 && primaryCustomer?.name && !pax.name && (
                        <button
                          type="button"
                          onClick={() => handleFillFromCustomer(index)}
                          className="inline-flex items-center gap-1 text-[11px] text-[#D97757] hover:underline cursor-pointer"
                          title="Same as Billing Customer"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Same as Payer</span>
                        </button>
                      )}

                      {/* Scan Passport Button */}
                      <label
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          isScanning
                            ? 'bg-emerald-500/20 text-emerald-600'
                            : 'bg-[var(--card-bg)] hover:bg-[#D97757]/10 text-[var(--foreground)] hover:text-[#D97757] border border-[var(--card-border)]'
                        }`}
                        title="Upload passport image to auto-fill details"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            <span>Scanning...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5 text-[#D97757]" />
                            <span>Scan Passport</span>
                          </>
                        )}
                        <input
                          ref={(el) => {
                            fileInputRefs.current[index] = el;
                          }}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          disabled={isScanning}
                          onChange={(e) => handleScanPassport(e, index)}
                        />
                      </label>

                      {passengers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePassenger(index)}
                          className="p-1 opacity-40 hover:opacity-100 hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="Remove passenger"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Passenger Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[11px] font-medium opacity-60 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={pax.name}
                        onChange={(e) => handleUpdateField(index, 'name', e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full text-xs font-medium px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] focus:outline-none focus:ring-1 focus:ring-[#D97757] text-[var(--foreground)]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium opacity-60 mb-1">
                        Passport No
                      </label>
                      <input
                        type="text"
                        value={pax.passport_no || ''}
                        onChange={(e) => handleUpdateField(index, 'passport_no', e.target.value.toUpperCase().replace(/\s+/g, ''))}
                        placeholder="e.g. A1234567"
                        className="w-full text-xs font-mono font-medium px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] focus:outline-none focus:ring-1 focus:ring-[#D97757] uppercase text-[var(--foreground)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium opacity-60 mb-1">
                        Nationality
                      </label>
                      <input
                        type="text"
                        value={pax.nationality || ''}
                        onChange={(e) => handleUpdateField(index, 'nationality', e.target.value)}
                        placeholder="e.g. Indian, Filipino, British"
                        className="w-full text-xs font-medium px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] focus:outline-none focus:ring-1 focus:ring-[#D97757] text-[var(--foreground)]"
                      />
                    </div>

                    {/* Context-aware field for Air Tickets */}
                    {isAirTicket && (
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-[11px] font-medium opacity-60 mb-1 flex items-center gap-1">
                          <Ticket className="w-3 h-3 text-[#D97757]" />
                          <span>E-Ticket Number</span>
                        </label>
                        <input
                          type="text"
                          value={pax.ticket_no || ''}
                          onChange={(e) => handleUpdateField(index, 'ticket_no', e.target.value)}
                          placeholder="e.g. 176-1234567890"
                          className="w-full text-xs font-mono font-medium px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] focus:outline-none focus:ring-1 focus:ring-[#D97757] text-[var(--foreground)]"
                        />
                      </div>
                    )}

                    {/* Context-aware field for Visas */}
                    {isVisa && (
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-[11px] font-medium opacity-60 mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-[#D97757]" />
                          <span>Visa / Application Number</span>
                        </label>
                        <input
                          type="text"
                          value={pax.visa_app_no || ''}
                          onChange={(e) => handleUpdateField(index, 'visa_app_no', e.target.value)}
                          placeholder="e.g. 2026/1234567"
                          className="w-full text-xs font-mono font-medium px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] focus:outline-none focus:ring-1 focus:ring-[#D97757] text-[var(--foreground)]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
