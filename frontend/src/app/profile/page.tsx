'use client';

import React, { useEffect, useState } from 'react';
import { MainNavigation } from '../../components/MainNavigation';
import { AuthGuard } from '../../components/AuthGuard';
import { useAuth } from '../../contexts/AuthContext';
import { userProfileApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

function ProfileContent() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [department, setDepartment] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await userProfileApi.getMe();
                setDepartment(profile.department || '');
                setJobTitle(profile.jobTitle || '');
            } catch (err) {
                console.error('Failed to load profile:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await userProfileApi.updateMe({ department, jobTitle });
            showToast('Profile updated successfully', 'success');
        } catch (err) {
            console.error('Failed to update profile:', err);
            showToast('Failed to update profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />
            <main className="mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-black text-white mb-8">My Profile</h1>

                {/* Identity info (read-only from Better Auth) */}
                <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-6 mb-8">
                    <h2 className="text-lg font-bold text-white mb-4">Identity</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Name</label>
                            <p className="text-white font-medium">{user?.displayName || '—'}</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Username</label>
                            <p className="text-white font-medium">{user?.username || '—'}</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Email</label>
                            <p className="text-white font-medium">{user?.email || '—'}</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Roles</label>
                            <div className="flex flex-wrap gap-1">
                                {(user?.roles ?? []).filter(r => !r.startsWith('default-roles') && r !== 'offline_access' && r !== 'uma_authorization').map((role) => (
                                    <span key={role} className="inline-block bg-fcc-charcoal text-fcc-gold text-xs font-bold px-2 py-0.5 rounded">
                                        {role}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                        Name and email are managed by your account settings.
                    </p>
                </div>

                {/* Editable business data */}
                <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-6">
                    <h2 className="text-lg font-bold text-white mb-4">Business Details</h2>
                    {isLoading ? (
                        <div className="animate-pulse space-y-4">
                            <div className="h-10 bg-fcc-charcoal rounded" />
                            <div className="h-10 bg-fcc-charcoal rounded" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Department</label>
                                <input
                                    type="text"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="w-full px-4 py-2 bg-fcc-charcoal border border-fcc-border text-white rounded focus:outline-none focus:border-fcc-gold"
                                    placeholder="e.g. Engineering"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Job Title</label>
                                <input
                                    type="text"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    className="w-full px-4 py-2 bg-fcc-charcoal border border-fcc-border text-white rounded focus:outline-none focus:border-fcc-gold"
                                    placeholder="e.g. Senior Developer"
                                />
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2 bg-fcc-gold text-fcc-charcoal font-bold rounded hover:bg-fcc-gold/90 transition disabled:opacity-50"
                            >
                                {isSaving ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <AuthGuard>
            <ProfileContent />
        </AuthGuard>
    );
}
