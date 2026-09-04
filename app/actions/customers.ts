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

export async function getCustomerById(id: string) {
  try {
    if (!id) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, passport_no, metadata, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('getCustomerById error:', error);
      return null;
    }
    return data || null;
  } catch (error) {
    console.error('getCustomerById caught error:', error);
    return null;
  }
}

export async function searchCustomers(query: string) {
  try {
    const raw = query.trim();
    if (!raw) return [];

    const supabase = await createClient();

    // Sanitize string to prevent PostgREST URL syntax errors (commas, parentheses, colons break .or syntax)
    const sanitized = raw.replace(/[,():;'"*]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!sanitized) return [];

    const alphanumeric = sanitized.replace(/[^a-zA-Z0-9]/g, '');
    const digitsOnly = sanitized.replace(/\D/g, '');

    // Build targeted conditions for PostgREST .or() filter
    const orConditions: string[] = [
      `name.ilike.%${sanitized}%`,
      `passport_no.ilike.%${sanitized}%`,
      `phone.ilike.%${sanitized}%`,
      `email.ilike.%${sanitized}%`,
    ];

    // If alphanumeric stripped string is different (e.g. passport "A 123" -> "A123"), match it
    if (alphanumeric && alphanumeric !== sanitized && alphanumeric.length >= 3) {
      orConditions.push(`passport_no.ilike.%${alphanumeric}%`);
    }

    // If digitsOnly has 4+ digits (e.g. local phone number suffix "1234567"), match it
    if (digitsOnly && digitsOnly.length >= 4 && digitsOnly !== sanitized) {
      orConditions.push(`phone.ilike.%${digitsOnly}%`);
      orConditions.push(`passport_no.ilike.%${digitsOnly}%`);
    }

    // If multiple words were typed (e.g. "Mohamed Ali"), also match individual words in name
    const words = sanitized.split(' ').filter(w => w.length >= 2);
    if (words.length > 1) {
      words.forEach(word => {
        orConditions.push(`name.ilike.%${word}%`);
      });
    }

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, passport_no, metadata')
      .or(orConditions.join(','))
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('searchCustomers Supabase .or error:', error);
      // Fallback to simple name search if complex filter fails
      const { data: fallbackData } = await supabase
        .from('customers')
        .select('id, name, email, phone, passport_no, metadata')
        .ilike('name', `%${sanitized}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      return fallbackData || [];
    }

    return data || [];
  } catch (error) {
    console.error('searchCustomers caught error:', error);
    return [];
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
