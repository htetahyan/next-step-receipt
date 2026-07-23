'use server';

import { revalidatePath } from 'next/cache';

// Fetch all suppliers
export async function getSuppliers() {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('Failed to get suppliers:', err);
    return { success: false, error: err.message, data: [] };
  }
}

// Add a new supplier
export async function addSupplier(data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  services?: any[];
}) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const { data: newSupplier, error } = await supabase
      .from('suppliers')
      .insert({
        name: data.name,
        contact_person: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        services: data.services || [],
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/suppliers');
    return { success: true, data: newSupplier };
  } catch (err: any) {
    console.error('Failed to add supplier:', err);
    return { success: false, error: err.message };
  }
}

// Update an existing supplier
export async function updateSupplier(
  id: string,
  data: {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    services?: any[];
  }
) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from('suppliers')
      .update({
        name: data.name,
        contact_person: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        services: data.services || [],
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/suppliers');
    return { success: true, data: updated };
  } catch (err: any) {
    console.error('Failed to update supplier:', err);
    return { success: false, error: err.message };
  }
}

// Delete a supplier
export async function deleteSupplier(id: string) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/dashboard/suppliers');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete supplier:', err);
    return { success: false, error: err.message };
  }
}
