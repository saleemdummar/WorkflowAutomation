'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { submissionsApi } from '../../../../lib/api';
import { Form } from '../../../../types/entities';
import FormRenderer from '../../../../components/FormRenderer';
import { useAutoSaveDraft } from '../../../../hooks/useAutoSaveDraft';
import { AuthGuard } from '../../../../components/AuthGuard';
import { FormLayoutConfig } from '../../../../types/form-builder';
import { useToast } from '../../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../../hooks/useConfirmDialog';
import { useForm as useFormQuery, useDraftsByForm, useDraft, useSubmitForm, useDeleteDraft } from '../../../../hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../hooks/queries';

interface FormTheme {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    baseFontSize?: string;
    borderRadius?: string;
    labelColor?: string;
    inputBorderColor?: string;
    errorColor?: string;
}

function SubmitFormPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { success, error: showError } = useToast();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();
    const formId = params.id as string;
    const requestedDraftId = searchParams.get('draftId');
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Array<{ id: string; draftSavedAt?: string }>>([]);
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);
    const [initialDraftId, setInitialDraftId] = useState<string | null>(null);
    const [initialDraftData, setInitialDraftData] = useState<Record<string, unknown> | null>(null);
    const [formLayout, setFormLayout] = useState<FormLayoutConfig | undefined>(undefined);
    const [formTheme, setFormTheme] = useState<FormTheme | undefined>(undefined);

    // TanStack Query: fetch form data
    const { data: formQueryData, isLoading: loadingForm, error: formQueryError } = useFormQuery(formId);

    // TanStack Query: fetch drafts for this form
    const { data: draftsData = [], isLoading: loadingDrafts } = useDraftsByForm(formId);

    // TanStack Query: fetch specific draft if requested
    const { data: requestedDraftData, isLoading: loadingRequestedDraft } = useDraft(formId, requestedDraftId || '');

    // Mutations
    const submitFormMutation = useSubmitForm();
    const deleteDraftMutation = useDeleteDraft();

    // Loading state for drafts
    const loadingDraft = loadingDrafts || loadingRequestedDraft;

    // Derive form from query data, validating status
    const form = React.useMemo<Form | null>(() => {
        if (!formQueryData) return null;
        if (!formQueryData.isPublished) { setError('This form is not published and cannot be submitted'); return null; }
        if (formQueryData.isArchived) { setError('This form has been archived and cannot be submitted'); return null; }
        if (formQueryData.isActive === false) { setError('This form is not currently active and cannot be submitted'); return null; }
        if (formQueryData.expirationDate) {
            const expirationDate = new Date(formQueryData.expirationDate);
            if (expirationDate < new Date()) { setError('This form has expired and cannot be submitted'); return null; }
        }
        return formQueryData;
    }, [formQueryData]);

    // Parse layout/theme when form loads
    useEffect(() => {
        if (!form?.layout) return;
        try {
            const parsedLayout = JSON.parse(form.layout);
            setFormLayout(parsedLayout.layout);
            setFormTheme(parsedLayout.theme);
        } catch (err) {
            console.warn('Failed to parse form layout:', err);
        }
    }, [form?.layout]);

    // Handle form load error from query
    useEffect(() => {
        if (formQueryError) {
            setError((formQueryError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load form');
        }
    }, [formQueryError]);

    // Set drafts from query data
    useEffect(() => {
        if (draftsData && Array.isArray(draftsData) && draftsData.length > 0) {
            setDrafts(draftsData);

            if (requestedDraftId && requestedDraftData) {
                // Load the requested draft data
                const draftData = typeof requestedDraftData.submissionData === 'string'
                    ? JSON.parse(requestedDraftData.submissionData)
                    : (requestedDraftData.submissionData || {});
                setInitialDraftId(requestedDraftData.id);
                setInitialDraftData(draftData);
                setFormData(draftData);
                setShowDraftPrompt(false);
            } else if (requestedDraftId && !requestedDraftData) {
                // Requested draft not found
                setShowDraftPrompt(true);
            } else if (!requestedDraftId && !initialDraftId) {
                // No specific draft requested, show prompt to load latest
                setShowDraftPrompt(true);
            }
        }
    }, [draftsData, requestedDraftId, requestedDraftData, initialDraftId]);

    const { draftId, saveNow, clearDraft } = useAutoSaveDraft({
        formId,
        formData,
        initialDraftId,
        onSave: (id) => {
            setLastSaved(new Date());
        },
        onError: (err) => {
            console.error('Auto-save failed:', err);
        },
        interval: 30000,
        enabled: !!form
    });

    const handleManualSave = async () => {
        setIsSaving(true);
        try {
            await saveNow();
            setLastSaved(new Date());
            success('Draft saved successfully!');
        } catch (err) {
            console.error('Manual save failed:', err);
            showError('Failed to save draft');
        } finally {
            setIsSaving(false);
        }
    };

    const loadLatestDraft = () => {
        if (!drafts.length) return;
        const latest = drafts
            .slice()
            .sort((a, b) => {
                const dateA = new Date(a.draftSavedAt || '').getTime();
                const dateB = new Date(b.draftSavedAt || '').getTime();
                // Fix: Duplicate Key in Draft Sorting - use id as secondary sort
                if (dateB === dateA) {
                    return a.id.localeCompare(b.id);
                }
                return dateB - dateA;
            })[0];

        if (!latest) return;

        // Use queryClient to fetch the draft data directly
        queryClient.fetchQuery({
            queryKey: queryKeys.submissions.drafts.detail(formId, latest.id),
            queryFn: () => submissionsApi.getDraft(formId, latest.id)
        }).then((draft) => {
            const draftData = typeof draft.submissionData === 'string'
                ? JSON.parse(draft.submissionData)
                : (draft.submissionData || {});
            setInitialDraftId(draft.id);
            setInitialDraftData(draftData);
            setFormData(draftData);
            setShowDraftPrompt(false);
        }).catch((err) => {
            console.error('Failed to load draft:', err);
            showError('Failed to load draft');
        });
    };

    const discardDrafts = async () => {
        // Fix: No Confirmation Before Discarding Drafts
        if (!drafts.length) return;
        if (!(await confirmAction({ message: 'Are you sure you want to discard all saved drafts? This action cannot be undone.' }))) {
            return;
        }
        try {
            await Promise.all(drafts.map(draft => deleteDraftMutation.mutateAsync({ formId, draftId: draft.id })));
            setDrafts([]);
            setShowDraftPrompt(false);
            success('All drafts discarded successfully');
        } catch (err) {
            console.error('Failed to delete drafts:', err);
            showError('Failed to delete drafts');
        }
    };

    const handleSubmit = async (data: Record<string, unknown>) => {
        if (!form) return;

        try {
            await submitFormMutation.mutateAsync({
                formId,
                data: {
                    formId: form.id,
                    submissionData: JSON.stringify(data),
                    draftId: draftId
                }
            });

            clearDraft();

            success('Form submitted successfully!');
            router.push('/submissions');
        } catch (err: unknown) {
            console.error('Submission failed:', err);

            // Handle backend validation errors
            const responseErrors = (err as { response?: { data?: { errors?: string[] | string } } })
                .response?.data?.errors;

            if (responseErrors) {
                const errorMessages = Array.isArray(responseErrors)
                    ? responseErrors.join('\n')
                    : responseErrors;
                showError(`Submission failed:\n${errorMessages}`);
            } else if (submitFormMutation.error) {
                // Handle mutation error from TanStack Query
                const mutationError = submitFormMutation.error as { response?: { data?: { message?: string } } };
                showError(mutationError?.response?.data?.message || 'Failed to submit form');
            } else {
                showError((err as Error).message || 'Failed to submit form');
            }
        }
    };

    if (loadingForm) {
        return (
            <div className="min-h-screen bg-fcc-charcoal flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold"></div>
            </div>
        );
    }

    if (error || !form) {
        return (
            <div className="min-h-screen bg-fcc-charcoal">
                <header className="bg-fcc-midnight border-b border-fcc-border">
                    <div className="mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-12">
                            <button
                                onClick={() => router.push('/')}
                                className="text-white hover:text-fcc-gold flex items-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="font-bold">Back</span>
                            </button>
                        </div>
                    </div>
                </header>
                <div className="max-w-4xl mx-auto py-12 px-4">
                    <div className="bg-red-900/30 border border-red-700 text-red-200 p-6 rounded">
                        <h2 className="text-xl font-bold mb-2">Error Loading Form</h2>
                        <p>{error || 'Form not found'}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <header className="bg-fcc-midnight border-b border-fcc-border">
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-12">
                        <button
                            onClick={() => router.push('/')}
                            className="text-white hover:text-fcc-gold flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span className="font-bold">Back</span>
                        </button>
                        <div className="flex items-center space-x-4">
                            {lastSaved && (
                                <span className="text-sm text-gray-400">
                                    Last saved: {lastSaved.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={handleManualSave}
                                disabled={isSaving}
                                className="px-4 py-1.5 bg-fcc-gold/20 text-fcc-gold border border-fcc-gold hover:bg-fcc-gold hover:text-fcc-midnight transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                            >
                                {isSaving ? 'Saving...' : 'Save Draft'}
                            </button>
                        </div>
                        <h1 className="text-xl font-bold text-white">{form?.name || 'Submit Form'}</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-12 px-4">
                {showDraftPrompt && (
                    <div className="mb-6 rounded-lg border border-fcc-border bg-fcc-midnight p-4 flex items-center justify-between">
                        <div>
                            <p className="text-white font-medium">We found saved drafts for this form.</p>
                            <p className="text-sm text-gray-400">Would you like to resume your latest draft?</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={discardDrafts}
                                className="px-4 py-2 text-gray-300 hover:text-white"
                                disabled={loadingDraft}
                            >
                                Discard
                            </button>
                            <button
                                onClick={loadLatestDraft}
                                className="px-4 py-2 bg-fcc-gold text-fcc-charcoal rounded hover:bg-yellow-500"
                                disabled={loadingDraft}
                            >
                                {loadingDraft ? 'Loading...' : 'Load Draft'}
                            </button>
                        </div>
                    </div>
                )
                }
                <div className="bg-fcc-midnight border border-fcc-border p-8 shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">{form.name}</h2>
                        {form.description && (
                            <p className="text-gray-400">{form.description}</p>
                        )}
                        {draftId && (
                            <div className="mt-4 flex items-center space-x-2 text-sm text-fcc-gold">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Draft auto-save enabled</span>
                            </div>
                        )}
                    </div>

                    <FormRenderer
                        definition={form.definition}
                        formId={form.id}
                        onSubmit={handleSubmit}
                        onChange={setFormData}
                        initialData={initialDraftData || undefined}
                        layout={formLayout}
                        theme={formTheme}
                        mode="submit"
                    />
                </div>
            </main >
            <ConfirmDialog />
        </div >
    );
}

export default function SubmitFormPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'form-designer', 'workflow-designer', 'approver', 'submitter']}>
            <SubmitFormPage />
        </AuthGuard>
    );
}


