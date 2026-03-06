'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { categoriesApi } from '../../../../lib/api';
import { ChevronLeft, Save } from 'lucide-react';
import { AuthGuard } from '../../../../components/AuthGuard';
import { useToast } from '../../../../contexts/ToastContext';

interface Category {
    id: string;
    categoryName: string;
    parentCategoryId?: string;
    description?: string;
    displayOrder: number;
}

const EditCategoryPage: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const toast = useToast();
    const categoryId = params.id as string;
    const [formData, setFormData] = useState({
        categoryName: '',
        parentCategoryId: '',
        description: '',
        displayOrder: 0
    });
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadCategory();
        loadCategories();
    }, [categoryId]);

    const loadCategory = async () => {
        setIsLoading(true);
        try {
            const data = await categoriesApi.getAll();
            const category = data.find((c: Category) => c.id === categoryId);
            if (category) {
                setFormData({
                    categoryName: category.categoryName,
                    parentCategoryId: category.parentCategoryId || '',
                    description: category.description || '',
                    displayOrder: category.displayOrder
                });
            }
        } catch (error) {
            console.error('Failed to load category:', error);
            toast.error('Failed to load category');
        } finally {
            setIsLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const data = await categoriesApi.getAll();
            setCategories(data.filter((c: Category) => c.id !== categoryId));
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await categoriesApi.update(categoryId, {
                categoryName: formData.categoryName,
                parentCategoryId: formData.parentCategoryId || undefined,
                description: formData.description || undefined,
                displayOrder: formData.displayOrder
            });
            router.push('/categories');
        } catch (error) {
            console.error('Failed to update category:', error);
            toast.error('Failed to update category');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'displayOrder' ? Number(value) : value
        }));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-fcc-charcoal flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold"></div>
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
                                onClick={() => router.push('/categories')}
                                className="p-2 hover:bg-fcc-charcoal transition-colors border border-transparent hover:border-fcc-border text-gray-400 hover:text-white"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <h1 className="text-xl font-bold text-white">Edit Category</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-fcc-midnight border border-fcc-border p-6 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-2">Category Name</label>
                            <input
                                type="text"
                                name="categoryName"
                                value={formData.categoryName}
                                onChange={handleChange}
                                required
                                className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white focus:border-fcc-gold outline-none"
                                placeholder="Enter category name"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-2">Parent Category (Optional)</label>
                            <select
                                name="parentCategoryId"
                                value={formData.parentCategoryId}
                                onChange={handleChange}
                                className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white focus:border-fcc-gold outline-none"
                            >
                                <option value="">No parent category</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>{category.categoryName}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-2">Description (Optional)</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white focus:border-fcc-gold outline-none resize-none"
                                placeholder="Enter category description"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-2">Display Order</label>
                            <input
                                type="number"
                                name="displayOrder"
                                value={formData.displayOrder}
                                onChange={handleChange}
                                className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white focus:border-fcc-gold outline-none"
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => router.push('/categories')}
                                className="px-4 py-2 text-sm font-bold border border-white hover:bg-white hover:text-fcc-charcoal transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center space-x-2 px-4 py-2 bg-fcc-gold text-fcc-charcoal hover:bg-yellow-400 disabled:opacity-50 transition-all font-bold"
                            >
                                <Save size={16} />
                                <span>{isSaving ? 'Updating...' : 'Update Category'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default function EditCategoryPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'form-designer']}>
            <EditCategoryPage />
        </AuthGuard>
    );
}