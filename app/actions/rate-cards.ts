'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from './users';

export interface RateCard {
  id: string;
  visa_type: string;
  sort_order: number;
  section: string;
  supplier_costs: Record<string, string>;
  selling_price: string;
  sub_agent_price: string;
  other_agent_price: string;
  remark: string;
  required_documents: string;
  created_at: string;
  updated_at: string;
}

export async function getRateCards(): Promise<{ success: boolean; data: RateCard[]; error?: string }> {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rate_cards')
      .select('*')
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return { success: true, data: (data || []) as RateCard[] };
  } catch (err: any) {
    console.error('Failed to get rate cards:', err);
    return { success: false, data: [], error: err.message };
  }
}

export async function upsertRateCard(
  id: string | null,
  payload: Partial<Omit<RateCard, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; data?: RateCard; error?: string }> {
  try {
    await requirePermission('suppliers', id ? 'edit' : 'create');
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    if (id) {
      const { data, error } = await supabase
        .from('rate_cards')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      revalidatePath('/dashboard/suppliers');
      return { success: true, data: data as RateCard };
    } else {
      const { data, error } = await supabase
        .from('rate_cards')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      revalidatePath('/dashboard/suppliers');
      return { success: true, data: data as RateCard };
    }
  } catch (err: any) {
    console.error('Failed to upsert rate card:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteRateCard(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('suppliers', 'delete');
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { error } = await supabase.from('rate_cards').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard/suppliers');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete rate card:', err);
    return { success: false, error: err.message };
  }
}

export async function bulkImportRateCards(
  rows: Partial<Omit<RateCard, 'id' | 'created_at' | 'updated_at'>>[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    await requirePermission('suppliers', 'create');
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rate_cards')
      .insert(rows)
      .select();
    if (error) throw error;
    revalidatePath('/dashboard/suppliers');
    return { success: true, count: data?.length || 0 };
  } catch (err: any) {
    console.error('Failed to bulk import rate cards:', err);
    return { success: false, error: err.message };
  }
}
