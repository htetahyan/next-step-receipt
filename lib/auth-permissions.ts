// lib/auth-permissions.ts
// Pure client & server types and helper utilities for RBAC

import { dashboardServiceGroup } from '@/lib/service-constants';

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
  uae_visa: { read: true, create: true, edit: true, delete: false },
  air_tickets: { read: true, create: true, edit: true, delete: false },
  other_visa: { read: true, create: true, edit: true, delete: false },
  tour_packages: { read: true, create: true, edit: true, delete: false },
  custom_service: { read: true, create: true, edit: true, delete: false },
  customers: { read: true, create: true, edit: true, delete: false },
  invoices: { read: true, create: false, edit: false, delete: false },
  suppliers: { read: true, create: false, edit: false, delete: false },
  settings: { read: false, create: false, edit: false, delete: false },
  migration: { read: false, create: false, edit: false, delete: false },
};

const STAFF_EDIT_WITH_CREATE: ModuleKey[] = [
  'uae_visa',
  'air_tickets',
  'other_visa',
  'tour_packages',
  'custom_service',
  'customers',
];

/** Merge stored staff permissions with defaults. Staff who can create a module can also edit it. Delete is never auto-granted. */
export function resolveStaffPermissions(stored?: PermissionsMap | null): PermissionsMap {
  const merged: PermissionsMap = { ...DEFAULT_STAFF_PERMISSIONS };
  if (stored) {
    (Object.keys(DEFAULT_STAFF_PERMISSIONS) as ModuleKey[]).forEach((key) => {
      if (stored[key]) {
        merged[key] = { ...DEFAULT_STAFF_PERMISSIONS[key], ...stored[key] };
      }
    });
  }
  STAFF_EDIT_WITH_CREATE.forEach((key) => {
    if (merged[key]?.create) {
      merged[key] = { ...merged[key], edit: true };
    }
  });
  // Data migration and settings stay admin-only even if a stored staff profile grants them.
  merged.settings = { read: false, create: false, edit: false, delete: false };
  merged.migration = { read: false, create: false, edit: false, delete: false };
  return merged;
}

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
export function mapCategoryToModule(category?: string | null, referenceId?: string | null): ModuleKey {
  switch (dashboardServiceGroup(category, referenceId)) {
    case 'Air Tickets':
      return 'air_tickets';
    case 'Tour Packages':
      return 'tour_packages';
    case 'Other Visas':
      return 'other_visa';
    case 'UAE Visa':
      return 'uae_visa';
    default:
      return 'custom_service';
  }
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
