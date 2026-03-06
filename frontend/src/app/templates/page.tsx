'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainNavigation } from '../../components/MainNavigation';
import { templatesApi } from '../../lib/api';
import { Plus, Search, FileText, Edit, Trash2 } from 'lucide-react';
import { AuthGuard } from '../../components/AuthGuard';
import { useToast } from '../../contexts/ToastContext';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import type { FormTemplate } from '../../types/entities';

const TemplatesPage: React.FC = () => {
    const router = useRouter();
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<FormTemplate[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [categories, setCategories] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const toast = useToast();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        const filterTemplates = () => {
            let filtered = templates;
            if (searchTerm) {
                filtered = filtered.filter(t =>
                    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    t.category.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            if (selectedCategory !== 'All') {
                filtered = filtered.filter(t => t.category === selectedCategory);
            }

            setFilteredTemplates(filtered);
        };

        filterTemplates();
    }, [templates, searchTerm, selectedCategory]);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const data = await templatesApi.getAll();
            setTemplates(data);
            const uniqueCategories = Array.from(new Set(data.map((t: FormTemplate) => t.category)));
            setCategories(['All', ...uniqueCategories as string[]]);
        } catch (error) {
            console.error('Failed to load templates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateFormFromTemplate = async (template: FormTemplate) => {
        try {
            JSON.parse(template.formDefinition);
            const formName = `${template.name} Copy`;
            router.push(`/forms/new?template=${template.id}&name=${encodeURIComponent(formName)}`);
        } catch (error) {
            console.error('Failed to parse template:', error);
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (await confirmAction({ message: 'Are you sure you want to delete this template?' })) {
            try {
                await templatesApi.delete(templateId);
                loadTemplates();
            } catch (error) {
                console.error('Failed to delete template:', error);
                toast.error('Failed to delete template');
            }
        }
    };

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />

            <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-fcc-midnight border border-fcc-border p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold text-white">Form Templates</h1>
                        <button
                            onClick={() => router.push('/templates/new')}
                            className="flex items-center space-x-2 px-4 py-2 bg-fcc-gold text-fcc-charcoal hover:bg-yellow-400 transition-colors font-bold">
                            <Plus size={16} />
                            <span>New Template</span>
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search templates..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-fcc-charcoal border border-fcc-border text-white placeholder-gray-400 focus:border-fcc-gold outline-none"
                            />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2 bg-fcc-charcoal border border-fcc-border text-white focus:border-fcc-gold outline-none"
                        >
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold"></div>
                            <span className="ml-2 text-gray-400">Loading templates...</span>
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText size={48} className="mx-auto mb-4 text-gray-500" />
                            <h3 className="text-xl font-semibold text-white mb-2">No templates found</h3>
                            <p className="text-gray-400 mb-6">
                                {searchTerm || selectedCategory !== 'All'
                                    ? 'Try adjusting your search or filter criteria.'
                                    : 'Create your first form template to get started.'
                                }
                            </p>
                            {!searchTerm && selectedCategory === 'All' && (
                                <button
                                    onClick={() => router.push('/templates/new')}
                                    className="inline-flex items-center px-4 py-2 bg-fcc-gold text-fcc-charcoal hover:bg-yellow-400 transition-colors font-bold"
                                >
                                    <Plus size={16} className="mr-2" />
                                    Create Template
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTemplates.map(template => (
                                <div key={template.id} className="bg-fcc-charcoal border border-fcc-border p-6 hover:border-fcc-gold transition-colors">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-1">{template.name}</h3>
                                            <p className="text-sm text-gray-400">{template.category}</p>
                                        </div>
                                        {template.isPublic && (
                                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Public</span>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-500 mb-4">
                                        Created {new Date(template.createdDate).toLocaleDateString()}
                                    </p>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleCreateFormFromTemplate(template)}
                                            className="flex-1 flex items-center justify-center px-3 py-2 bg-fcc-gold text-fcc-charcoal hover:bg-yellow-400 transition-colors text-sm font-bold"
                                        >
                                            <Plus size={14} className="mr-1" />
                                            Use Template
                                        </button>
                                        <button
                                            onClick={() => router.push(`/templates/edit/${template.id}`)}
                                            className="p-2 text-gray-400 hover:text-white transition-colors"
                                            title="Edit template"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTemplate(template.id)}
                                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                                            title="Delete template"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <ConfirmDialog />
        </div >
    );
};

export default function TemplatesPageWrapper() {
    return (
        <AuthGuard>
            <TemplatesPage />
        </AuthGuard>
    );
}