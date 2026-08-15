'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listTeamMembers,
  createStaffMember,
  updateStaffPermissions,
  deleteStaffMember,
} from '@/app/actions/users';
import {
  UserProfile,
  PermissionsMap,
  UserRole,
  ModuleKey,
  DEFAULT_STAFF_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
} from '@/lib/auth-permissions';

const MODULES: { key: ModuleKey; label: string; description: string }[] = [
  { key: 'uae_visa', label: 'UAE Visa Tracker', description: 'Visas, extensions, bus/inside changes' },
  { key: 'air_tickets', label: 'Air Tickets', description: 'Flight bookings, PNRs, airline tickets' },
  { key: 'tour_packages', label: 'Tour Packages', description: 'Holiday tours, safari, fujairah, etc.' },
  { key: 'other_visa', label: 'Other Country Visas', description: 'Schengen, Japan, UK, China, etc.' },
  { key: 'customers', label: 'Customer Directory', description: 'Customer profiles and service histories' },
  { key: 'invoices', label: 'Invoices & Billing', description: 'Invoice creation and financial receipts' },
  { key: 'suppliers', label: 'Suppliers Directory', description: 'Supplier accounts and default pricing' },
  { key: 'migration', label: 'Data Migration', description: 'CSV import and bulk dataset migration' },
  { key: 'settings', label: 'System Settings', description: 'Company details and team user permissions' },
];

export default function UserManagement({ currentUserProfile }: { currentUserProfile?: UserProfile | null }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [permissions, setPermissions] = useState<PermissionsMap>(DEFAULT_STAFF_PERMISSIONS);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = currentUserProfile?.role === 'admin';

  const loadUsers = async () => {
    setLoading(true);
    const res = await listTeamMembers();
    if (res.success && res.data) {
      setUsers(res.data);
    } else {
      toast.error(res.error || 'Failed to load team members');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('staff');
    setPermissions(JSON.parse(JSON.stringify(DEFAULT_STAFF_PERMISSIONS)));
    setModalOpen(true);
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setFullName(user.fullName || '');
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setPermissions(JSON.parse(JSON.stringify(user.permissions || DEFAULT_STAFF_PERMISSIONS)));
    setModalOpen(true);
  };

  const handleTogglePermission = (modKey: ModuleKey, action: 'read' | 'create' | 'edit' | 'delete') => {
    setPermissions(prev => {
      const current = prev[modKey] || { read: false, create: false, edit: false, delete: false };
      const nextVal = !current[action];

      // If granting create/edit/delete, ensure read is also true
      const updatedMod = { ...current, [action]: nextVal };
      if (nextVal && (action === 'create' || action === 'edit' || action === 'delete')) {
        updatedMod.read = true;
      }
      // If revoking read, also revoke create/edit/delete
      if (!nextVal && action === 'read') {
        updatedMod.create = false;
        updatedMod.edit = false;
        updatedMod.delete = false;
      }

      return {
        ...prev,
        [modKey]: updatedMod,
      };
    });
  };

  const handlePreset = (type: 'all' | 'read_only' | 'none') => {
    const updated: any = {};
    MODULES.forEach(m => {
      if (type === 'all') {
        updated[m.key] = { read: true, create: true, edit: true, delete: true };
      } else if (type === 'read_only') {
        updated[m.key] = { read: true, create: false, edit: false, delete: false };
      } else {
        updated[m.key] = { read: false, create: false, edit: false, delete: false };
      }
    });
    setPermissions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update user
        const res = await updateStaffPermissions({
          userId: editingUser.id,
          fullName,
          role,
          permissions: role === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : permissions,
        });

        if (res.success) {
          toast.success(`Updated permissions for ${editingUser.email}`);
          setModalOpen(false);
          loadUsers();
        } else {
          toast.error(res.error || 'Failed to update user');
        }
      } else {
        // Create user
        const res = await createStaffMember({
          email,
          password,
          fullName,
          role,
          permissions: role === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : permissions,
        });

        if (res.success) {
          toast.success(`Created account for ${email}`);
          setModalOpen(false);
          loadUsers();
        } else {
          toast.error(res.error || 'Failed to create user');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to permanently delete the account for "${userEmail}"?`)) {
      return;
    }

    const res = await deleteStaffMember(userId);
    if (res.success) {
      toast.success(`Deleted user ${userEmail}`);
      loadUsers();
    } else {
      toast.error(res.error || 'Failed to delete user');
    }
  };

  if (!isAdmin) {
    return (
      <div className="card-anthropic p-6 rounded-xl space-y-3">
        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
          <Lock className="w-5 h-5 text-[#D97757]" />
          <h3 className="text-base font-semibold">User Management Access</h3>
        </div>
        <p className="text-sm opacity-60">
          Only administrators can create staff accounts and configure permission matrices.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--card-border)] pb-4">
        <div>
          <h3 className="text-lg font-serif font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D97757]" />
            Team Members & Granular Access Control
          </h3>
          <p className="text-xs opacity-60 mt-1">
            Create staff users and select exact permissions (Read, Add, Edit, Delete) for each service.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D97757] hover:opacity-90 text-[#F5F4EF] px-3.5 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      {loading ? (
        <div className="flex h-36 items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#D97757]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--background)] shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] font-mono uppercase tracking-wider text-[10px] opacity-70">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Active Permissions Overview</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {users.map(u => {
                const isCurrent = u.id === currentUserProfile?.id;
                const isUserAdmin = u.role === 'admin';

                const accessibleModules = isUserAdmin
                  ? MODULES.map(m => m.label)
                  : MODULES.filter(m => u.permissions?.[m.key]?.read).map(m => m.label);

                return (
                  <tr key={u.id} className="hover:bg-[var(--sidebar-bg)]/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-[var(--foreground)]">{u.fullName || 'No Name'}</div>
                      <div className="text-[11px] opacity-60 font-mono">{u.email}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                          isUserAdmin
                            ? 'bg-[#D97757]/15 text-[#D97757]'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {isUserAdmin ? <Shield className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      {isUserAdmin ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Full Access (All Modules & Actions)
                        </span>
                      ) : accessibleModules.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {accessibleModules.slice(0, 4).map(mod => (
                            <span key={mod} className="px-1.5 py-0.5 rounded bg-[var(--sidebar-bg)] border border-[var(--card-border)] text-[10px]">
                              {mod}
                            </span>
                          ))}
                          {accessibleModules.length > 4 && (
                            <span className="text-[10px] opacity-60 self-center">
                              +{accessibleModules.length - 4} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">No Services Assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg border border-[var(--card-border)] hover:bg-[var(--sidebar-bg)] transition-colors cursor-pointer"
                        title="Edit Permissions"
                      >
                        <Edit2 className="w-3.5 h-3.5 opacity-70" />
                      </button>
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id, u.email)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Permission Configuration Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--background)] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--card-border)] px-6 py-4 bg-[var(--sidebar-bg)]">
              <div>
                <h3 className="font-serif font-semibold text-base text-[var(--foreground)]">
                  {editingUser ? `Edit Permissions: ${editingUser.email}` : 'Add New Team Member'}
                </h3>
                <p className="text-xs opacity-60">
                  Configure account details and granular module capabilities.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--card-border)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 opacity-60" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-semibold tracking-wider opacity-70 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-semibold tracking-wider opacity-70 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="sarah@nextstep.ae"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] outline-hidden disabled:opacity-50"
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-[11px] uppercase font-semibold tracking-wider opacity-70 mb-1.5">
                      Initial Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] uppercase font-semibold tracking-wider opacity-70 mb-1.5">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] outline-hidden"
                  >
                    <option value="staff">Staff (Granular Permissions)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>
              </div>

              {/* Granular Permission Matrix */}
              {role === 'staff' && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs uppercase font-bold tracking-wider text-[var(--foreground)]">
                        Service Permissions Matrix
                      </h4>
                      <p className="text-[11px] opacity-60">
                        Check allowed actions per module. Read is required to view a service.
                      </p>
                    </div>
                    <div className="flex gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handlePreset('all')}
                        className="px-2 py-1 rounded border border-[var(--card-border)] hover:bg-[var(--sidebar-bg)] transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePreset('read_only')}
                        className="px-2 py-1 rounded border border-[var(--card-border)] hover:bg-[var(--sidebar-bg)] transition-colors cursor-pointer"
                      >
                        Read Only
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePreset('none')}
                        className="px-2 py-1 rounded border border-[var(--card-border)] hover:bg-[var(--sidebar-bg)] transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--card-border)] overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--sidebar-bg)] border-b border-[var(--card-border)] text-[10px] uppercase font-mono opacity-70">
                        <tr>
                          <th className="px-3.5 py-2.5">Service Module</th>
                          <th className="px-2 py-2.5 text-center">Read</th>
                          <th className="px-2 py-2.5 text-center">Add / Create</th>
                          <th className="px-2 py-2.5 text-center">Edit</th>
                          <th className="px-2 py-2.5 text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--card-border)]">
                        {MODULES.map(m => {
                          const perm = permissions[m.key] || { read: false, create: false, edit: false, delete: false };

                          return (
                            <tr key={m.key} className="hover:bg-[var(--sidebar-bg)]/40 transition-colors">
                              <td className="px-3.5 py-2.5">
                                <div className="font-medium text-[var(--foreground)]">{m.label}</div>
                                <div className="text-[10px] opacity-50">{m.description}</div>
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.read}
                                  onChange={() => handleTogglePermission(m.key, 'read')}
                                  className="rounded text-[#D97757] focus:ring-[#D97757] h-4 w-4 cursor-pointer"
                                />
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.create}
                                  onChange={() => handleTogglePermission(m.key, 'create')}
                                  className="rounded text-[#D97757] focus:ring-[#D97757] h-4 w-4 cursor-pointer"
                                />
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.edit}
                                  onChange={() => handleTogglePermission(m.key, 'edit')}
                                  className="rounded text-[#D97757] focus:ring-[#D97757] h-4 w-4 cursor-pointer"
                                />
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.delete}
                                  onChange={() => handleTogglePermission(m.key, 'delete')}
                                  className="rounded text-[#D97757] focus:ring-[#D97757] h-4 w-4 cursor-pointer"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--card-border)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-xs font-semibold hover:bg-[var(--sidebar-bg)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#D97757] hover:opacity-90 text-[#F5F4EF] text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Permissions'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
