'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormBuilder } from '../../../components/FormBuilder/FormBuilder';
import { templatesApi, categoriesApi } from '../../../lib/api';
import { ChevronLeft, Save } from 'lucide-react';
import { AuthGuard } from '../../../components/AuthGuard';
import { useToast } from '../../../contexts/ToastContext';

const NewTemplatePage: React.FC = () => {
    const router = useRouter();
    const toast = useToast();
    const [templateDetails, setTemplateDetails] = useState({
        name: '',
        category: '',
        isPublic: false
    });
    const [categories, setCategories] = useState<string[]>([]);
    const [showBuilder, setShowBuilder] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await categoriesApi.getAll();
                const categoryNames = data.map((c: { categoryName: string }) => c.categoryName);
                setCategories(['General', ...categoryNames]);
            } catch (error) {
                console.error('Failed to load categories:', error);
            }
        };
        fetchCategories();
    }, []);

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!templateDetails.name.trim()) {
            toast.error('Template name is required');
            return;
        }
        setShowBuilder(true);
    };

    const handleSave = async (name: string, description: string, definition: string, layout: string) => {
        try {
            await templatesApi.create({
                name: name || templateDetails.name,
                category: templateDetails.category || 'General',
                isPublic: templateDetails.isPublic,
                formDefinition: definition,
                formLayout: layout
            });
            router.push('/templates');
        } catch (error) {
            console.error('Failed to create template:', error);
            toast.error('Failed to create template');
        }
    };

    if (showBuilder) {
        return (
            <div className="min-h-screen bg-fcc-charcoal">
                <header className="h-14 bg-fcc-midnight border-b border-fcc-border flex items-center justify-between px-6">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setShowBuilder(false)}
                            className="p-2 hover:bg-fcc-charcoal transition-colors border border-transparent hover:border-fcc-border text-gray-400 hover:text-white"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold text-white">Build Template: {templateDetails.name}</h1>
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

                <div className="flex-1">
                    <FormBuilder
                        onSave={handleSave}
                    />
                </div>
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
                                onClick={() => router.push('/templates')}
                                className="p-2 hover:bg-fcc-charcoal transition-colors border border-transparent hover:border-fcc-border text-gray-400 hover:text-white"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <h1 className="text-xl font-bold text-white">Create New Template</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-fcc-midnight border border-fcc-border p-6 shadow-2xl">
                    <form onSubmit={handleCreateTemplate} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-2">Template Name</label>
                            <input
                                type="text"
                                value={templateDetails.name}
                                onChange={(e) => setTemplateDetails(prev => ({ ...prev, name: e.target.value }))}
                                required
                                className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white focus:border-fcc-gold outline-none"
                                placeholder="Enter template name"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-2">Category</label>
                            <select
                                value={templateDetails.category}
                                onChange={(e) => setTemplateDetails(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white focus:border-fcc-gold outline-none"
                            >
                                {categories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={templateDetails.isPublic}
                                onChange={(e) => setTemplateDetails(prev => ({ ...prev, isPublic: e.target.checked }))}
                                className="text-fcc-gold focus:ring-fcc-gold"
                            />
                            <label htmlFor="isPublic" className="text-sm text-white">Make this template public</label>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => router.push('/templates')}
                                className="px-4 py-2 text-sm font-bold border border-white hover:bg-white hover:text-fcc-charcoal transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex items-center space-x-2 px-4 py-2 bg-fcc-gold text-fcc-charcoal hover:bg-yellow-400 transition-all font-bold"
                            >
                                <Save size={16} />
                                <span>Start Building</span>
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default function NewTemplatePageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'form-designer']}>
            <NewTemplatePage />
        </AuthGuard>
    );
}