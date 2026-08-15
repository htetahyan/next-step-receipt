'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import {
  UserProfile,
  PermissionsMap,
  UserRole,
  ModuleKey,
  PermissionAction,
  checkPermission,
  DEFAULT_STAFF_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
} from '@/lib/auth-permissions';
import { getSiteUrl } from '@/lib/site-url';

/**
 * Get current authenticated user and their RBAC profile (Server Action).
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) return null;

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, permissions')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      const role = (profile.role as UserRole) || 'staff';
      const permissions = role === 'admin'
        ? DEFAULT_ADMIN_PERMISSIONS
        : { ...DEFAULT_STAFF_PERMISSIONS, ...(profile.permissions as PermissionsMap || {}) };

      return {
        id: user.id,
        email: user.email || profile.email,
        fullName: profile.full_name || user.user_metadata?.full_name || null,
        role,
        permissions,
      };
    }

    // Auto-fallback as admin for the initial user
    return {
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || null,
      role: 'admin',
      permissions: DEFAULT_ADMIN_PERMISSIONS,
    };
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return {
      id: user.id,
      email: user.email || '',
      fullName: null,
      role: 'admin',
      permissions: DEFAULT_ADMIN_PERMISSIONS,
    };
  }
}

/**
 * Verify permission or throw an Unauthorized error
 */
export async function requirePermission(
  moduleKey: ModuleKey,
  action: PermissionAction
): Promise<UserProfile> {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error('Unauthorized: Authentication required.');
  }

  if (!checkPermission(profile, moduleKey, action)) {
    throw new Error(`Forbidden: You do not have permission to ${action} in ${moduleKey.replace('_', ' ')}.`);
  }

  return profile;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createAdminSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * List all users and their assigned roles/permissions (Admin only)
 */
export async function listTeamMembers(): Promise<{ success: boolean; data?: UserProfile[]; error?: string }> {
  try {
    await requirePermission('settings', 'read');
    const supabase = await createClient();

    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, permissions, created_at')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    const formatted: UserProfile[] = (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      role: (p.role as UserRole) || 'staff',
      permissions: p.role === 'admin'
        ? DEFAULT_ADMIN_PERMISSIONS
        : { ...DEFAULT_STAFF_PERMISSIONS, ...(p.permissions || {}) },
    }));

    return { success: true, data: formatted };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

import postgres from 'postgres';

/**
 * Create a new staff or admin user with specific permissions (Admin only)
 */
export async function createStaffMember(payload: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  permissions: PermissionsMap;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    await requirePermission('settings', 'create');

    const email = payload.email.trim().toLowerCase();
    const password = payload.password.trim();
    const fullName = payload.fullName.trim();
    const role = payload.role;
    const permissions = role === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : payload.permissions;

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let userId: string | null = null;

    if (serviceRoleKey) {
      // 1a. Try Admin API if service role key is configured
      const adminSupabase = getAdminClient();
      const { data: authUser, error: createAuthErr } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (!createAuthErr && authUser?.user) {
        userId = authUser.user.id;
      }
    }

    // 1b. Fallback: Isolated signUp client (does not affect current admin session)
    if (!userId) {
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const isolatedClient = createAdminSupabaseClient(url, anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const siteUrl = getSiteUrl();

      const { data: signUpData, error: signUpErr } = await isolatedClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (signUpErr) {
        throw new Error(signUpErr.message);
      }

      if (signUpData?.user) {
        userId = signUpData.user.id;
      }
    }

    // 1c. If user ID still needs resolution (e.g. from existing auth.users) or to auto-confirm
    if (process.env.DATABASE_URL) {
      const sql = postgres(process.env.DATABASE_URL, { prepare: false });
      try {
        if (!userId) {
          const rows = await sql`SELECT id FROM auth.users WHERE lower(email) = ${email} LIMIT 1`;
          if (rows.length > 0) {
            userId = rows[0].id;
          }
        }

        if (userId) {
          // Auto-confirm user so they can log in immediately without confirmation email delay
          await sql`
            UPDATE auth.users
            SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
                confirmed_at = COALESCE(confirmed_at, NOW()),
                raw_user_meta_data = jsonb_set(
                  COALESCE(raw_user_meta_data, '{}'::jsonb),
                  '{full_name}',
                  ${JSON.stringify(fullName)}::jsonb
                )
            WHERE id = ${userId}
          `;
        }
      } catch (dbErr) {
        console.error('Database auto-confirm error:', dbErr);
      } finally {
        await sql.end();
      }
    }

    if (!userId) {
      throw new Error('Failed to create or resolve authentication user.');
    }

    // 2. Insert or update user_profiles table
    const supabase = await createClient();
    const { error: profileErr } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role,
        permissions,
        updated_at: new Date().toISOString(),
      });

    if (profileErr) {
      // Direct SQL fallback if RLS or client issues
      if (process.env.DATABASE_URL) {
        const sql = postgres(process.env.DATABASE_URL, { prepare: false });
        try {
          await sql`
            INSERT INTO public.user_profiles (id, email, full_name, role, permissions, updated_at)
            VALUES (${userId}, ${email}, ${fullName}, ${role}, ${sql.json(permissions)}, NOW())
            ON CONFLICT (id) DO UPDATE
            SET email = ${email},
                full_name = ${fullName},
                role = ${role},
                permissions = ${sql.json(permissions)},
                updated_at = NOW()
          `;
        } finally {
          await sql.end();
        }
      } else {
        throw new Error(profileErr.message);
      }
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/users');
    return { success: true, data: { id: userId, email } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update staff role and module permissions (Admin only)
 */
export async function updateStaffPermissions(payload: {
  userId: string;
  fullName?: string;
  role: UserRole;
  permissions: PermissionsMap;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const currentAdmin = await requirePermission('settings', 'edit');

    const role = payload.role;
    const permissions = role === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : payload.permissions;

    // Safety: prevent demoting own account if current user
    if (payload.userId === currentAdmin.id && role !== 'admin') {
      throw new Error('You cannot remove your own admin privileges.');
    }

    const supabase = await createClient();

    const updatePayload: any = {
      role,
      permissions,
      updated_at: new Date().toISOString(),
    };

    if (payload.fullName !== undefined) {
      updatePayload.full_name = payload.fullName.trim();
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', payload.userId);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/users');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete or remove a staff user account (Admin only)
 */
export async function deleteStaffMember(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentAdmin = await requirePermission('settings', 'delete');

    if (userId === currentAdmin.id) {
      throw new Error('You cannot delete your own account.');
    }

    // 1. Delete from public.user_profiles
    const supabase = await createClient();
    await supabase.from('user_profiles').delete().eq('id', userId);

    // 2. Delete from auth.users via database or Admin API
    if (process.env.DATABASE_URL) {
      const sql = postgres(process.env.DATABASE_URL, { prepare: false });
      try {
        await sql`DELETE FROM public.user_profiles WHERE id = ${userId}`;
        await sql`DELETE FROM auth.users WHERE id = ${userId}`;
      } catch (e) {
        console.error('Direct SQL delete error:', e);
      } finally {
        await sql.end();
      }
    } else {
      const adminSupabase = getAdminClient();
      await adminSupabase.auth.admin.deleteUser(userId);
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/users');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
