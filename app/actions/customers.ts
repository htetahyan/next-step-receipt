'use server'

import { revalidatePath } from 'next/cache'
import { customerSchema } from '@/lib/validations/serviceSchemas'
import { createClient } from '@/utils/supabase/server'
import { requirePermission } from '@/app/actions/users'

export async function addCustomer(formData: FormData) {
  try {
    await requirePermission('customers', 'create');
  } catch (err: any) {
    return { error: err.message };
  }

  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const passportNo = formData.get('passport_no') as string
  const metadataStr = formData.get('metadata') as string

  // 2. Validate input with Zod
  try {
    customerSchema.parse({ name, email, phone, passport_no: passportNo })
  } catch (zodErr: any) {
    return { error: zodErr.message || 'Validation failed' }
  }

  let metadata = {}
  if (metadataStr) {
    try {
      metadata = JSON.parse(metadataStr)
    } catch(e) {}
  }

  try {
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        name,
        email: email || null,
        phone: phone || null,
        passport_no: passportNo || null,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath('/dashboard/customers')
    return { data: newCustomer }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateCustomer(id: string, formData: FormData) {
  try {
    await requirePermission('customers', 'edit');
  } catch (err: any) {
    return { error: err.message };
  }

  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const passportNo = formData.get('passport_no') as string
  const metadataStr = formData.get('metadata') as string

  // 2. Validate input with Zod
  try {
    customerSchema.parse({ name, email, phone, passport_no: passportNo })
  } catch (zodErr: any) {
    return { error: zodErr.message || 'Validation failed' }
  }

  let metadata = undefined
  if (metadataStr) {
    try {
      metadata = JSON.parse(metadataStr)
    } catch(e) {}
  }

  try {
    const updateData: any = {
      name,
      email: email || null,
      phone: phone || null,
      passport_no: passportNo || null,
    };
    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/customers')
    return { message: 'Customer updated' }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteCustomer(id: string) {
  try {
    await requirePermission('customers', 'delete');

    const supabase = await createClient()

    // 1. Delete associated invoices first
    await supabase.from('invoices').delete().eq('customer_id', id);
    
    // 2. Delete the customer (services and docs will cascade delete)
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    
    revalidatePath('/dashboard/customers')
    return { success: true, message: 'Customer deleted' }
  } catch (error: any) {
    console.error("Delete customer error:", error);
    return { error: error.message }
  }
}

export async function searchCustomers(query: string) {
  try {
    const q = query.trim();
    if (!q) return [];

    const supabase = await createClient()
    const { data } = await supabase
      .from('customers')
      .select('id, name, email, phone, passport_no, metadata')
      .or(`name.ilike.%${q}%,passport_no.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(15);

    return data || [];
  } catch (error) {
    return []
  }
}

export async function findCustomerByPassportOrName(passportNo: string, name: string) {
  try {
    const { createClient } = await import('@/utils/supabase/server')
    const supabase = await createClient()

    if (passportNo && passportNo.trim()) {
      const trimmedPassport = passportNo.replace(/\s+/g, '').toUpperCase();
      const { data: byPassport } = await supabase
        .from('customers')
        .select('id, name, passport_no, phone, email, created_at')
        .eq('passport_no', trimmedPassport)
        .maybeSingle();
      if (byPassport) return { data: byPassport };
    }

    if (name && name.trim()) {
      const { data: byName } = await supabase
        .from('customers')
        .select('id, name, passport_no, phone, email, created_at')
        .eq('name', name.trim())
        .maybeSingle();
      if (byName) return { data: byName };
    }

    return { data: null };
  } catch (error: any) {
    return { error: error.message, data: null };
  }
}
