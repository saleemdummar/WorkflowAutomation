'use client';

import React, { useState } from 'react';
import { AuthGuard } from '../../../../components/AuthGuard';
import { ChevronLeft, Plus, Trash2, Shield, Users, User } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useConfirmDialog } from '../../../../hooks/useConfirmDialog';
import type { FormPermission } from '../../../../types/entities';
import { useFormPermissions, useUserSearch, useAddFormPermission, useUpdateFormPermission, useRemoveFormPermission } from '../../../../hooks/queries';

const permissionLevels = ['View', 'Submit', 'Edit', 'Admin'];
const availableRoles = ['super-admin', 'admin', 'form-designer', 'workflow-designer', 'approver', 'submitter'];

function FormPermissionsPage() {
    const params = useParams();
    const formId = params.id as string;
    const [confirmAction, ConfirmDialog] = useConfirmDialog();
    const [showAddModal, setShowAddModal] = useState(false);
    const [addType, setAddType] = useState<'user' | 'role'>('role');
    const [newUserId, setNewUserId] = useState('');
    const [newRoleName, setNewRoleName] = useState('');
    const [newPermLevel, setNewPermLevel] = useState('View');
    const [userSearch, setUserSearch] = useState('');

    // TanStack Query hooks
    const { data: permissions = [], isLoading: loading } = useFormPermissions(formId);
    const { data: searchResults = [] } = useUserSearch(userSearch);
    const addPermissionMutation = useAddFormPermission();
    const updatePermissionMutation = useUpdateFormPermission();
    const removePermissionMutation = useRemoveFormPermission();

    const handleSearchUsers = (query: string) => {
        setUserSearch(query);
    };

    const handleAddPermission = async () => {
        try {
            await addPermissionMutation.mutateAsync({
                formId,
                data: {
                    userId: addType === 'user' ? newUserId : undefined,
                    roleName: addType === 'role' ? newRoleName : undefined,
                    permissionLevel: newPermLevel,
                },
            });
            setShowAddModal(false);
            setNewUserId('');
            setNewRoleName('');
            setNewPermLevel('View');
            setUserSearch('');
        } catch (err) {
            console.error('Failed to add permission:', err);
        }
    };

    const handleRemovePermission = async (permissionId: string) => {
        if (!(await confirmAction({ message: 'Are you sure you want to remove this permission?' }))) return;
        try {
            await removePermissionMutation.mutateAsync({ formId, permissionId });
        } catch (err) {
            console.error('Failed to remove permission:', err);
        }
    };

    const handleUpdateLevel = async (permissionId: string, level: string) => {
        try {
            await updatePermissionMutation.mutateAsync({
                formId,
                permissionId,
                data: { permissionLevel: level },
            });
        } catch (err) {
            console.error('Failed to update permission:', err);
        }
    };

    return (
        <div className="min-h-screen bg-fcc-charcoal text-white">
            <header className="bg-fcc-midnight border-b border-fcc-border px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/forms/edit/${formId}`} className="p-2 hover:bg-fcc-charcoal rounded border border-transparent hover:border-fcc-border">
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter">Form Permissions</h1>
                            <p className="text-sm text-gray-400">Manage who can access this form</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold rounded hover:bg-yellow-400"
                    >
                        <Plus size={16} /> Add Permission
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 space-y-6">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold mx-auto" />
                    </div>
                ) : permissions.length === 0 ? (
                    <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-12 text-center">
                        <Shield size={48} className="mx-auto mb-4 text-gray-500" />
                        <p className="text-gray-400">No custom permissions configured.</p>
                        <p className="text-sm text-gray-500 mt-1">Default role-based access applies.</p>
                    </div>
                ) : (
                    <div className="bg-fcc-midnight border border-fcc-border rounded-lg divide-y divide-fcc-border">
                        {permissions.map((perm) => (
                            <div key={perm.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {perm.userId ? (
                                        <div className="p-2 bg-blue-500/20 rounded"><User size={16} className="text-blue-400" /></div>
                                    ) : (
                                        <div className="p-2 bg-purple-500/20 rounded"><Users size={16} className="text-purple-400" /></div>
                                    )}
                                    <div>
                                        <p className="text-white font-medium">
                                            {perm.userName || perm.roleName || perm.userId || 'Unknown'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {perm.userId ? 'User' : 'Role'}{perm.grantedAt ? ` • Granted ${new Date(perm.grantedAt).toLocaleDateString()}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={perm.permissionLevel}
                                        onChange={(e) => handleUpdateLevel(perm.id, e.target.value)}
                                        className="bg-fcc-charcoal border border-fcc-border text-white text-sm rounded px-3 py-1 focus:border-fcc-gold outline-none"
                                    >
                                        {permissionLevels.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <button
                                        onClick={() => handleRemovePermission(perm.id)}
                                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Permission Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Add Permission</h3>

                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setAddType('role')}
                                className={`flex-1 py-2 rounded text-sm font-bold ${addType === 'role' ? 'bg-fcc-gold text-fcc-charcoal' : 'bg-fcc-charcoal text-white border border-fcc-border'}`}
                            >
                                By Role
                            </button>
                            <button
                                onClick={() => setAddType('user')}
                                className={`flex-1 py-2 rounded text-sm font-bold ${addType === 'user' ? 'bg-fcc-gold text-fcc-charcoal' : 'bg-fcc-charcoal text-white border border-fcc-border'}`}
                            >
                                By User
                            </button>
                        </div>

                        {addType === 'role' ? (
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-white uppercase mb-2">Role</label>
                                <select
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white rounded focus:border-fcc-gold outline-none"
                                >
                                    <option value="">Select a role...</option>
                                    {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-white uppercase mb-2">Search User</label>
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={(e) => handleSearchUsers(e.target.value)}
                                    placeholder="Type to search users..."
                                    className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white rounded focus:border-fcc-gold outline-none"
                                />
                                {searchResults.length > 0 && (
                                    <div className="mt-1 bg-fcc-charcoal border border-fcc-border rounded max-h-32 overflow-y-auto">
                                        {searchResults.map(u => (
                                            <button
                                                key={u.id}
                                                onClick={() => { setNewUserId(u.id); setUserSearch(u.displayName); }}
                                                className="w-full text-left px-3 py-2 hover:bg-fcc-midnight text-sm text-white"
                                            >
                                                {u.displayName} <span className="text-gray-400">({u.email})</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-white uppercase mb-2">Permission Level</label>
                            <select
                                value={newPermLevel}
                                onChange={(e) => setNewPermLevel(e.target.value)}
                                className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white rounded focus:border-fcc-gold outline-none"
                            >
                                {permissionLevels.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-sm font-bold border border-white text-white hover:bg-white hover:text-fcc-charcoal rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPermission}
                                disabled={addType === 'role' ? !newRoleName : !newUserId}
                                className="px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
                            >
                                Add Permission
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialog />
        </div>
    );
}

export default function FormPermissionsPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'form-designer']}>
            <FormPermissionsPage />
        </AuthGuard>
    );
}
