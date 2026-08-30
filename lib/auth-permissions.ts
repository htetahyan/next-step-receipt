// lib/auth-permissions.ts
// Pure client & server types and helper utilities for RBAC

export type ModuleKey =
  | 'uae_visa'
  | 'air_tickets'
  | 'other_visa'
  | 'tour_packages'
  | 'custom_service'
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
  custom_service: { read: true, create: true, edit: true, delete: true },
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
  custom_service: { read: true, create: true, edit: false, delete: false },
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

  if (cat.includes('tour') || cat.includes('safari') || cat.includes('package') || cat.includes('hotel')) return 'tour_packages';
  if (cat.includes('ticket') || cat.includes('flight') || cat.includes('way') || cat.includes('trip') || cat.includes('airline')) return 'air_tickets';
  if (
    cat.includes('schengen') ||
    cat.includes('japan') ||
    cat.includes('china') ||
    cat.includes('korea') ||
    cat.includes('uk') ||
    cat.includes('armenia') ||
    cat.includes('other country')
  ) {
    return 'other_visa';
  }

  // UAE visa keywords
  if (
    cat.includes('uae') ||
    cat.includes('visit visa') ||
    cat.includes('transit') ||
    cat.includes('multi entry') ||
    cat.includes('visa change') ||
    cat.includes('inside') ||
    cat.includes('a2a') ||
    cat.includes('bus') ||
    cat.includes('extension') ||
    cat.includes('oman')
  ) {
    return 'uae_visa';
  }

  // Custom service: categories that don't match any predefined module
  // e.g. Dummy Flight, Passport Renew, Document Attestation, Medical Insurance, etc.
  return 'custom_service';
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
