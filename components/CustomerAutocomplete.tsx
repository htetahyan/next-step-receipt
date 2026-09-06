'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, UserPlus, Check, Loader2, User } from 'lucide-react'
import { searchCustomers } from '@/app/actions/customers'

type Props = {
  onSelect: (customer: any) => void;
  defaultValue?: string;
  placeholder?: string;
  name: string;
  required?: boolean;
}

export default function CustomerAutocomplete({ onSelect, defaultValue, placeholder, name, required }: Props) {
  const [query, setQuery] = useState(defaultValue || '')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 1 && isOpen) {
        setIsLoading(true)
        const results = await searchCustomers(query)
        setSuggestions(results)
        setIsLoading(false)
      } else {
        setSuggestions([])
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setIsOpen(true)
    setSelectedIndex(-1)
    onSelect({ name: e.target.value, isNew: true })
  }

  const handleSelect = (customer: any) => {
    setQuery(customer.name)
    setIsOpen(false)
    onSelect(customer)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(p => (p < suggestions.length - 1 ? p + 1 : p))
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(p => (p > -1 ? p - 1 : p))
    } else if (e.key === 'Enter') {
      if (selectedIndex > -1 && suggestions[selectedIndex]) {
        e.preventDefault()
        handleSelect(suggestions[selectedIndex])
      }
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative group">
        <div className="absolute left-4 inset-y-0 flex items-center pointer-events-none">
          <User className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-colors ${isOpen ? 'text-emerald-600' : ''}`} />
        </div>
        <input
          type="text"
          name={name}
          required={required}
          value={query}
          autoComplete="off"
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Search or enter customer name"}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-12 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all font-medium shadow-sm"
        />
        <div className="absolute right-4 inset-y-0 flex items-center pointer-events-none">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : <Search className="w-5 h-5 text-slate-300" />}
        </div>
      </div>

      {isOpen && (query.length > 0 || suggestions.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[320px] overflow-y-auto p-2 scrollbar-hide">
            {suggestions.length > 0 ? (
              <div className="space-y-1">
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Existing Clients</p>
                {suggestions.map((customer, index) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelect(customer)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all ${selectedIndex === index ? 'bg-emerald-700 text-white translate-x-1' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedIndex === index ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                          {customer.name[0]}
                       </div>
                        <div>
                          <div className={`font-bold text-sm ${selectedIndex === index ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{customer.name}</div>
                          <div className={`text-[10px] ${selectedIndex === index ? 'text-emerald-100' : 'text-slate-500'} flex items-center gap-2 flex-wrap`}>
                            {customer.passport_no && <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">Pass: {customer.passport_no}</span>}
                            {customer.phone && <span>· Tel: {customer.phone}</span>}
                            {customer.email && <span>· {customer.email}</span>}
                            {!customer.passport_no && !customer.phone && !customer.email && <span>No additional details</span>}
                          </div>
                        </div>
                    </div>
                    {selectedIndex === index && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            ) : null}

            {query.length > 0 && !suggestions.find(s => s.name.toLowerCase() === query.toLowerCase()) && (
              <div className={suggestions.length > 0 ? "mt-2 pt-2 border-t border-slate-100 dark:border-slate-800" : ""}>
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">New Client</p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-sm shadow-emerald-600/40">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                     <div className="text-sm font-bold">Register "{query}"</div>
                     <div className="text-[10px] text-emerald-700/60 dark:text-emerald-400/60">New profile will be created on save</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
