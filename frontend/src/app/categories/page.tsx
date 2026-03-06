'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { categoriesApi } from '../../lib/api';
import { MainNavigation } from '../../components/MainNavigation';
import { ChevronLeft, Plus, Folder, Edit, Trash2, ArrowRight, FileText, ArrowUp, ArrowDown } from 'lucide-react';
import { AuthGuard } from '../../components/AuthGuard';
import { useToast } from '../../contexts/ToastContext';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import type { FormCategory } from '../../types/entities';

const CategoriesPage: React.FC = () => {
    const router = useRouter();
    const [categories, setCategories] = useState<FormCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const toast = useToast();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const data = await categoriesApi.getRoot();
            setCategories(data);
        } catch (error) {
            console.error('Failed to load categories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const moveCategoryInTree = (list: FormCategory[], categoryId: string, direction: 'up' | 'down'): FormCategory[] => {
        const index = list.findIndex(c => c.id === categoryId);
        if (index !== -1) {
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= list.length) return list;
            const newList = [...list];
            [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
            return newList;
        }

        return list.map(category => {
            if (category.subCategories && category.subCategories.length > 0) {
                return {
                    ...category,
                    subCategories: moveCategoryInTree(category.subCategories, categoryId, direction)
                };
            }
            return category;
        });
    };

    const handleMoveCategory = (categoryId: string, direction: 'up' | 'down') => {
        setCategories(prev => moveCategoryInTree(prev, categoryId, direction));
    };

    const buildReorderList = (list: FormCategory[], result: { categoryId: string; newDisplayOrder: number }[]) => {
        list.forEach((category, index) => {
            result.push({ categoryId: category.id, newDisplayOrder: index });
            if (category.subCategories && category.subCategories.length > 0) {
                buildReorderList(category.subCategories, result);
            }
        });
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        try {
            const reorderList: { categoryId: string; newDisplayOrder: number }[] = [];
            buildReorderList(categories, reorderList);
            await categoriesApi.reorder(reorderList);
            await loadCategories();
            setIsReorderMode(false);
        } catch (error) {
            console.error('Failed to reorder categories:', error);
            toast.error('Failed to save category order');
        } finally {
            setIsSavingOrder(false);
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (await confirmAction({ message: 'Are you sure you want to delete this category?' })) {
            try {
                await categoriesApi.delete(categoryId);
                loadCategories();
            } catch (error) {
                console.error('Failed to delete category:', error);
                toast.error('Failed to delete category');
            }
        }
    };

    const renderCategoryTree = (category: FormCategory, level = 0, index = 0, siblingsCount = 1) => (
        <div key={category.id} className={`${level > 0 ? 'ml-6 border-l border-fcc-border pl-4' : ''}`}>
            <div className="bg-fcc-charcoal border border-fcc-border p-4 hover:border-fcc-gold transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Folder size={20} className="text-fcc-gold" />
                        <div>
                            <h3 className="text-lg font-bold text-white">{category.categoryName}</h3>
                            {category.description && (
                                <p className="text-sm text-gray-400">{category.description}</p>
                            )}
                            <p className="text-xs text-gray-500">
                                {category.formsCount ?? category.formCount} forms{category.createdDate ? ` • Created ${new Date(category.createdDate).toLocaleDateString()}` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {isReorderMode && (
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={() => handleMoveCategory(category.id, 'up')}
                                    disabled={index === 0}
                                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                                    title="Move up"
                                >
                                    <ArrowUp size={16} />
                                </button>
                                <button
                                    onClick={() => handleMoveCategory(category.id, 'down')}
                                    disabled={index === siblingsCount - 1}
                                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                                    title="Move down"
                                >
                                    <ArrowDown size={16} />
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => router.push(`/?category=${category.id}`)}
                            className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                            title="View forms in this category"
                        >
                            <FileText size={16} />
                        </button>
                        <button
                            onClick={() => router.push(`/categories/edit/${category.id}`)}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                            title="Edit category"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            title="Delete category"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
            {category.subCategories && category.subCategories.length > 0 && (
                <div className="mt-2">
                    {category.subCategories.map((sub, subIndex) => renderCategoryTree(sub, level + 1, subIndex, category.subCategories!.length))}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />

            <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Form Categories</h1>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setIsReorderMode(prev => !prev)}
                            className="px-4 py-2 text-sm font-bold border border-white hover:bg-white hover:text-fcc-charcoal transition-all"
                        >
                            {isReorderMode ? 'Cancel Reorder' : 'Reorder'}
                        </button>
                        {isReorderMode && (
                            <button
                                onClick={handleSaveOrder}
                                disabled={isSavingOrder}
                                className="px-4 py-2 text-sm font-bold bg-fcc-gold text-fcc-charcoal hover:bg-yellow-400 transition-colors disabled:opacity-50"
                            >
                                {isSavingOrder ? 'Saving...' : 'Save Order'}
                            </button>
                        )}
                        <button
                            onClick={() => router.push('/categories/new')}
                            className="flex items-center space-x-2 px-4 py-2 bg-fcc-gold text-fcc-charcoal hover:bg-yellow-400 transition-colors font-bold"
                        >
                            <Plus size={16} />
                            <span>New Category</span>
                        </button>
                    </div>
                </div>

                <div className="bg-fcc-midnight border border-fcc-border p-6 shadow-2xl">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold"></div>
                            <span className="ml-2 text-gray-400">Loading categories...</span>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-12">
                            <Folder size={48} className="mx-auto mb-4 text-gray-500" />
                            <h3 className="text-xl font-semibold text-white mb-2">No categories found</h3>
                            <p className="text-gray-400 mb-6">
                                Create your first category to organize your forms.
                            </p>
                            <button
                                onClick={() => router.push('/categories/new')}
                                className="inline-flex items-center px-4 py-2 bg-fcc-gold text-fcc-charcoal hover:bg-yellow-400 transition-colors font-bold"
                            >
                                <Plus size={16} className="mr-2" />
                                Create Category
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-gray-400 mb-6">Organize your forms into hierarchical categories</p>
                            {categories.map((category, index) => renderCategoryTree(category, 0, index, categories.length))}
                        </div>
                    )}
                </div>
            </main>
            <ConfirmDialog />
        </div>
    );
};

export default function CategoriesPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'form-designer']}>
            <CategoriesPage />
        </AuthGuard>
    );
}