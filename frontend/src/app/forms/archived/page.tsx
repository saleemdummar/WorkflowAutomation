'use client';

import React, { useState } from 'react';
import { AuthGuard } from '../../../components/AuthGuard';
import { ChevronLeft, Archive, RotateCcw, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useArchivedForms, useExpiredForms, useRestoreForm } from '../../../hooks/queries';

function ArchivedFormsPage() {
    const [tab, setTab] = useState<'archived' | 'expired'>('archived');
    const [restoringId, setRestoringId] = useState<string | null>(null);

    // TanStack Query hooks
    const { data: archivedForms = [], isLoading: isLoadingArchived } = useArchivedForms();
    const { data: expiredForms = [], isLoading: isLoadingExpired } = useExpiredForms();
    const restoreFormMutation = useRestoreForm();

    const loading = isLoadingArchived || isLoadingExpired;

    const handleRestore = async (formId: string) => {
        try {
            setRestoringId(formId);
            await restoreFormMutation.mutateAsync({ formId, data: { restoreReason: 'Restored from archived/expired list' } });
        } catch (err) {
            console.error('Failed to restore form:', err);
        } finally {
            setRestoringId(null);
        }
    };

    const displayForms = tab === 'archived' ? archivedForms : expiredForms;

    return (
        <div className="min-h-screen bg-fcc-charcoal text-white">
            <header className="bg-fcc-midnight border-b border-fcc-border px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-fcc-charcoal rounded border border-transparent hover:border-fcc-border">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter">Archived & Expired Forms</h1>
                        <p className="text-sm text-gray-400">{archivedForms.length} archived, {expiredForms.length} expired</p>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 space-y-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => setTab('archived')}
                        className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold ${tab === 'archived' ? 'bg-fcc-gold text-fcc-charcoal' : 'bg-fcc-midnight text-white border border-fcc-border'}`}
                    >
                        <Archive size={16} /> Archived ({archivedForms.length})
                    </button>
                    <button
                        onClick={() => setTab('expired')}
                        className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold ${tab === 'expired' ? 'bg-fcc-gold text-fcc-charcoal' : 'bg-fcc-midnight text-white border border-fcc-border'}`}
                    >
                        <AlertTriangle size={16} /> Expired ({expiredForms.length})
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold mx-auto" /></div>
                ) : displayForms.length === 0 ? (
                    <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-12 text-center text-gray-400">
                        <Archive size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No {tab} forms found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayForms.map((form) => (
                            <div key={form.id} className="bg-fcc-midnight border border-fcc-border rounded-lg p-4 hover:border-fcc-gold transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-white">{form.name}</h3>
                                    <span className={`text-xs px-2 py-1 rounded ${tab === 'archived' ? 'bg-gray-500/20 text-gray-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {tab === 'archived' ? 'Archived' : 'Expired'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 mb-3">{form.description || 'No description'}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Clock size={12} />
                                    {tab === 'archived'
                                        ? <span>Archived {form.archivedAt ? new Date(form.archivedAt).toLocaleDateString() : 'N/A'}</span>
                                        : <span>Expired {form.expirationDate ? new Date(form.expirationDate).toLocaleDateString() : 'N/A'}</span>
                                    }
                                </div>
                                {form.archiveReason && <p className="text-xs text-gray-500 mt-1">Reason: {form.archiveReason}</p>}
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => handleRestore(form.id)}
                                        disabled={restoringId === form.id}
                                        className="flex items-center gap-1 px-3 py-1 text-xs bg-fcc-charcoal border border-fcc-border rounded hover:border-fcc-gold text-white disabled:opacity-50"
                                    >
                                        <RotateCcw size={12} /> {restoringId === form.id ? 'Restoring...' : 'Restore'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function ArchivedFormsPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'form-designer']}>
            <ArchivedFormsPage />
        </AuthGuard>
    );
}
