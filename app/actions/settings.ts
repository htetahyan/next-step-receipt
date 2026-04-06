'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type SettingsData = {
  company_name: string;
  company_address: string;
  bank_name: string;
  bank_branch: string;
  bank_iban: string;
  bank_account_no: string;
};

export type SettingsState = {
  error?: string;
  message?: string;
} | undefined;

export async function getSettings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data
}

export async function updateSettings(prevState: SettingsState, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const settingsData: Partial<SettingsData> = {
    company_name: formData.get('company_name') as string,
    company_address: formData.get('company_address') as string,
    bank_name: formData.get('bank_name') as string,
    bank_branch: formData.get('bank_branch') as string,
    bank_iban: formData.get('bank_iban') as string,
    bank_account_no: formData.get('bank_account_no') as string,
  }

  const { error } = await supabase
    .from('settings')
    .upsert({ 
      user_id: user.id, 
      ...settingsData,
      updated_at: new Date().toISOString() 
    }, { 
      onConflict: 'user_id' 
    })

  if (error) {
    console.error('Error saving settings:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { message: 'Settings saved successfully' }
}
