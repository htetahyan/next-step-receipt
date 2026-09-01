import { unstable_cache, revalidateTag, updateTag, revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { RateCard } from '@/app/actions/rate-cards';

// Default seed rate card data matching company pricing sheet
export const DEFAULT_VISA_RATE_CARDS: Omit<RateCard, 'id' | 'created_at' | 'updated_at'>[] = [
  { visa_type: 'Visit Visa (30 Days)', section: 'Visa', sort_order: 1, supplier_costs: { 'AKSM': '285', 'DAHR': '290', 'Select My Flight': '290' }, selling_price: '449', sub_agent_price: '400', other_agent_price: '400', remark: '', required_documents: '(1) Photo (2) Passport (3) Passport cover page' },
  { visa_type: 'Visit Visa (60 Days)', section: 'Visa', sort_order: 2, supplier_costs: { 'AKSM': '410', 'DAHR': '425', 'Select My Flight': '415' }, selling_price: '649', sub_agent_price: '550', other_agent_price: '550', remark: '', required_documents: '(1) Photo (2) Passport' },
  { visa_type: 'Visit Visa (Kids, 30 Days)', section: 'Visa', sort_order: 3, supplier_costs: { 'DAHR': '40' }, selling_price: '250', sub_agent_price: '200', other_agent_price: '', remark: 'Must apply together with parents', required_documents: '(1) Photo (2) Passport (3) Birth Certificate' },
  { visa_type: 'Visit Visa (Kids, 60 Days)', section: 'Visa', sort_order: 4, supplier_costs: { 'AKSM': '60', 'DAHR': '70' }, selling_price: '400', sub_agent_price: '350', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Inside Visa Extension (30 Days) DXB', section: 'Visa', sort_order: 5, supplier_costs: { 'AKSM': '900', 'DAHR': '900' }, selling_price: '1100', sub_agent_price: '1050', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Inside Visa Extension (30 Days) SHJ', section: 'Visa', sort_order: 6, supplier_costs: { 'AKSM': '900', 'DAHR': '950' }, selling_price: '1150', sub_agent_price: '1100', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Cancel Visa (Visa Change by Bus)', section: 'Visa', sort_order: 7, supplier_costs: { 'AKSM': '635', 'DAHR': '680' }, selling_price: '850', sub_agent_price: '', other_agent_price: '', remark: '', required_documents: '(1) Photo (2) Passport (3) Cancel Visa (4) UAE ID' },
  { visa_type: 'Visit Visa (Visa Change by Bus) SHJ', section: 'Visa', sort_order: 8, supplier_costs: { 'AKSM': '1120', 'DAHR': '1090' }, selling_price: '1350', sub_agent_price: '1300', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Visit Visa (Visa Change by Bus) Dubai', section: 'Visa', sort_order: 9, supplier_costs: { 'AKSM': '1120', 'DAHR': '1190' }, selling_price: '1350', sub_agent_price: '1300', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Visa Change by Air - FLY DUBAI', section: 'Visa', sort_order: 10, supplier_costs: { 'AKSM': '1445', 'DAHR': '1620' }, selling_price: '1750', sub_agent_price: '1700', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Cancel Visa (Visa Change by Air - Oman)', section: 'Visa', sort_order: 11, supplier_costs: { 'AKSM': '1145', 'DAHR': '1290' }, selling_price: '1550', sub_agent_price: '1500', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Visit Visa (Visa Change by Air - Kuwait)', section: 'Visa', sort_order: 12, supplier_costs: { 'DAHR': '1290' }, selling_price: '1550', sub_agent_price: '1500', other_agent_price: '', remark: '', required_documents: '(1) Photo (2) Passport (3) Cancel Visa / Visit Visa' },
  { visa_type: 'Visit Visa (Visa Change by Air - Oman)', section: 'Visa', sort_order: 13, supplier_costs: { 'DAHR': '1505' }, selling_price: '1505', sub_agent_price: '1700', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Multi Entry Visa (30 Days) Dubai', section: 'Visa', sort_order: 14, supplier_costs: { 'AKSM': '510', 'DAHR': '450' }, selling_price: '750', sub_agent_price: '750', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Multi Entry Visa (60 Days) Dubai', section: 'Visa', sort_order: 15, supplier_costs: { 'AKSM': '800', 'DAHR': '750' }, selling_price: '1000', sub_agent_price: '1000', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Multi Entry Visa (30 Days) SHJ', section: 'Visa', sort_order: 18, supplier_costs: { 'DAHR': '1050' }, selling_price: '1200', sub_agent_price: '1200', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Multi Entry Visa (60 Days) SHJ', section: 'Visa', sort_order: 19, supplier_costs: { 'DAHR': '1180' }, selling_price: '1330', sub_agent_price: '1330', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Transit Visa (48 Hours)', section: 'Visa', sort_order: 20, supplier_costs: { 'DAHR': '120' }, selling_price: '220', sub_agent_price: '220', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'Transit Visa (96 Hours)', section: 'Visa', sort_order: 21, supplier_costs: { 'DAHR': '240' }, selling_price: '360', sub_agent_price: '340', other_agent_price: '', remark: '', required_documents: '' },
  { visa_type: 'SHJ (With Deposit) 30days Visa', section: 'Visa', sort_order: 22, supplier_costs: { 'DAHR': '520' }, selling_price: '750', sub_agent_price: '700', other_agent_price: '', remark: 'Deposit 1035 AED required', required_documents: '' },
  { visa_type: 'SHJ (With Deposit) 60days Visa', section: 'Visa', sort_order: 23, supplier_costs: { 'DAHR': '650' }, selling_price: '900', sub_agent_price: '850', other_agent_price: '', remark: 'Deposit 1035 AED required', required_documents: '' },
  { visa_type: 'SHJ (Without Deposit) 60days Visa', section: 'Visa', sort_order: 24, supplier_costs: { 'DAHR': '850' }, selling_price: '1000', sub_agent_price: '950', other_agent_price: '', remark: '', required_documents: '' },
];

export interface CachedSuppliersRatesData {
  suppliers: any[];
  rateCards: RateCard[];
  uaeVisaTypes: string[];
}

/**
 * Fast cached getter for Suppliers and Rate Cards
 * Cached in memory & data cache with 'suppliers-rates' tag
 */
export const getCachedSuppliersAndRates = unstable_cache(
  async (): Promise<CachedSuppliersRatesData> => {
    try {
      const supabase = await createClient();
      const [suppliersRes, rateCardsRes] = await Promise.all([
        supabase.from('suppliers').select('id, name, services, contact_person, phone, email').order('name', { ascending: true }),
        supabase.from('rate_cards').select('id, visa_type, section, sort_order, supplier_costs, selling_price, sub_agent_price, other_agent_price, remark, required_documents, created_at, updated_at').order('sort_order', { ascending: true })
      ]);

      const suppliers = suppliersRes.data || [];
      let rateCards = (rateCardsRes.data as RateCard[]) || [];

      // If DB table has no rows yet, use default rate cards
      if (rateCards.length === 0) {
        rateCards = DEFAULT_VISA_RATE_CARDS.map((rc, idx) => ({
          ...rc,
          id: `seed-${idx}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as RateCard[];
      }

      // Filter only UAE Visa types (section: 'Visa' or non-'Other Services')
      const uaeVisaTypes = rateCards
        .filter(r => (r.section || 'Visa').toLowerCase() === 'visa')
        .map(r => r.visa_type);

      return {
        suppliers,
        rateCards,
        uaeVisaTypes,
      };
    } catch (err) {
      console.error('Error in getCachedSuppliersAndRates:', err);
      return {
        suppliers: [],
        rateCards: DEFAULT_VISA_RATE_CARDS.map((rc, idx) => ({
          ...rc,
          id: `seed-${idx}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as RateCard[],
        uaeVisaTypes: DEFAULT_VISA_RATE_CARDS.map(r => r.visa_type),
      };
    }
  },
  ['suppliers-and-rates-v1'],
  {
    revalidate: 86400, // 24 hours default, instantly purged via revalidateRatesCache
    tags: ['suppliers-rates', 'suppliers', 'rate_cards'],
  }
);

/**
 * Invalidate the cache whenever suppliers or rate cards are created, edited, or deleted
 */
export async function revalidateRatesCache() {
  try {
    try {
      revalidateTag('suppliers-rates', 'default');
      revalidateTag('suppliers', 'default');
      revalidateTag('rate_cards', 'default');
    } catch {
      // If called in server action context where updateTag is supported
      try { updateTag('suppliers-rates'); } catch {}
    }
    revalidatePath('/dashboard/uae-visa/new');
    revalidatePath('/dashboard/air-tickets/new');
    revalidatePath('/dashboard/other-visa/new');
    revalidatePath('/dashboard/tour-packages/new');
    revalidatePath('/dashboard/suppliers');
  } catch (err) {
    console.error('Failed to revalidate rates cache:', err);
  }
}
