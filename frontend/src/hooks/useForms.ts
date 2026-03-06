'use client';

import { useState, useEffect, useCallback } from 'react';
import { formsApi, categoriesApi } from '@/lib/api';
import { Form as EntityForm } from '@/types/entities';
import { useToast } from '@/contexts/ToastContext';
import type { SearchFilters } from '@/components/AdvancedSearch';

interface Category {
    id: string;
    categoryName: string;
}

export function useForms() {
    const toast = useToast();
    const [forms, setForms] = useState<EntityForm[]>([]);
    const [filteredForms, setFilteredForms] = useState<EntityForm[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [formsData, categoriesData] = await Promise.all([
                formsApi.getAll(),
                categoriesApi.getAll()
            ]);
            setForms(formsData);
            setFilteredForms(formsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Failed to load forms:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSearch = useCallback((query: string, filters: SearchFilters) => {
        let results = [...forms];

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
            if (filters.status === 'published') {
                results = results.filter(form => form.isPublished);
            } else if (filters.status === 'draft') {
                results = results.filter(form => !form.isPublished);
            }
        }

        if (filters.dateFrom) {
            results = results.filter(form => new Date(form.createdDate) >= new Date(filters.dateFrom!));
        }
        if (filters.dateTo) {
            results = results.filter(form => new Date(form.createdDate) <= new Date(filters.dateTo!));
        }

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

        setFilteredForms(results);
    }, [forms]);

    const handleCategoryFilter = (categoryId: string) => {
        setSelectedCategory(categoryId);
        if (categoryId) {
            setFilteredForms(forms.filter(form => form.categoryId === categoryId));
        } else {
            setFilteredForms(forms);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await formsApi.delete(id);
            await loadData();
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Failed to delete form:', error);
            toast.error('Failed to delete form');
        }
    };

    const handlePublishToggle = async (form: EntityForm) => {
        try {
            if (form.isPublished) {
                await formsApi.unpublish(form.id);
            } else {
                await formsApi.publish(form.id);
            }
            await loadData();
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
        }
    };

    const handleDuplicate = async (form: EntityForm) => {
        try {
            const formDetail = await formsApi.getById(form.id);
            await formsApi.create({
                name: `${form.name} (Copy)`,
                description: form.description || '',
                definition: formDetail.definition || '[]',
                layout: formDetail.layout,
                categoryId: form.categoryId,
                changeDescription: 'Duplicated form'
            });
            await loadData();
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

    const publishedCount = forms.filter(f => f.isPublished).length;
    const draftCount = forms.filter(f => !f.isPublished).length;

    return {
        forms,
        filteredForms,
        categories,
        loading,
        selectedCategory,
        activeDropdown,
        setActiveDropdown,
        deleteConfirm,
        setDeleteConfirm,
        publishedCount,
        draftCount,
        handleSearch,
        handleCategoryFilter,
        handleDelete,
        handlePublishToggle,
        handleDuplicate,
        handleExport,
    };
}
