'use client';

export const dynamic = 'force-dynamic';

import React, { useState, Suspense } from 'react';
import { FormBuilder } from '../../../components/FormBuilder/FormBuilder';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormElement, FormLayoutConfig, FormLayoutType } from '../../../types/form-builder';
import { AuthGuard } from '../../../components/AuthGuard';
import { useToast } from '../../../contexts/ToastContext';
import { useCategories, useTemplate, useCreateForm } from '../../../hooks/queries';

interface CategoryOption {
    id: string;
    categoryName: string;
}

const NewFormContent: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();
    const templateId = searchParams.get('template');
    const initialName = searchParams.get('name') || 'Untitled Form';

    const [initialElements, setInitialElements] = useState<FormElement[]>([]);
    const [initialLayout, setInitialLayout] = useState<{ layout: FormLayoutConfig | FormLayoutType; theme: { primaryColor: string; backgroundColor: string; textColor: string } } | undefined>(undefined);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [templateLoadError, setTemplateLoadError] = useState<string | null>(null);

    // TanStack Query hooks
    const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
    const { data: template, isLoading: isLoadingTemplate } = useTemplate(templateId || '');
    const createFormMutation = useCreateForm();

    // Process template data when loaded
    React.useEffect(() => {
        if (template && templateId) {
            try {
                const definition = JSON.parse(template.formDefinition);
                setInitialElements(definition || []);
                if (template.formLayout) {
                    setInitialLayout(JSON.parse(template.formLayout));
                }
                setTemplateLoadError(null);
            } catch {
                setInitialElements([]);
                setInitialLayout(undefined);
                setTemplateLoadError('The selected template contains invalid data, so the builder was opened with a blank form instead.');
            }
        }
    }, [template, templateId]);

    React.useEffect(() => {
        if (templateLoadError) {
            toast.error(templateLoadError);
        }
    }, [templateLoadError, toast]);

    const isLoading = isLoadingCategories || (!!templateId && isLoadingTemplate);

    const handleSave = async (name: string, description: string, definition: string, layout: string) => {
        try {
            await createFormMutation.mutateAsync({
                name,
                description,
                definition,
                layout,
                categoryId: selectedCategoryId || undefined,
                changeDescription: 'Initial version'
            });
            router.push('/');
        } catch (error) {
            console.error('Failed to create form:', error);
            toast.error('Failed to save form. Check console for details.');
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen bg-fcc-charcoal flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold"></div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-fcc-charcoal">
            <div className="bg-fcc-midnight border-b border-fcc-border p-6 shadow-lg">
                <div className="max-w-md mx-auto">
                    <label className="block text-sm font-bold text-fcc-gold uppercase mb-3 tracking-wide">
                        📁 Form Category (Optional)
                    </label>
                    <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="w-full bg-fcc-charcoal border-2 border-fcc-border px-4 py-3 text-white focus:border-fcc-gold focus:ring-2 focus:ring-fcc-gold/20 outline-none transition-all duration-200 hover:border-fcc-gold/70"
                    >
                        <option value="">📄 No Category Selected</option>
                        {categories.map((category: CategoryOption) => (
                            <option key={category.id} value={category.id}>
                                📁 {category.categoryName}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-2">
                        Choose a category to organize your form. You can change this later.
                    </p>
                    {templateLoadError && (
                        <p className="text-xs text-amber-400 mt-2">{templateLoadError}</p>
                    )}
                </div>
            </div>

            <FormBuilder
                initialName={initialName}
                initialElements={initialElements}
                initialLayout={initialLayout}
                onSave={handleSave}
            />
        </div>
    );
};

const NewFormPage: React.FC = () => {
    return (
        <Suspense fallback={
            <div className="h-screen bg-fcc-charcoal flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold"></div>
            </div>
        }>
            <NewFormContent />
        </Suspense>
    );
};

export default function NewFormPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'form-designer']}>
            <NewFormPage />
        </AuthGuard>
    );
}
