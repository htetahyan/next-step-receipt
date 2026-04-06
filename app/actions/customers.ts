'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCustomer(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string

  const { data, error } = await supabase
    .from('customers')
    .insert([{ name, email, phone }])
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/customers')
  return { data: data[0] }
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string

  const { error } = await supabase
    .from('customers')
    .update({ name, email, phone })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/customers')
  return { message: 'Customer updated' }
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/customers')
  return { message: 'Customer deleted' }
}

export async function searchCustomers(query: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(10)

  if (error) return []
  return data
}
