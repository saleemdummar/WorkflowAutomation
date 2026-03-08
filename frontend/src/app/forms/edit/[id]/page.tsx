'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { FormBuilder } from '../../../../components/FormBuilder/FormBuilder';
import CrossFieldValidation from '../../../../components/CrossFieldValidation';
import FormLifecycleManager from '../../../../components/FormLifecycleManager';
import { formsApi } from '../../../../lib/api';
import { useRouter, useParams } from 'next/navigation';
import { FormElement, FormLayoutConfig, FormLayoutType } from '../../../../types/form-builder';
import { AuthGuard } from '../../../../components/AuthGuard';
import { useToast } from '../../../../contexts/ToastContext';
import { useForm as useFormQuery, useUpdateForm, usePublishForm, useUnpublishForm, useCategories } from '../../../../hooks/queries';

const EditFormPage: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { success, error: showError } = useToast();

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [showValidations, setShowValidations] = useState(false);
    const [showLifecycle, setShowLifecycle] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');

    // TanStack Query hooks
    const { data: formData, isLoading: isLoadingForm, error: formError } = useFormQuery(id);
    const { data: categories = [] } = useCategories();
    const updateFormMutation = useUpdateForm();
    const publishFormMutation = usePublishForm();
    const unpublishFormMutation = useUnpublishForm();

    // Parse form data into initial state
    const initialData = useMemo(() => {
        if (!formData) return null;
        let definition: FormElement[] = [];
        let layout: { layout: FormLayoutConfig | FormLayoutType; theme: { primaryColor: string; backgroundColor: string; textColor: string } } | undefined;
        let parseError: string | null = null;
        try {
            definition = formData.definition ? JSON.parse(formData.definition) : [];
        } catch {
            parseError = 'This form contains invalid field definition data and cannot be edited safely until it is repaired.';
        }
        if (formData.layout) {
            try {
                layout = JSON.parse(formData.layout);
            } catch {
                parseError = 'This form contains invalid layout data and cannot be edited safely until it is repaired.';
            }
        }
        return {
            name: formData.name,
            description: formData.description || '',
            elements: definition,
            layout,
            isPublished: formData.isPublished,
            parseError
        };
    }, [formData]);

    // Sync categoryId when form data loads
    useEffect(() => {
        if (formData?.categoryId) {
            setSelectedCategoryId(formData.categoryId);
        }
    }, [formData?.categoryId]);

    // Handle form load error
    useEffect(() => {
        if (formError) {
            showError('Failed to load form. Redirecting...');
            setTimeout(() => router.push('/'), 2000);
        }
    }, [formError, router, showError]);

    useEffect(() => {
        if (initialData?.parseError) {
            showError(initialData.parseError);
        }
    }, [initialData?.parseError, showError]);

    const handleSave = async (name: string, description: string, definition: string, layout: string) => {
        try {
            await updateFormMutation.mutateAsync({
                id,
                data: {
                    name,
                    description,
                    definition,
                    layout,
                    categoryId: selectedCategoryId || undefined,
                    changeDescription: 'Form updated'
                }
            });
            success('Form saved successfully!');
        } catch (error: unknown) {
            let errorMessage = 'Failed to update form.';
            const responseData =
                error && typeof error === 'object' && 'response' in error
                    ? (error as { response?: { data?: { errors?: string[] | string; message?: string } } }).response?.data
                    : undefined;
            if (responseData?.errors) {
                errorMessage = Array.isArray(responseData.errors)
                    ? `Validation errors:\n${responseData.errors.join('\n')}`
                    : responseData.errors;
            } else if (responseData?.message) {
                errorMessage = responseData.message;
            }
            showError(errorMessage);
        }
    };

    const handlePublish = async () => {
        try {
            await publishFormMutation.mutateAsync(id);
            success('Form published successfully!');
        } catch (error) {
            console.error('Failed to publish form:', error);
            showError('Failed to publish form.');
        }
    };

    const handleUnpublish = async () => {
        try {
            await unpublishFormMutation.mutateAsync(id);
            success('Form unpublished successfully!');
        } catch (error) {
            console.error('Failed to unpublish form:', error);
            showError('Failed to unpublish form.');
        }
    };

    // Filter categories based on search
    const filteredCategories = categories.filter((cat: { id: string; categoryName: string }) =>
        cat.categoryName.toLowerCase().includes(categorySearch.toLowerCase())
    );

    const isLoading = isLoadingForm;

    if (isLoading) {
        return (
            <div className="h-screen bg-fcc-charcoal flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold"></div>
            </div>
        );
    }

    if (!initialData) {
        return (
            <div className="h-screen bg-fcc-charcoal flex items-center justify-center text-white">
                <p>Form not found.</p>
            </div>
        );
    }

    if (initialData.parseError) {
        return (
            <div className="h-screen bg-fcc-charcoal flex items-center justify-center p-6">
                <div className="max-w-xl border border-red-500/40 bg-fcc-midnight p-6 text-white">
                    <h1 className="text-xl font-bold text-red-400 mb-3">Form data needs repair</h1>
                    <p className="text-gray-300">{initialData.parseError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-fcc-charcoal flex flex-col">
            {/* Header Section - Improved Layout */}
            <div className="bg-fcc-midnight border-b border-fcc-border p-4 shadow-lg">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Category Selector with Search */}
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-fcc-gold uppercase mb-2 tracking-wide">
                                📁 Form Category (Optional)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search categories..."
                                    value={categorySearch}
                                    onChange={(e) => setCategorySearch(e.target.value)}
                                    className="w-full bg-fcc-charcoal border-2 border-fcc-border px-4 py-2 text-white focus:border-fcc-gold focus:ring-2 focus:ring-fcc-gold/20 outline-none transition-all duration-200 text-sm mb-2"
                                />
                                <select
                                    value={selectedCategoryId}
                                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                                    className="w-full bg-fcc-charcoal border-2 border-fcc-border px-4 py-3 text-white focus:border-fcc-gold focus:ring-2 focus:ring-fcc-gold/20 outline-none transition-all duration-200"
                                >
                                    <option value="">📄 No Category Selected</option>
                                    {filteredCategories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            📁 {category.categoryName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Action Buttons - Better organized */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => router.push(`/forms/${id}/permissions`)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                            >
                                🔒 Permissions
                            </button>
                            <button
                                onClick={() => setShowValidations(!showValidations)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${showValidations ? 'bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                            >
                                ✓ Validations
                            </button>
                            <button
                                onClick={() => setShowLifecycle(!showLifecycle)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${showLifecycle ? 'bg-orange-700' : 'bg-orange-600 hover:bg-orange-700'} text-white`}
                            >
                                ⏱ Lifecycle
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Collapsible Panels */}
            {showValidations && initialData && (
                <div className="bg-fcc-midnight border-b border-fcc-border p-4">
                    <div className="max-w-6xl mx-auto flex justify-between items-center">
                        <h3 className="text-white font-semibold">Cross-Field Validations</h3>
                        <button onClick={() => setShowValidations(false)} className="text-gray-400 hover:text-white">
                            ✕
                        </button>
                    </div>
                    <div className="max-w-6xl mx-auto mt-4">
                        <CrossFieldValidation
                            formId={id}
                            fields={initialData.elements.map(el => ({ id: el.id, label: el.label, type: el.type }))}
                        />
                    </div>
                </div>
            )}

            {showLifecycle && (
                <div className="bg-fcc-midnight border-b border-fcc-border p-4">
                    <div className="max-w-6xl mx-auto flex justify-between items-center">
                        <h3 className="text-white font-semibold">Form Lifecycle</h3>
                        <button onClick={() => setShowLifecycle(false)} className="text-gray-400 hover:text-white">
                            ✕
                        </button>
                    </div>
                    <div className="max-w-6xl mx-auto mt-4">
                        <FormLifecycleManager formId={id} onStatusChange={() => { }} />
                    </div>
                </div>
            )}

            <FormBuilder
                formId={id}
                initialName={initialData.name}
                initialDescription={initialData.description}
                initialElements={initialData.elements}
                initialLayout={initialData.layout}
                isPublished={initialData?.isPublished ?? false}
                onSave={handleSave}
                onPublish={handlePublish}
                onUnpublish={handleUnpublish}
            />
        </div>
    );
};

export default function EditFormPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'form-designer']}>
            <EditFormPage />
        </AuthGuard>
    );
}
