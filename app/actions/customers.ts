'use server'

import { db } from '@/db'
import { customers, invoices } from '@/db/schema'
import { eq, ilike } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { customerSchema } from '@/lib/validations/serviceSchemas'

export async function addCustomer(formData: FormData) {
  // 1. Authenticate user
  const { createClient } = await import('@/utils/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

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
    const [newCustomer] = await db.insert(customers).values({
      name,
      email,
      phone,
      passportNo,
      metadata
    }).returning()
    
    revalidatePath('/dashboard/customers')
    return { data: newCustomer }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateCustomer(id: string, formData: FormData) {
  // 1. Authenticate user
  const { createClient } = await import('@/utils/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

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
    await db.update(customers).set({
      name,
      email,
      phone,
      passportNo,
      ...(metadata !== undefined && { metadata })
    }).where(eq(customers.id, id))

    revalidatePath('/dashboard/customers')
    return { message: 'Customer updated' }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteCustomer(id: string) {
  try {
    // 1. Delete associated invoices first (since they have 'restrict' constraint in schema)
    await db.delete(invoices).where(eq(invoices.customerId, id))
    
    // 2. Delete the customer (services and docs will cascade delete)
    await db.delete(customers).where(eq(customers.id, id))
    
    revalidatePath('/dashboard/customers')
    return { success: true, message: 'Customer deleted' }
  } catch (error: any) {
    console.error("Delete customer error:", error);
    return { error: error.message }
  }
}

export async function searchCustomers(query: string) {
  try {
    const data = await db.select().from(customers)
      .where(ilike(customers.name, `%${query}%`))
      .limit(10)
    return data
  } catch (error) {
    return []
  }
}

export async function findCustomerByPassportOrName(passportNo: string, name: string) {
  try {
    if (passportNo && passportNo.trim()) {
      const trimmedPassport = passportNo.replace(/\s+/g, '').toUpperCase();
      const [byPassport] = await db
        .select()
        .from(customers)
        .where(eq(customers.passportNo, trimmedPassport))
        .limit(1);
      if (byPassport) return { data: byPassport };
    }

    if (name && name.trim()) {
      const [byName] = await db
        .select()
        .from(customers)
        .where(eq(customers.name, name.trim()))
        .limit(1);
      if (byName) return { data: byName };
    }

    return { data: null };
  } catch (error: any) {
    return { error: error.message, data: null };
  }
}
