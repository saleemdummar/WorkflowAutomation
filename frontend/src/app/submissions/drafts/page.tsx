'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../../../components/AuthGuard';
import { submissionsApi, formsApi } from '../../../lib/api';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import type { DraftSummary } from '../../../types/entities';

function MyDraftsPage() {
    const router = useRouter();
    const [drafts, setDrafts] = useState<DraftSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const toast = useToast();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();

    useEffect(() => {
        fetchDrafts();
    }, []);

    const fetchDrafts = async () => {
        try {
            setIsLoading(true);

            // Try the dedicated all-drafts endpoint first
            try {
                const allDrafts = await submissionsApi.getAllDrafts();
                setDrafts(allDrafts);
                return;
            } catch {
                // Fall back to per-form fetching
            }

            const forms = await formsApi.getAll();
            const allDrafts: DraftSummary[] = [];

            for (const form of forms) {
                try {
                    const formDrafts = await submissionsApi.getDrafts(form.id);
                    formDrafts.forEach((draft) => {
                        allDrafts.push({
                            id: draft.id,
                            formId: draft.formId || form.id,
                            formName: draft.formName || form.name,
                            draftSavedAt: draft.draftSavedAt,
                            submissionData: draft.submissionData
                        });
                    });
                } catch (err) {
                    console.error(`Failed to fetch drafts for form ${form.id}:`, err);
                }
            }

            allDrafts.sort((a, b) =>
                new Date(b.draftSavedAt || '').getTime() - new Date(a.draftSavedAt || '').getTime()
            );

            setDrafts(allDrafts);
        } catch (err) {
            console.error('Failed to fetch drafts:', err);
            setError('Failed to load drafts');
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinueDraft = (formId: string, draftId: string) => {
        router.push(`/forms/submit/${formId}?draftId=${draftId}`);
    };

    const handleDeleteDraft = async (formId: string, draftId: string) => {
        if (!(await confirmAction({ message: 'Are you sure you want to delete this draft?' }))) {
            return;
        }

        try {
            setDeletingId(draftId);
            await submissionsApi.deleteDraft(formId, draftId);
            setDrafts(drafts.filter(d => d.id !== draftId));
        } catch (err) {
            console.error('Failed to delete draft:', err);
            toast.error('Failed to delete draft');
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-fcc-charcoal flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <header className="bg-fcc-midnight border-b border-fcc-border">
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/submissions')}
                                className="text-white hover:text-fcc-gold flex items-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="font-bold">Back</span>
                            </button>
                            <h1 className="text-2xl font-bold text-white">My Drafts</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {error && (
                    <div className="mb-6 bg-red-900/30 border border-red-700 text-red-200 p-4 rounded">
                        {error}
                    </div>
                )}

                {drafts.length === 0 ? (
                    <div className="text-center py-12">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <h3 className="mt-2 text-lg font-medium text-white">No drafts</h3>
                        <p className="mt-1 text-sm text-gray-400">
                            You haven't saved any form drafts yet.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={() => router.push('/')}
                                className="px-4 py-2 bg-fcc-gold text-fcc-midnight font-bold hover:bg-fcc-gold/90 transition-colors rounded"
                            >
                                Browse Forms
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {drafts.map((draft) => (
                            <div
                                key={draft.id}
                                className="bg-fcc-midnight border border-fcc-border p-6 shadow-lg hover:border-fcc-gold transition-colors"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-1">
                                            {draft.formName}
                                        </h3>
                                        <p className="text-sm text-gray-400">
                                            Saved {draft.draftSavedAt ? formatDate(draft.draftSavedAt) : 'Unknown'}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2 px-2 py-1 bg-fcc-gold/20 text-fcc-gold rounded text-xs font-medium">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span>DRAFT</span>
                                    </div>
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => handleContinueDraft(draft.formId, draft.id)}
                                        className="flex-1 px-4 py-2 bg-fcc-gold text-fcc-midnight font-bold hover:bg-fcc-gold/90 transition-colors rounded"
                                    >
                                        Continue
                                    </button>
                                    <button
                                        onClick={() => handleDeleteDraft(draft.formId, draft.id)}
                                        disabled={deletingId === draft.id}
                                        className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                                    >
                                        {deletingId === draft.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <ConfirmDialog />
        </div>
    );
}

export default function MyDraftsPageWrapper() {
    return (
        <AuthGuard>
            <MyDraftsPage />
        </AuthGuard>
    );
}
