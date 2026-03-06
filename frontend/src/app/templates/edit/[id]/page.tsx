'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FormBuilder } from '../../../../components/FormBuilder/FormBuilder';
import { templatesApi, categoriesApi } from '../../../../lib/api';
import { ChevronLeft, Save } from 'lucide-react';
import { AuthGuard } from '../../../../components/AuthGuard';
import { useToast } from '../../../../contexts/ToastContext';

interface Template {
    id: string;
    name: string;
    category: string;
    isPublic: boolean;
    formDefinition: string;
    formLayout?: string;
    createdDate: string;
}

const EditTemplatePage: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const toast = useToast();
    const templateId = params.id as string;
    const [template, setTemplate] = useState<Template | null>(null);
    const [categories, setCategories] = useState<string[]>(['General']);
    const [templateCategory, setTemplateCategory] = useState('General');
    const [templateIsPublic, setTemplateIsPublic] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadTemplate();
        loadCategories();
    }, [templateId]);

    const loadCategories = async () => {
        try {
            const data = await categoriesApi.getAll();
            const categoryNames = data.map((c: { categoryName: string }) => c.categoryName);
            setCategories(['General', ...categoryNames]);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const loadTemplate = async () => {
        setIsLoading(true);
        try {
            const data = await templatesApi.getById(templateId);
            setTemplate(data);
            setTemplateCategory(data.category || 'General');
            setTemplateIsPublic(!!data.isPublic);
        } catch (error) {
            console.error('Failed to load template:', error);
            toast.error('Failed to load template');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (name: string, description: string, definition: string, layout: string) => {
        if (!template) return;
        setIsSaving(true);
        try {
            await templatesApi.update(templateId, {
                name,
                category: templateCategory,
                isPublic: templateIsPublic,
                formDefinition: definition,
                formLayout: layout
            });
            router.push('/templates');
        } catch (error) {
            console.error('Failed to update template:', error);
            toast.error('Failed to update template');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-fcc-charcoal flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold"></div>
            </div>
        );
    }

    if (!template) {
        return (
            <div className="min-h-screen bg-fcc-charcoal flex items-center justify-center">
                <p className="text-white">Template not found</p>
            </div>
        );
    }

    const initialElements = JSON.parse(template.formDefinition);
    const initialLayout = template.formLayout
        ? JSON.parse(template.formLayout)
        : { layout: 'single-column' as 'single-column' | 'two-column', theme: { primaryColor: '#FFD700', backgroundColor: '#1a1a1a', textColor: '#ffffff' } };

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <header className="h-14 bg-fcc-midnight border-b border-fcc-border flex items-center justify-between px-6">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.push('/templates')}
                        className="p-2 hover:bg-fcc-charcoal transition-colors border border-transparent hover:border-fcc-border text-gray-400 hover:text-white"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-white">Edit Template: {template.name}</h1>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => router.push('/templates')}
                        className="px-4 py-2 text-sm font-bold border border-white hover:bg-white hover:text-fcc-charcoal transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </header>

            <div className="bg-fcc-midnight border-b border-fcc-border px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-2">Category</label>
                            <select
                                value={templateCategory}
                                onChange={(e) => setTemplateCategory(e.target.value)}
                                className="bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white focus:border-fcc-gold outline-none"
                            >
                                {categories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center space-x-2 mt-6">
                            <input
                                type="checkbox"
                                id="templateIsPublic"
                                checked={templateIsPublic}
                                onChange={(e) => setTemplateIsPublic(e.target.checked)}
                                className="text-fcc-gold focus:ring-fcc-gold"
                            />
                            <label htmlFor="templateIsPublic" className="text-sm text-white">Public template</label>
                        </div>
                    </div>
                    {isSaving && (
                        <span className="text-sm text-gray-400">Saving...</span>
                    )}
                </div>
            </div>

            <div className="flex-1">
                <FormBuilder
                    initialName={template.name}
                    initialElements={initialElements}
                    initialLayout={initialLayout}
                    onSave={handleSave}
                    onPublish={() => Promise.resolve()}
                    onUnpublish={() => Promise.resolve()}
                />
            </div>
        </div>
    );
};

export default function EditTemplatePageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'form-designer']}>
            <EditTemplatePage />
        </AuthGuard>
    );
}