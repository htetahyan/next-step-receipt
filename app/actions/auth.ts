'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { getSiteUrl } from '@/lib/site-url'
import { requireAdmin } from '@/app/actions/users'

export type AuthState = {
  error?: string;
  message?: string;
} | undefined;

export async function login(prevState: AuthState, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}

export async function signup(prevState: AuthState, formData: FormData) {
  try {
    await requireAdmin()
  } catch {
    return { error: 'Only an administrator can create accounts.' }
  }

  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const siteUrl = getSiteUrl();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { message: 'Check your email to confirm your account' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
