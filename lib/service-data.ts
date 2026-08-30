import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { getCurrentUserProfile } from '@/app/actions/users';
import { getRateCards } from '@/app/actions/rate-cards';

// Fetches a single service by ID with customer join, or throws notFound()
export async function getServiceById(id: string) {
  const supabase = await createClient();
  const { data: service } = await supabase
    .from('customer_services')
    .select('id, reference_id, customer_id, category, status, details, financials, created_at, customers(id, name, phone, passport_no, email)')
    .eq('id', id)
    .single();
  
  if (!service) notFound();
  return service;
}

// Fetches customers for dropdown (top 100, ordered by created_at DESC)
export async function getDropdownCustomers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select('id, name, passport_no, phone')
    .order('created_at', { ascending: false })
    .limit(100);
  return data || [];
}

// Fetches suppliers list
export async function getDropdownSuppliers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('suppliers')
    .select('id, name, services')
    .order('name', { ascending: true });
  return data || [];
}

// Combined: fetches service + customers + suppliers for edit pages
export async function getServiceEditPageData(id: string) {
  const [service, currentUser, customers, suppliers, rateCardsRes] = await Promise.all([
    getServiceById(id),
    getCurrentUserProfile(),
    getDropdownCustomers(),
    getDropdownSuppliers(),
    getRateCards(),
  ]);
  return { service, currentUser, customers, suppliers, rateCards: rateCardsRes.data || [] };
}

// Combined: fetches customers + suppliers + rate cards for new pages
export async function getServiceNewPageData() {
  const [currentUser, customers, suppliers, rateCardsRes] = await Promise.all([
    getCurrentUserProfile(),
    getDropdownCustomers(),
    getDropdownSuppliers(),
    getRateCards(),
  ]);
  return { currentUser, customers, suppliers, rateCards: rateCardsRes.data || [] };
}
