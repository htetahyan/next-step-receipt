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

async function verifyTurnstile(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return { ok: false, error: 'Login security check is not configured.' }
  }
  if (!token) {
    return { ok: false, error: 'Complete the security check, then sign in.' }
  }

  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })
  const data = await result.json().catch(() => null)
  if (!data?.success) {
    return { ok: false, error: 'Security check failed. Refresh the page and try again.' }
  }
  return { ok: true as const }
}

export async function login(prevState: AuthState, formData: FormData) {
  const turnstile = await verifyTurnstile(String(formData.get('cf-turnstile-response') || ''))
  if (!turnstile.ok) {
    return { error: turnstile.error }
  }

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
