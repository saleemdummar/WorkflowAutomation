'use client';

import React, { useState } from 'react';
import { MainNavigation } from '../../../components/MainNavigation';
import { AuthGuard } from '../../../components/AuthGuard';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminUsers, useRoles, useCreateUser, useEnableUser, useDisableUser, useAdminUserRoles, useAssignRole, useRemoveRole, useResetPassword } from '../../../hooks/queries/useAdminQuery';
import { Users, Plus, Search, Shield, ToggleLeft, ToggleRight, Key, X } from 'lucide-react';
import type { AdminUser } from '../../../types/entities';

function UsersContent() {
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');

    // Create user modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', email: '', firstName: '', lastName: '', password: '', roles: [] as string[] });
    const createUserMutation = useCreateUser();

    // Roles modal
    const [rolesModalUserId, setRolesModalUserId] = useState<string | null>(null);
    const { data: userRoles } = useAdminUserRoles(rolesModalUserId || '');

    // Reset password modal
    const [resetPwUserId, setResetPwUserId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [tempPassword, setTempPassword] = useState(true);
    const resetPasswordMutation = useResetPassword();

    // Queries
    const { data: users = [], isLoading } = useAdminUsers({ search: searchQuery || undefined, max: 100 });
    const { data: allRoles = [] } = useRoles();
    const filteredRoles = allRoles.filter((r) => typeof r === 'string' && !r.startsWith('default-roles') && r !== 'offline_access' && r !== 'uma_authorization');

    // Mutations
    const enableUserMutation = useEnableUser();
    const disableUserMutation = useDisableUser();
    const assignRoleMutation = useAssignRole();
    const removeRoleMutation = useRemoveRole();

    const handleCreateUser = async () => {
        try {
            await createUserMutation.mutateAsync(newUser);
            showToast('User created successfully', 'success');
            setShowCreateModal(false);
            setNewUser({ username: '', email: '', firstName: '', lastName: '', password: '', roles: [] });
        } catch (err: unknown) {
            console.error('Failed to create user:', err);
            showToast('Failed to create user', 'error');
        }
    };

    const handleToggleUser = async (user: AdminUser) => {
        try {
            if (user.enabled) {
                await disableUserMutation.mutateAsync(user.id);
            } else {
                await enableUserMutation.mutateAsync(user.id);
            }
            showToast(`User ${user.enabled ? 'disabled' : 'enabled'} successfully`, 'success');
        } catch (err) {
            console.error('Failed to toggle user:', err);
            showToast('Failed to update user status', 'error');
        }
    };

    const openRolesModal = async (userId: string) => {
        setRolesModalUserId(userId);
    };

    const handleAssignRole = async (role: string) => {
        if (!rolesModalUserId) return;
        try {
            await assignRoleMutation.mutateAsync({ userId: rolesModalUserId, roleName: role });
            showToast(`Role "${role}" assigned`, 'success');
        } catch {
            showToast('Failed to assign role', 'error');
        }
    };

    const handleRemoveRole = async (role: string) => {
        if (!rolesModalUserId) return;
        try {
            await removeRoleMutation.mutateAsync({ userId: rolesModalUserId, roleName: role });
            showToast(`Role "${role}" removed`, 'success');
        } catch {
            showToast('Failed to remove role', 'error');
        }
    };

    const handleResetPassword = async () => {
        if (!resetPwUserId || !newPassword) return;
        try {
            await resetPasswordMutation.mutateAsync({
                userId: resetPwUserId,
                password: newPassword,
                temporary: tempPassword
            });
            showToast('Password reset successfully', 'success');
            setResetPwUserId(null);
            setNewPassword('');
        } catch {
            showToast('Failed to reset password', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />
            <main className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-3">
                        <Users className="w-8 h-8 text-fcc-gold" />
                        <h1 className="text-3xl font-black text-white">User Management</h1>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center space-x-2 bg-fcc-gold text-fcc-charcoal font-bold px-4 py-2 rounded hover:bg-fcc-gold/90 transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create User</span>
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-fcc-midnight border border-fcc-border text-white rounded focus:outline-none focus:border-fcc-gold"
                    />
                </div>

                {/* Users table */}
                <div className="bg-fcc-midnight border border-fcc-border rounded-lg overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold mx-auto" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No users found.</div>
                    ) : (
                        <table className="w-full">
                            <thead className="border-b border-fcc-border">
                                <tr className="text-left text-sm text-gray-400">
                                    <th className="px-4 py-3">Username</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Roles</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} className="border-b border-fcc-border last:border-0 hover:bg-fcc-charcoal/50 transition">
                                        <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                                        <td className="px-4 py-3 text-gray-300">{u.firstName} {u.lastName}</td>
                                        <td className="px-4 py-3 text-gray-300">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {(u.realmRoles ?? []).filter(r => !r.startsWith('default-roles') && r !== 'offline_access' && r !== 'uma_authorization').map((role) => (
                                                    <span key={role} className="text-[10px] font-bold bg-fcc-charcoal text-fcc-gold px-2 py-0.5 rounded">
                                                        {role}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${u.enabled ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                                {u.enabled ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => openRolesModal(u.id)} title="Manage Roles" className="p-1 text-gray-400 hover:text-fcc-gold transition">
                                                    <Shield className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleToggleUser(u)} title={u.enabled ? 'Disable' : 'Enable'} className="p-1 text-gray-400 hover:text-fcc-gold transition">
                                                    {u.enabled ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-red-400" />}
                                                </button>
                                                <button onClick={() => { setResetPwUserId(u.id); setNewPassword(''); }} title="Reset Password" className="p-1 text-gray-400 hover:text-fcc-gold transition">
                                                    <Key className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ---------- Create User Modal ---------- */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-6 w-full max-w-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Create User</h2>
                                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-3">
                                <input placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="w-full px-4 py-2 bg-fcc-charcoal border border-fcc-border text-white rounded focus:outline-none focus:border-fcc-gold" />
                                <input placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-4 py-2 bg-fcc-charcoal border border-fcc-border text-white rounded focus:outline-none focus:border-fcc-gold" />
                                <div className="grid grid-cols-2 gap-3">
                                    <input placeholder="First Name" value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} className="px-4 py-2 bg-fcc-charcoal border border-fcc-border text-white rounded focus:outline-none focus:border-fcc-gold" />
                                    <input placeholder="Last Name" value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} className="px-4 py-2 bg-fcc-charcoal border border-fcc-border text-white rounded focus:outline-none focus:border-fcc-gold" />
                                </div>
                                <input type="password" placeholder="Temporary Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full px-4 py-2 bg-fcc-charcoal border border-fcc-border text-white rounded focus:outline-none focus:border-fcc-gold" />
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Roles</label>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredRoles.map((role) => (
                                            <label key={role} className="flex items-center space-x-1 text-sm text-white">
                                                <input
                                                    type="checkbox"
                                                    checked={newUser.roles.includes(role)}
                                                    onChange={(e) => {
                                                        setNewUser({
                                                            ...newUser,
                                                            roles: e.target.checked
                                                                ? [...newUser.roles, role]
                                                                : newUser.roles.filter((r) => r !== role),
                                                        });
                                                    }}
                                                    className="accent-fcc-gold"
                                                />
                                                <span>{role}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition">Cancel</button>
                                <button onClick={handleCreateUser} disabled={createUserMutation.isPending || !newUser.username || !newUser.email || !newUser.password} className="px-6 py-2 bg-fcc-gold text-fcc-charcoal font-bold rounded hover:bg-fcc-gold/90 transition disabled:opacity-50">
                                    {createUserMutation.isPending ? 'Creating…' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------- Roles Modal ---------- */}
                {rolesModalUserId && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-6 w-full max-w-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Manage Roles</h2>
                                <button onClick={() => setRolesModalUserId(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-2">
                                {filteredRoles.map((role) => {
                                    const has = userRoles?.includes(role) || false;
                                    return (
                                        <div key={role} className="flex items-center justify-between bg-fcc-charcoal border border-fcc-border rounded px-3 py-2">
                                            <span className="text-white text-sm font-medium">{role}</span>
                                            <button
                                                onClick={() => has ? handleRemoveRole(role) : handleAssignRole(role)}
                                                className={`text-xs font-bold px-3 py-1 rounded transition ${has ? 'bg-red-600/20 text-red-400 hover:bg-red-600/40' : 'bg-green-600/20 text-green-400 hover:bg-green-600/40'}`}
                                            >
                                                {has ? 'Remove' : 'Assign'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------- Reset Password Modal ---------- */}
                {resetPwUserId && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-6 w-full max-w-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Reset Password</h2>
                                <button onClick={() => setResetPwUserId(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-3">
                                <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 bg-fcc-charcoal border border-fcc-border text-white rounded focus:outline-none focus:border-fcc-gold" />
                                <label className="flex items-center space-x-2 text-sm text-white">
                                    <input type="checkbox" checked={tempPassword} onChange={(e) => setTempPassword(e.target.checked)} className="accent-fcc-gold" />
                                    <span>Temporary (user must change on next login)</span>
                                </label>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button onClick={() => setResetPwUserId(null)} className="px-4 py-2 text-gray-400 hover:text-white transition">Cancel</button>
                                <button onClick={handleResetPassword} disabled={resetPasswordMutation.isPending || !newPassword} className="px-6 py-2 bg-fcc-gold text-fcc-charcoal font-bold rounded hover:bg-fcc-gold/90 transition disabled:opacity-50">
                                    {resetPasswordMutation.isPending ? 'Resetting…' : 'Reset'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function AdminUsersPage() {
    return (
        <AuthGuard requiredRoles={['super-admin']}>
            <UsersContent />
        </AuthGuard>
    );
}
