// lib/auth-permissions.ts
// Pure client & server types and helper utilities for RBAC

export type ModuleKey =
  | 'uae_visa'
  | 'air_tickets'
  | 'other_visa'
  | 'tour_packages'
  | 'customers'
  | 'invoices'
  | 'suppliers'
  | 'settings'
  | 'migration';

export type PermissionAction = 'read' | 'create' | 'edit' | 'delete';

export type ModulePermission = {
  read: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type UserRole = 'admin' | 'staff';

export type PermissionsMap = Record<ModuleKey, ModulePermission>;

export const DEFAULT_ADMIN_PERMISSIONS: PermissionsMap = {
  uae_visa: { read: true, create: true, edit: true, delete: true },
  air_tickets: { read: true, create: true, edit: true, delete: true },
  other_visa: { read: true, create: true, edit: true, delete: true },
  tour_packages: { read: true, create: true, edit: true, delete: true },
  customers: { read: true, create: true, edit: true, delete: true },
  invoices: { read: true, create: true, edit: true, delete: true },
  suppliers: { read: true, create: true, edit: true, delete: true },
  settings: { read: true, create: true, edit: true, delete: true },
  migration: { read: true, create: true, edit: true, delete: true },
};

export const DEFAULT_STAFF_PERMISSIONS: PermissionsMap = {
  uae_visa: { read: true, create: true, edit: false, delete: false },
  air_tickets: { read: true, create: true, edit: false, delete: false },
  other_visa: { read: true, create: true, edit: false, delete: false },
  tour_packages: { read: true, create: true, edit: false, delete: false },
  customers: { read: true, create: true, edit: false, delete: false },
  invoices: { read: true, create: false, edit: false, delete: false },
  suppliers: { read: true, create: false, edit: false, delete: false },
  settings: { read: false, create: false, edit: false, delete: false },
  migration: { read: false, create: false, edit: false, delete: false },
};

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  permissions: PermissionsMap;
}

/**
 * Map service category strings to standard ModuleKey
 */
export function mapCategoryToModule(category?: string | null): ModuleKey {
  if (!category) return 'uae_visa';
  const cat = category.toLowerCase().trim();

  if (cat.includes('tour')) return 'tour_packages';
  if (cat.includes('ticket') || cat.includes('flight') || cat.includes('way') || cat.includes('trip')) return 'air_tickets';
  if (
    cat.includes('schengen') ||
    cat.includes('japan') ||
    cat.includes('china') ||
    cat.includes('korea') ||
    cat.includes('uk') ||
    cat.includes('armenia') ||
    cat.includes('other')
  ) {
    return 'other_visa';
  }

  return 'uae_visa';
}

/**
 * Check if the user profile has permission for a specific module and action
 */
export function checkPermission(
  profile: UserProfile | null | undefined,
  moduleKey: ModuleKey,
  action: PermissionAction
): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;

  const modPerms = profile.permissions?.[moduleKey];
  if (!modPerms) return false;

  return !!modPerms[action];
}
