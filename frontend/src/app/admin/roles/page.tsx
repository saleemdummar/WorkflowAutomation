'use client';

import React, { useEffect, useState } from 'react';
import { MainNavigation } from '../../../components/MainNavigation';
import { AuthGuard } from '../../../components/AuthGuard';
import { rolesAdminApi } from '../../../lib/api';
import { Shield } from 'lucide-react';

function RolesContent() {
    const [roles, setRoles] = useState<Array<{ name: string; description?: string }>>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const data = await rolesAdminApi.getAll();
                const filtered = (Array.isArray(data) ? data : [])
                    .map((r: any) => ({ name: String(r?.name ?? ''), description: r?.description }))
                    .filter((r) => r.name && !r.name.startsWith('default-roles') && r.name !== 'offline_access' && r.name !== 'uma_authorization');
                setRoles(filtered);
            } catch (err) {
                console.error('Failed to fetch roles:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRoles();
    }, []);

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />
            <main className="mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center space-x-3 mb-8">
                    <Shield className="w-8 h-8 text-fcc-gold" />
                    <h1 className="text-3xl font-black text-white">Realm Roles</h1>
                </div>
                <p className="text-gray-400 mb-6">
                    These are the application roles managed by Better Auth. Roles are assigned to users via the{' '}
                    <a
                        href="/admin/users"
                        className="text-fcc-gold hover:underline"
                    >
                        User Management
                    </a>{' '}page.
                </p>

                <div className="bg-fcc-midnight border border-fcc-border rounded-lg overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold mx-auto" />
                        </div>
                    ) : roles.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No roles found.</div>
                    ) : (
                        <table className="w-full">
                            <thead className="border-b border-fcc-border">
                                <tr className="text-left text-sm text-gray-400">
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.map((role) => (
                                    <tr key={role.name} className="border-b border-fcc-border last:border-0 hover:bg-fcc-charcoal/50 transition">
                                        <td className="px-4 py-3">
                                            <span className="inline-block bg-fcc-charcoal text-fcc-gold font-bold text-sm px-3 py-1 rounded">
                                                {role.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">
                                            {role.description || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function AdminRolesPage() {
    return (
        <AuthGuard requiredRoles={['super-admin']}>
            <RolesContent />
        </AuthGuard>
    );
}
