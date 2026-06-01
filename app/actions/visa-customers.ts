'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addVisaCustomer(formData: FormData) {
  const supabase = await createClient()

  // Generate next customer ID
  const { data: latestCustomers } = await supabase
    .from('visa_customers')
    .select('customer_id')
    .order('customer_id', { ascending: false })
    .limit(1)

  let nextId = 'AE0001'
  if (latestCustomers && latestCustomers.length > 0) {
    const latestId = latestCustomers[0].customer_id
    if (latestId && latestId.startsWith('AE')) {
      const numStr = latestId.substring(2)
      const num = parseInt(numStr, 10)
      if (!isNaN(num)) {
        nextId = `AE${String(num + 1).padStart(4, '0')}`
      }
    }
  }

  const payload = {
    customer_id: nextId,
    monthly_count: formData.get('monthly_count') as string || null,
    mode_of_visa: formData.get('mode_of_visa') as string || null,
    customer_name: formData.get('customer_name') as string,
    visa_issued_date: formData.get('visa_issued_date') ? (formData.get('visa_issued_date') as string) : null,
    travel_date: formData.get('travel_date') ? (formData.get('travel_date') as string) : null,
    visa_expiry_date: formData.get('visa_expiry_date') as string || null,
    phone_contact: formData.get('phone_contact') as string || null,
    visa_supplier: formData.get('visa_supplier') as string || null,
    email_address: formData.get('email_address') as string || null,
    passport_no: formData.get('passport_no') as string || null,
    visa_duration: formData.get('visa_duration') as string || null,
    amount: formData.get('amount') ? parseFloat(formData.get('amount') as string) : 0,
    discount_agent_fees: formData.get('discount_agent_fees') ? parseFloat(formData.get('discount_agent_fees') as string) : 0,
    receiving_amount: formData.get('receiving_amount') ? parseFloat(formData.get('receiving_amount') as string) : 0,
    visa_fees_to_supplier: formData.get('visa_fees_to_supplier') ? parseFloat(formData.get('visa_fees_to_supplier') as string) : 0,
    refund: formData.get('refund') as string || null,
    payment_method: formData.get('payment_method') as string || null,
    balance: formData.get('balance') as string || null,
    comments: formData.get('comments') as string || null,
    referred_by: formData.get('referred_by') as string || null,
    remark: formData.get('remark') as string || null,
    status: formData.get('status') as string || 'Open',
  }

  const { data, error } = await supabase
    .from('visa_customers')
    .insert([payload])
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/visa-customers')
  return { data: data[0] }
}

export async function updateVisaCustomer(id: string, formData: FormData) {
  const supabase = await createClient()

  const payload = {
    monthly_count: formData.get('monthly_count') as string || null,
    mode_of_visa: formData.get('mode_of_visa') as string || null,
    customer_name: formData.get('customer_name') as string,
    visa_issued_date: formData.get('visa_issued_date') ? (formData.get('visa_issued_date') as string) : null,
    travel_date: formData.get('travel_date') ? (formData.get('travel_date') as string) : null,
    visa_expiry_date: formData.get('visa_expiry_date') as string || null,
    phone_contact: formData.get('phone_contact') as string || null,
    visa_supplier: formData.get('visa_supplier') as string || null,
    email_address: formData.get('email_address') as string || null,
    passport_no: formData.get('passport_no') as string || null,
    visa_duration: formData.get('visa_duration') as string || null,
    amount: formData.get('amount') ? parseFloat(formData.get('amount') as string) : 0,
    discount_agent_fees: formData.get('discount_agent_fees') ? parseFloat(formData.get('discount_agent_fees') as string) : 0,
    receiving_amount: formData.get('receiving_amount') ? parseFloat(formData.get('receiving_amount') as string) : 0,
    visa_fees_to_supplier: formData.get('visa_fees_to_supplier') ? parseFloat(formData.get('visa_fees_to_supplier') as string) : 0,
    refund: formData.get('refund') as string || null,
    payment_method: formData.get('payment_method') as string || null,
    balance: formData.get('balance') as string || null,
    comments: formData.get('comments') as string || null,
    referred_by: formData.get('referred_by') as string || null,
    remark: formData.get('remark') as string || null,
    status: formData.get('status') as string || 'Open',
  }

  const { error } = await supabase
    .from('visa_customers')
    .update(payload)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/visa-customers')
  return { message: 'Visa customer updated' }
}

export async function deleteVisaCustomer(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('visa_customers')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/visa-customers')
  return { message: 'Visa customer deleted' }
}

export async function searchVisaCustomers(query: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('visa_customers')
    .select('*')
    .or(`customer_name.ilike.%${query}%,customer_id.ilike.%${query}%,passport_no.ilike.%${query}%`)
    .limit(20)

  if (error) return []
  return data
}
