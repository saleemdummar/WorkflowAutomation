'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { MainNavigation } from '@/components/MainNavigation';
import { AdvancedSearch } from '@/components/AdvancedSearch';
import { useForms as useFormsQuery, useArchiveForm, usePublishForm, useCreateForm, useUnpublishForm } from '@/hooks/queries';
import { useCategories } from '@/hooks/queries';
import { formsApi } from '@/lib/api';
import { Form as EntityForm } from '@/types/entities';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/contexts/ToastContext';
import { useUIStore } from '@/stores';
import type { SearchFilters } from '@/components/AdvancedSearch';
import {
    Plus,
    FileText,
    Edit,
    Trash2,
    Eye,
    Globe,
    Lock,
    Copy,
    MoreVertical,
    Calendar,
    User,
    FolderOpen,
    CheckCircle,
    Clock,
    AlertCircle,
    Download
} from 'lucide-react';

function FormsPage() {
    const toast = useToast();
    const { activeDropdown, setActiveDropdown, deleteConfirmId: deleteConfirm, setDeleteConfirmId: setDeleteConfirm } = useUIStore();
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [searchFilters, setSearchFilters] = useState<{ query: string; filters: SearchFilters }>({ query: '', filters: {} });

    // TanStack Query hooks
    const { data: forms = [], isLoading: loading } = useFormsQuery();
    const { data: categories = [] } = useCategories();
    const archiveFormMutation = useArchiveForm();
    const publishFormMutation = usePublishForm();
    const unpublishFormMutation = useUnpublishForm();
    const createFormMutation = useCreateForm();

    // Client-side filtering
    const filteredForms = useMemo(() => {
        let results = [...forms];
        const { query, filters } = searchFilters;

        if (query) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(form =>
                form.name.toLowerCase().includes(lowerQuery) ||
                form.description?.toLowerCase().includes(lowerQuery)
            );
        }
        if (filters.category) {
            results = results.filter(form => form.categoryId === filters.category);
        }
        if (filters.status) {
            if (filters.status === 'published') results = results.filter(form => form.isPublished);
            else if (filters.status === 'draft') results = results.filter(form => !form.isPublished);
        }
        if (filters.dateFrom) results = results.filter(form => new Date(form.createdDate) >= new Date(filters.dateFrom!));
        if (filters.dateTo) results = results.filter(form => new Date(form.createdDate) <= new Date(filters.dateTo!));
        if (filters.sortBy) {
            results.sort((a, b) => {
                const aVal = filters.sortBy === 'name' ? a.name : new Date(a.createdDate).getTime();
                const bVal = filters.sortBy === 'name' ? b.name : new Date(b.createdDate).getTime();
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return filters.sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
                }
                return filters.sortOrder === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
            });
        }
        if (selectedCategory) results = results.filter(form => form.categoryId === selectedCategory);
        return results;
    }, [forms, searchFilters, selectedCategory]);

    const publishedCount = forms.filter(f => f.isPublished).length;
    const draftCount = forms.filter(f => !f.isPublished).length;

    const handleSearch = useCallback((query: string, filters: SearchFilters) => {
        setSearchFilters({ query, filters });
    }, []);

    const handleCategoryFilter = (categoryId: string) => {
        setSelectedCategory(categoryId);
    };

    const handleDelete = async (id: string) => {
        try {
            await archiveFormMutation.mutateAsync({ formId: id, data: { archiveReason: 'Archived from forms dashboard' } });
            setDeleteConfirm(null);
            toast.success('Form archived successfully.');
        } catch (error) {
            console.error('Failed to archive form:', error);
            toast.error('Failed to archive form');
        }
    };

    const handlePublishToggle = async (form: EntityForm) => {
        try {
            if (form.isPublished) {
                await unpublishFormMutation.mutateAsync(form.id);
                toast.success('Form unpublished successfully.');
            } else {
                await publishFormMutation.mutateAsync(form.id);
                toast.success('Form published successfully.');
            }
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
            toast.error('Failed to update publish status');
        }
    };

    const handleDuplicate = async (form: EntityForm) => {
        try {
            const formDetail = await formsApi.getById(form.id);
            await createFormMutation.mutateAsync({
                name: `${form.name} (Copy)`,
                description: form.description || '',
                definition: formDetail.definition || '[]',
                layout: formDetail.layout,
                categoryId: form.categoryId,
                changeDescription: 'Duplicated form'
            });
            setActiveDropdown(null);
        } catch (error) {
            console.error('Failed to duplicate form:', error);
        }
    };

    const handleExport = async (id: string) => {
        try {
            const exportData = await formsApi.exportForm(id);
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `form-export-${id}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setActiveDropdown(null);
        } catch (error) {
            console.error('Failed to export form:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusBadge = (form: EntityForm) => {
        if (form.isPublished) {
            return (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                    <Globe size={12} />
                    Published
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                <Lock size={12} />
                Draft
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />

            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Forms</h1>
                        <p className="text-gray-400">Create and manage your forms</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex gap-3">
                        <Link
                            href="/forms/new"
                            className="flex items-center gap-2 px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold hover:bg-yellow-400 transition-colors"
                        >
                            <Plus size={20} />
                            Create Form
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-fcc-midnight border border-fcc-border p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-fcc-gold/10">
                            <FileText className="w-6 h-6 text-fcc-gold" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Forms</p>
                            <p className="text-2xl font-bold text-white">{forms.length}</p>
                        </div>
                    </div>
                    <div className="bg-fcc-midnight border border-fcc-border p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-500/10">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Published</p>
                            <p className="text-2xl font-bold text-white">{publishedCount}</p>
                        </div>
                    </div>
                    <div className="bg-fcc-midnight border border-fcc-border p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-yellow-500/10">
                            <Clock className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Drafts</p>
                            <p className="text-2xl font-bold text-white">{draftCount}</p>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="mb-6 space-y-4">
                    <AdvancedSearch
                        onSearch={handleSearch}
                        placeholder="Search forms by name or description..."
                        filterOptions={{
                            statuses: [
                                { value: 'published', label: 'Published' },
                                { value: 'draft', label: 'Draft' }
                            ],
                            categories: categories.map(c => ({ value: c.id, label: c.categoryName }))
                        }}
                    />

                    {/* Category Pills */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleCategoryFilter('')}
                            className={`px-4 py-2 text-sm font-medium border transition-colors ${!selectedCategory
                                ? 'bg-fcc-gold text-fcc-charcoal border-fcc-gold'
                                : 'text-gray-400 border-fcc-border hover:border-gray-500'
                                }`}
                        >
                            All Forms
                        </button>
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => handleCategoryFilter(category.id)}
                                className={`px-4 py-2 text-sm font-medium border transition-colors ${selectedCategory === category.id
                                    ? 'bg-fcc-gold text-fcc-charcoal border-fcc-gold'
                                    : 'text-gray-400 border-fcc-border hover:border-gray-500'
                                    }`}
                            >
                                {category.categoryName}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Forms List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold"></div>
                    </div>
                ) : filteredForms.length === 0 ? (
                    <div className="text-center py-12 bg-fcc-midnight border border-fcc-border">
                        <FileText className="mx-auto text-gray-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">No Forms Found</h3>
                        <p className="text-gray-400 mb-4">
                            {forms.length === 0
                                ? "Get started by creating your first form."
                                : "No forms match your current filters."}
                        </p>
                        {forms.length === 0 && (
                            <Link
                                href="/forms/new"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold hover:bg-yellow-400 transition-colors"
                            >
                                <Plus size={20} />
                                Create Your First Form
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredForms.map(form => (
                            <div
                                key={form.id}
                                className="bg-fcc-midnight border border-fcc-border hover:border-fcc-gold transition-colors"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Link
                                                    href={`/forms/edit/${form.id}`}
                                                    className="text-xl font-bold text-white hover:text-fcc-gold transition-colors"
                                                >
                                                    {form.name}
                                                </Link>
                                                {getStatusBadge(form)}
                                                <span className="text-xs text-gray-500">v{form.version}</span>
                                            </div>
                                            {form.description && (
                                                <p className="text-gray-400 mb-4">{form.description}</p>
                                            )}
                                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                                {form.categoryName && (
                                                    <span className="flex items-center gap-1">
                                                        <FolderOpen size={14} />
                                                        {form.categoryName}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    Created {formatDate(form.createdDate)}
                                                </span>
                                                {form.createdBy && (
                                                    <span className="flex items-center gap-1">
                                                        <User size={14} />
                                                        Created by owner
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {form.isPublished ? (
                                                <Link
                                                    href={`/forms/submit/${form.id}`}
                                                    className="p-2 text-gray-400 hover:text-white hover:bg-fcc-charcoal transition-colors"
                                                    title="Open Form"
                                                >
                                                    <Eye size={18} />
                                                </Link>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled
                                                    className="p-2 text-gray-600 cursor-not-allowed"
                                                    title="Publish the form to open the submission view"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            )}
                                            <Link
                                                href={`/forms/edit/${form.id}`}
                                                className="p-2 text-gray-400 hover:text-fcc-gold hover:bg-fcc-charcoal transition-colors"
                                                title="Edit Form"
                                            >
                                                <Edit size={18} />
                                            </Link>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveDropdown(activeDropdown === form.id ? null : form.id)}
                                                    className="p-2 text-gray-400 hover:text-white hover:bg-fcc-charcoal transition-colors"
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                {activeDropdown === form.id && (
                                                    <div className="absolute right-0 mt-1 w-48 bg-fcc-midnight border border-fcc-border shadow-xl z-10">
                                                        <button
                                                            onClick={() => handlePublishToggle(form)}
                                                            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-fcc-charcoal hover:text-white flex items-center gap-2"
                                                        >
                                                            {form.isPublished ? <Lock size={14} /> : <Globe size={14} />}
                                                            {form.isPublished ? 'Unpublish' : 'Publish'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDuplicate(form)}
                                                            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-fcc-charcoal hover:text-white flex items-center gap-2"
                                                        >
                                                            <Copy size={14} />
                                                            Duplicate
                                                        </button>
                                                        <button
                                                            onClick={() => handleExport(form.id)}
                                                            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-fcc-charcoal hover:text-white flex items-center gap-2"
                                                        >
                                                            <Download size={14} />
                                                            Export
                                                        </button>
                                                        <hr className="border-fcc-border" />
                                                        <button
                                                            onClick={() => {
                                                                setDeleteConfirm(form.id);
                                                                setActiveDropdown(null);
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={14} />
                                                            Archive
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Archive Confirmation Modal */}
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-fcc-midnight border border-fcc-border p-6 max-w-md w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-full bg-red-500/10">
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Archive Form</h3>
                            </div>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to archive this form? It will be removed from the active list and can be restored later.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-4 py-2 text-gray-400 border border-fcc-border hover:border-gray-500 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 transition-colors"
                                >
                                    Archive Form
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Click outside to close dropdown */}
            {activeDropdown && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setActiveDropdown(null)}
                />
            )}
        </div>
    );
}

export default function FormsPageWrapper() {
    return (
        <AuthGuard>
            <FormsPage />
        </AuthGuard>
    );
}
