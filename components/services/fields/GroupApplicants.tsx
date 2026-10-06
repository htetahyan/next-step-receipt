'use client';

import React, { useEffect, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { searchCustomers } from '@/app/actions/customers';
import { Passenger } from './PassengerRoster';

export function GroupApplicants({
  companions,
  onChange,
}: {
  companions: Passenger[];
  onChange: (next: Passenger[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await searchCustomers(q);
      if (!cancelled) setResults(found || []);
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const addPerson = (person: { name: string; passport_no?: string }) => {
    const name = person.name.trim();
    if (!name) return;
    const exists = companions.some((c) => c.name.trim().toLowerCase() === name.toLowerCase());
    if (exists) return;
    onChange([
      ...companions,
      {
        id: `pax_${Date.now()}_${companions.length + 1}`,
        name,
        passport_no: person.passport_no || '',
      },
    ]);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="card-anthropic p-5 space-y-3">
      <div>
        <h3 className="text-sm font-serif">Applying together</h3>
        <p className="text-xs opacity-60 mt-1">
          Add the other people on this same visa or service. The first customer stays the main record.
        </p>
      </div>

      {companions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {companions.map((person) => (
            <span key={person.id} className="inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] px-2.5 py-1 text-xs">
              {person.name}
              {person.passport_no ? <span className="opacity-50 font-mono">{person.passport_no}</span> : null}
              <button type="button" onClick={() => onChange(companions.filter((c) => c.id !== person.id))} className="opacity-60 hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addPerson({ name: query });
            }
          }}
          placeholder="Search a name, or type a new one"
          className="flex-1 h-9 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => addPerson({ name: query })}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] px-3 text-xs font-medium"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {results.length > 0 && (
        <div className="rounded-lg border border-[var(--card-border)] overflow-hidden">
          {results.slice(0, 6).map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => addPerson({ name: customer.name, passport_no: customer.passport_no })}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--sidebar-bg)] border-b border-[var(--card-border)] last:border-0"
            >
              {customer.name}
              {customer.passport_no ? <span className="ml-2 text-xs opacity-50 font-mono">{customer.passport_no}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
