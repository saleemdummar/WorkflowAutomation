'use client';

import React from 'react';
import { FormElement } from '../../types/form-builder';
import { Trash2, Settings, GripVertical, ChevronDown, Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CanvasProps {
    elements: FormElement[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
}

interface SortableItemProps {
    element: FormElement;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
}

const SortableItemInner: React.FC<SortableItemProps> = ({ element, isSelected, onSelect, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: element.id, data: { type: 'element', element } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`relative p-4 border transition-all cursor-pointer group ${isSelected
                ? 'border-fcc-gold bg-fcc-charcoal shadow-[0_0_15px_rgba(255,215,0,0.1)]'
                : 'border-fcc-border bg-fcc-midnight hover:border-gray-500'
                } ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-gray-700" />

            <div className="flex justify-between items-start mb-2">
                <label className="text-sm font-black text-white uppercase tracking-tighter">
                    {element.label} {element.required && <span className="text-fcc-gold">*</span>}
                </label>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        {...listeners}
                        className="p-1 text-gray-400 hover:text-white cursor-grab"
                    >
                        <GripVertical size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelect(element.id); }}
                        className="p-1 text-gray-400 hover:text-white"
                    >
                        <Settings size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}
                        className="p-1 text-gray-400 hover:text-red-500"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="pointer-events-none">
                {element.type === 'text' && (
                    <input type="text" placeholder={element.placeholder} className="w-full bg-fcc-midnight border border-fcc-border px-3 py-2 text-white text-sm" />
                )}
                {element.type === 'textarea' && (
                    <textarea placeholder={element.placeholder} className="w-full bg-fcc-midnight border border-fcc-border px-3 py-2 text-white text-sm h-20" />
                )}
                {element.type === 'number' && (
                    <input type="number" placeholder={element.placeholder} className="w-full bg-fcc-midnight border border-fcc-border px-3 py-2 text-white text-sm" />
                )}
                {element.type === 'email' && (
                    <input type="email" placeholder={element.placeholder} className="w-full bg-fcc-midnight border border-fcc-border px-3 py-2 text-white text-sm" />
                )}
                {element.type === 'phone' && (
                    <input type="tel" placeholder={element.placeholder} className="w-full bg-fcc-midnight border border-fcc-border px-3 py-2 text-white text-sm" />
                )}
                {element.type === 'date' && (
                    <input type="date" className="w-full bg-fcc-midnight border border-fcc-border px-3 py-2 text-white text-sm" />
                )}
                {element.type === 'file' && (
                    <input type="file" className="w-full bg-fcc-midnight border border-fcc-border px-3 py-2 text-gray-400 text-sm" />
                )}
                {element.type === 'richtext' && (
                    <textarea placeholder={element.placeholder} className="w-full bg-fcc-midnight border border-fcc-border px-3 py-2 text-white text-sm h-20" />
                )}
                {element.type === 'rating' && (
                    <div className="flex space-x-1">
                        {Array.from({ length: element.validation?.max ?? 5 }, (_, i) => i + 1).map(star => (
                            <span key={star} className="text-yellow-400">★</span>
                        ))}
                    </div>
                )}
                {element.type === 'signature' && (
                    <div className="w-full h-20 bg-fcc-midnight border-2 border-dashed border-fcc-border rounded flex items-center justify-center gap-2 text-gray-400 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                        Signature Pad
                    </div>
                )}
                {element.type === 'select' && (
                    <div className="w-full bg-fcc-midnight border border-fcc-border px-3 py-2 text-gray-400 text-sm flex justify-between items-center">
                        <span>Select an option...</span>
                        <ChevronDown size={14} />
                    </div>
                )}
                {(element.type === 'radio' || element.type === 'checkbox') && (
                    <div className="space-y-1">
                        {(element.options || []).map((opt, i) => (
                            <div key={i} className="flex items-center space-x-2 text-sm text-gray-400">
                                <div className={`w-4 h-4 border border-fcc-border ${element.type === 'radio' ? 'rounded-full' : ''}`} />
                                <span>{typeof opt === 'string' ? opt : opt.Label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Memoize to avoid unnecessary re-renders when sibling elements change (FB-01)
const SortableItem = React.memo(SortableItemInner);

export const Canvas: React.FC<CanvasProps> = ({
    elements,
    selectedId,
    onSelect,
    onDelete
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'canvas',
        data: { type: 'canvas' }
    });

    return (
        <div className="flex-1 bg-fcc-charcoal p-8 overflow-y-auto">
            <div
                ref={setNodeRef}
                className={`max-w-2xl mx-auto min-h-full bg-fcc-midnight border-2 border-dashed p-6 space-y-4 transition-colors ${isOver ? 'border-fcc-gold bg-fcc-charcoal' : 'border-fcc-border'
                    }`}
            >
                {elements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="mb-4 p-4 rounded-full bg-fcc-charcoal">
                            <Plus size={48} className="text-fcc-gold" />
                        </div>
                        <p className="text-lg font-bold text-white mb-2">No fields added yet</p>
                        <p className="text-sm text-gray-400 mb-4">Drag and drop elements from the sidebar to start building your form</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="px-2 py-1 bg-fcc-charcoal rounded">📝 Text</span>
                            <span className="px-2 py-1 bg-fcc-charcoal rounded">📋 Select</span>
                            <span className="px-2 py-1 bg-fcc-charcoal rounded">📅 Date</span>
                            <span className="px-2 py-1 bg-fcc-charcoal rounded">✅ Checkbox</span>
                        </div>
                    </div>
                ) : (
                    elements.map((el) => (
                        <SortableItem
                            key={el.id}
                            element={el}
                            isSelected={selectedId === el.id}
                            onSelect={onSelect}
                            onDelete={onDelete}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
