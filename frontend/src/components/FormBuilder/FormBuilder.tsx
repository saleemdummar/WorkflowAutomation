'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Canvas } from './Canvas';
import { Properties } from './Properties';
import { FormPreview } from './FormPreview';
import { FormVersionHistory } from './FormVersionHistory';
import { FormElement, FormElementType, FormLayoutConfig, FormLayoutType } from '../../types/form-builder';
import { v4 as uuidv4 } from 'uuid';
import { Save, Eye, ChevronLeft, Clock, Globe, Lock, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formsApi, templatesApi, categoriesApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { getValidOperators, collectConditions, generateFieldName } from '../../lib/formConditionUtils';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';

interface FormBuilderProps {
    formId?: string;
    initialName?: string;
    initialDescription?: string;
    initialElements?: FormElement[];
    initialLayout?: { layout: FormLayoutConfig | FormLayoutType; theme: { primaryColor: string; backgroundColor: string; textColor: string } };
    isPublished?: boolean;
    onSave: (name: string, description: string, definition: string, layout: string) => Promise<void>;
    onPublish?: () => Promise<void>;
    onUnpublish?: () => Promise<void>;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
    formId,
    initialName = 'Untitled Form',
    initialDescription = '',
    initialElements = [],
    initialLayout,
    isPublished = false,
    onSave,
    onPublish,
    onUnpublish
}) => {
    const normalizeLayoutConfig = (layout?: FormLayoutConfig | FormLayoutType): FormLayoutConfig => {
        // Fix: Complex Layout Normalization Logic - simplified with clear mapping
        const getDefaultColumns = (type: FormLayoutType): number => {
            switch (type) {
                case 'grid':
                    return 3;
                case 'two-column':
                    return 2;
                case 'single-column':
                default:
                    return 1;
            }
        };

        if (!layout) {
            return {
                type: 'single-column',
                columns: 1,
                rowGap: 24,
                columnGap: 24,
                padding: 24,
                maxWidth: 900
            };
        }

        const layoutType = typeof layout === 'string' ? layout : layout.type;
        const defaultCols = getDefaultColumns(layoutType as FormLayoutType);

        return {
            type: layoutType as FormLayoutType,
            columns: typeof layout === 'object' ? (layout.columns ?? defaultCols) : defaultCols,
            rowGap: typeof layout === 'object' ? (layout.rowGap ?? 24) : 24,
            columnGap: typeof layout === 'object' ? (layout.columnGap ?? 24) : 24,
            padding: typeof layout === 'object' ? (layout.padding ?? 24) : 24,
            maxWidth: typeof layout === 'object' ? (layout.maxWidth ?? 900) : 900
        };
    };

    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const [elements, setElements] = useState<FormElement[]>(initialElements);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeElement, setActiveElement] = useState<FormElement | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [formLayout, setFormLayout] = useState<FormLayoutConfig>(normalizeLayoutConfig(initialLayout?.layout));
    const [formTheme, setFormTheme] = useState(initialLayout?.theme || { primaryColor: '#FFD700', backgroundColor: '#1a1a1a', textColor: '#ffffff' });
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isRollingBack, setIsRollingBack] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
    const [templateDetails, setTemplateDetails] = useState({
        name: '',
        category: 'General',
        isPublic: false
    });
    const [templateCategories, setTemplateCategories] = useState<string[]>(['General']);
    const [isLoadingTemplateCategories, setIsLoadingTemplateCategories] = useState(false);
    const { error, success } = useToast();
    const router = useRouter();

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Track dirty state (FB-10)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    useEffect(() => {
        const loadTemplateCategories = async () => {
            if (!isSaveAsTemplateOpen) return;
            setIsLoadingTemplateCategories(true);
            try {
                const data = await categoriesApi.getAll();
                const categoryNames = data.map((c: { categoryName: string }) => c.categoryName);
                setTemplateCategories(['General', ...categoryNames]);
            } catch (error) {
                setTemplateCategories(['General']);
            } finally {
                setIsLoadingTemplateCategories(false);
            }
        };

        loadTemplateCategories();
    }, [isSaveAsTemplateOpen]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3,
            },
        })
    );

    // Helper function to generate field name from label
    // Uses shared generateFieldName from formConditionUtils

    const validateAllConditions = (elementsToValidate: FormElement[]) => {
        const errors: string[] = [];

        elementsToValidate.forEach((element) => {
            if (!element.conditions) return;
            const conditions = collectConditions(element.conditions);
            conditions.forEach((condition) => {
                if ('logic' in condition) return;
                const field = elementsToValidate.find(el => el.id === condition.fieldId);
                if (!condition.fieldId) {
                    errors.push(`"${element.label}": Condition field is required`);
                    return;
                }
                if (!field) {
                    errors.push(`"${element.label}": Condition references missing field`);
                    return;
                }
                const validOperators = getValidOperators(field.type) as readonly string[];
                if (!validOperators.includes(condition.operator)) {
                    errors.push(`"${element.label}": Operator '${condition.operator}' invalid for ${field.type}`);
                }
                if (condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty') {
                    if (condition.value === '' || condition.value === undefined || condition.value === null) {
                        errors.push(`"${element.label}": Condition value is required`);
                    } else if (field.type === 'number' && isNaN(Number(condition.value))) {
                        errors.push(`"${element.label}": Condition value must be a number`);
                    }
                }
            });
        });

        return errors;
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === 'element') {
            setActiveElement(active.data.current.element);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveElement(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (active.data.current?.type === 'new-element') {
            const type = active.data.current.elementType as FormElementType;
            const overIndex = elements.findIndex(el => el.id === overId);
            const insertIndex = overIndex >= 0 ? overIndex : elements.length;

            const elementLabel = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            const newElement: FormElement = {
                id: uuidv4(),
                type,
                label: elementLabel,
                fieldName: generateFieldName(elementLabel),
                required: false,
                placeholder: type === 'text' || type === 'textarea' || type === 'email' ? 'Enter text...' : undefined,
                options: type === 'select' || type === 'radio' ? [
                    { Value: 'option1', Label: 'Option 1' },
                    { Value: 'option2', Label: 'Option 2' }
                ] : type === 'checkbox' ? [
                    { Value: 'option1', Label: 'Option 1' },
                    { Value: 'option2', Label: 'Option 2' }
                ] : undefined,
                multiple: type === 'select' ? false : undefined,
                validation: {},
                style: {},
                conditions: undefined
            };

            const newElements = [...elements];
            newElements.splice(insertIndex, 0, newElement);
            setElements(newElements);
            setSelectedId(newElement.id);
        } else if (active.data.current?.type === 'element') {
            const oldIndex = elements.findIndex(el => el.id === activeId);
            const newIndex = elements.findIndex(el => el.id === overId);

            if (oldIndex !== -1 && newIndex !== -1) {
                setElements(prev => arrayMove(prev, oldIndex, newIndex));
            }
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        if (activeType === 'new-element' && (overType === 'canvas' || overType === 'element')) {
            return;
        }
        if (activeType === 'element' && overType === 'element') {
            return;
        }
    };


    const handleUpdateElement = (id: string, updates: Partial<FormElement>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
        setIsDirty(true);
    };

    const handleDeleteElement = (id: string) => {
        setElements(prev => prev.filter(el => el.id !== id));
        if (selectedId === id) setSelectedId(null);
        setIsDirty(true);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const conditionErrors = validateAllConditions(elements);
            if (conditionErrors.length > 0) {
                error(`Fix conditional logic before saving: ${conditionErrors.join('; ')}`);
                return;
            }
            const definition = JSON.stringify(elements);
            const layout = JSON.stringify({ layout: formLayout, theme: formTheme });
            await onSave(name, description, definition, layout);
            setIsDirty(false);
        } catch (err) {
            error(`Failed to save form: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!onPublish) return;
        try {
            setIsPublishing(true);
            const conditionErrors = validateAllConditions(elements);
            if (conditionErrors.length > 0) {
                error(`Fix conditional logic before publishing: ${conditionErrors.join('; ')}`);
                return;
            }
            await onPublish();
        } catch (err) {
            error(`Failed to publish form: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleUnpublish = async () => {
        if (!onUnpublish) return;
        try {
            setIsPublishing(true);
            await onUnpublish();
        } catch (err) {
            error(`Failed to unpublish form: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleSaveAsTemplate = async () => {
        if (!templateDetails.name.trim()) {
            error('Template name is required');
            return;
        }

        try {
            const conditionErrors = validateAllConditions(elements);
            if (conditionErrors.length > 0) {
                error(`Fix conditional logic before saving template: ${conditionErrors.join('; ')}`);
                return;
            }
            const definition = JSON.stringify(elements);
            const layout = JSON.stringify({ layout: formLayout, theme: formTheme });
            await templatesApi.create({
                name: templateDetails.name,
                category: templateDetails.category,
                isPublic: templateDetails.isPublic,
                formDefinition: definition,
                formLayout: layout
            });
            setIsSaveAsTemplateOpen(false);
            setTemplateDetails({ name: '', category: 'General', isPublic: false });
            success('Template saved successfully!');
        } catch (err) {
            error('Failed to save template');
        }
    };

    const selectedElement = elements.find(el => el.id === selectedId) || null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
        >
            <div className="flex flex-col h-screen bg-fcc-charcoal text-white font-sans">
                <header className="min-h-14 bg-fcc-midnight border-b border-fcc-border flex flex-wrap items-center justify-between px-3 sm:px-6 py-2 gap-2">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 hover:bg-fcc-charcoal transition-colors border border-transparent hover:border-fcc-border text-gray-400 hover:text-white"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="h-6 w-px bg-fcc-border mx-2 hidden sm:block" />
                        <div className="flex flex-col">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-transparent border-none text-lg font-black tracking-tighter uppercase focus:outline-none focus:text-fcc-gold w-40 sm:w-64"
                                placeholder="Form Name"
                            />
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-transparent border-none text-sm text-gray-300 focus:outline-none focus:text-fcc-gold w-40 sm:w-64 mt-1"
                                placeholder="Form Description (optional)"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:space-x-3">
                        <button
                            onClick={() => setIsHistoryOpen(true)}
                            className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-sm font-bold border border-white hover:text-fcc-charcoal transition-all"
                        >
                            <Clock size={16} />
                            <span className="hidden sm:inline">History</span>
                        </button>
                        <button
                            onClick={() => setIsPreviewOpen(true)}
                            className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-sm font-bold border border-white hover:bg-white hover:text-fcc-charcoal transition-all"
                        >
                            <Eye size={16} />
                            <span className="hidden sm:inline">Preview</span>
                        </button>
                        <button
                            onClick={() => setIsSaveAsTemplateOpen(true)}
                            className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-sm font-bold border border-white hover:bg-white hover:text-fcc-charcoal transition-all"
                        >
                            <FileText size={16} />
                            <span className="hidden md:inline">Save as Template</span>
                        </button>
                        {formId && onPublish && onUnpublish && (
                            <button
                                onClick={isPublished ? handleUnpublish : handlePublish}
                                disabled={isPublishing}
                                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 text-sm font-bold border transition-all disabled:opacity-50 ${isPublished
                                    ? 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white'
                                    : 'border-green-500 text-green-500 hover:bg-green-500 hover:text-white'
                                    }`}
                            >
                                {isPublished ? <Lock size={16} /> : <Globe size={16} />}
                                <span className="hidden sm:inline">{isPublishing ? 'Processing...' : (isPublished ? 'Unpublish' : 'Publish')}</span>
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-sm font-bold bg-fcc-gold text-fcc-charcoal hover:bg-yellow-400 disabled:opacity-50 transition-all border-b-2 border-fcc-midnight active:border-b-0 active:mt-0.5"
                        >
                            <Save size={16} />
                            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Form'}</span>
                        </button>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    <Sidebar />
                    <SortableContext items={elements.map(el => el.id)} strategy={verticalListSortingStrategy}>
                        <Canvas
                            elements={elements}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onDelete={handleDeleteElement}
                        />
                    </SortableContext>
                    <Properties
                        element={selectedElement}
                        elements={elements}
                        onChange={handleUpdateElement}
                        formLayout={formLayout}
                        onFormLayoutChange={setFormLayout}
                        formTheme={formTheme}
                        onFormThemeChange={setFormTheme}
                    />
                </div>
            </div>
            {isClient && createPortal(
                <DragOverlay>
                    {activeElement ? (
                        <div className="bg-fcc-midnight border border-fcc-gold p-4 rounded opacity-90">
                            <div className="text-white font-bold">{activeElement.label}</div>
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}

            <FormPreview
                elements={elements}
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                formName={name}
                formTheme={formTheme}
                formLayout={formLayout}
            />

            <FormVersionHistory
                formId={formId || ''}
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onRevert={async (version) => {
                    setIsRollingBack(true);
                    try {
                        const updatedForm = await formsApi.rollbackVersion(formId || '', version.versionNumber);
                        const revertedElements = JSON.parse(updatedForm.definition || version.formDefinitionJson || '[]');
                        setElements(revertedElements);

                        if (updatedForm.layout) {
                            const parsedLayout = JSON.parse(updatedForm.layout);
                            setFormLayout(normalizeLayoutConfig(parsedLayout.layout));
                            setFormTheme(parsedLayout.theme || formTheme);
                        }

                        setIsHistoryOpen(false);
                    } catch (err: unknown) {
                        const errorMessage =
                            err && typeof err === 'object' && 'response' in err
                                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                                : undefined;
                        error(errorMessage || 'Failed to rollback form version. Please try again.');
                    } finally {
                        setIsRollingBack(false);
                    }
                }}
            />
            {isSaveAsTemplateOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-fcc-midnight border border-fcc-border p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Save as Template</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white uppercase mb-2">Template Name</label>
                                <input
                                    type="text"
                                    value={templateDetails.name}
                                    onChange={(e) => setTemplateDetails(prev => ({ ...prev, name: e.target.value }))}
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
                                    {isLoadingTemplateCategories && (
                                        <option value="">Loading categories...</option>
                                    )}
                                    {!isLoadingTemplateCategories && templateCategories.map((category) => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="templatePublic"
                                    checked={templateDetails.isPublic}
                                    onChange={(e) => setTemplateDetails(prev => ({ ...prev, isPublic: e.target.checked }))}
                                    className="text-fcc-gold focus:ring-fcc-gold"
                                />
                                <label htmlFor="templatePublic" className="text-sm text-white">Make this template public</label>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setIsSaveAsTemplateOpen(false)}
                                className="px-4 py-2 text-sm font-bold border border-white hover:bg-white hover:text-fcc-charcoal transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAsTemplate}
                                className="px-4 py-2 bg-fcc-gold text-fcc-charcoal hover:bg-yellow-400 transition-all font-bold"
                            >
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isRollingBack && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
                    <div className="bg-fcc-midnight border border-fcc-gold p-8 rounded-lg shadow-xl">
                        <div className="flex items-center space-x-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fcc-gold"></div>
                            <div>
                                <p className="text-white font-bold text-lg">Rolling back version...</p>
                                <p className="text-gray-400 text-sm">Please wait while we restore the previous version</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DndContext>
    );
};
