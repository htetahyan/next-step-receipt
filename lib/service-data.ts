import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { getCurrentUserProfile } from '@/app/actions/users';
import { getCachedSuppliersAndRates } from '@/lib/cachedRates';
import { generateReferenceId } from '@/app/actions/services';
import { getSuppliers } from '@/app/actions/suppliers';

export const getServiceById = cache(async function getServiceById(id: string) {
  const supabase = await createClient();
  const { data: service } = await supabase
    .from('customer_services')
    .select('id, reference_id, customer_id, category, status, details, financials, created_at, customers(id, name, phone, passport_no, email)')
    .eq('id', id)
    .single();

  if (!service) notFound();
  return service;
});

export const getDropdownCustomers = cache(async function getDropdownCustomers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select('id, name, passport_no, phone')
    .order('created_at', { ascending: false })
    .limit(100);
  return data || [];
});

function mergeSuppliers(live: any[] | undefined, cached: any[] | undefined) {
  const map = new Map<string, any>();
  [...(live || []), ...(cached || [])].forEach((row) => {
    const name = String(row?.name || '').trim();
    if (!name) return;
    if (!map.has(name.toLowerCase())) map.set(name.toLowerCase(), { ...row, name });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getServiceEditPageData(id: string) {
  const [service, currentUser, customers, cached, liveSuppliers] = await Promise.all([
    getServiceById(id),
    getCurrentUserProfile(),
    getDropdownCustomers(),
    getCachedSuppliersAndRates(),
    getSuppliers(),
  ]);
  return {
    service,
    currentUser,
    customers,
    suppliers: mergeSuppliers(liveSuppliers.data, cached.suppliers),
    rateCards: cached.rateCards,
  };
}

export async function getServiceNewPageData(refPrefix?: string) {
  const [currentUser, customers, cached, nextRefId, liveSuppliers] = await Promise.all([
    getCurrentUserProfile(),
    getDropdownCustomers(),
    getCachedSuppliersAndRates(),
    refPrefix ? generateReferenceId(refPrefix) : Promise.resolve(''),
    getSuppliers(),
  ]);
  return {
    currentUser,
    customers,
    suppliers: mergeSuppliers(liveSuppliers.data, cached.suppliers),
    rateCards: cached.rateCards,
    uaeVisaTypes: cached.uaeVisaTypes,
    nextRefId,
  };
}
