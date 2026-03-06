'use client';

import React, { useState } from 'react';
import { FormElement, FormLayoutConfig } from '../../types/form-builder';
import { FieldConfigurator } from './FieldConfigurator';
import { ConditionBuilder } from './ConditionBuilder';
import { LayoutDesigner } from './LayoutDesigner';
import { StyleEditor } from './StyleEditor';
import { Plus, X } from 'lucide-react';

interface PropertiesProps {
    element: FormElement | null;
    elements: FormElement[];
    onChange: (id: string, updates: Partial<FormElement>) => void;
    formLayout?: FormLayoutConfig;
    onFormLayoutChange?: (layout: FormLayoutConfig) => void;
    formTheme?: { primaryColor: string; backgroundColor: string; textColor: string };
    onFormThemeChange?: (theme: { primaryColor: string; backgroundColor: string; textColor: string }) => void;
}

export const Properties: React.FC<PropertiesProps> = ({
    element,
    elements,
    onChange,
    formLayout = { type: 'single-column' },
    onFormLayoutChange,
    formTheme = { primaryColor: '#FFD700', backgroundColor: '#1a1a1a', textColor: '#ffffff' },
    onFormThemeChange
}) => {
    const [activeTab, setActiveTab] = useState<'form' | 'element'>('element');

    if (!element) {
        return (
            <aside className="hidden md:block w-60 lg:w-80 bg-fcc-midnight border-l border-fcc-border p-4 lg:p-6 overflow-y-auto shrink-0">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Form Properties</h3>

                <div className="space-y-6">
                    {onFormLayoutChange && (
                        <LayoutDesigner
                            layout={formLayout}
                            onLayoutChange={onFormLayoutChange}
                        />
                    )}

                    {onFormThemeChange && (
                        <StyleEditor
                            theme={formTheme}
                            onThemeChange={onFormThemeChange}
                        />
                    )}
                </div>
            </aside>
        );
    }

    return (
        <aside className="hidden md:block w-60 lg:w-80 bg-fcc-midnight border-l border-fcc-border p-4 lg:p-6 overflow-y-auto shrink-0">
            <div className="flex space-x-1 mb-6">
                <button
                    onClick={() => setActiveTab('element')}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'element' ? 'text-fcc-gold border-b border-fcc-gold' : 'text-gray-500 hover:text-gray-400'
                        }`}
                >
                    Element
                </button>
                <button
                    onClick={() => setActiveTab('form')}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'form' ? 'text-fcc-gold border-b border-fcc-gold' : 'text-gray-500 hover:text-gray-400'
                        }`}
                >
                    Form
                </button>
            </div>

            {activeTab === 'element' ? (
                <>
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Element Properties</h3>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-2">Label</label>
                            <input
                                type="text"
                                value={element.label}
                                onChange={(e) => onChange(element.id, { label: e.target.value })}
                                className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white text-sm focus:border-fcc-gold outline-none"
                            />
                        </div>

                        {['text', 'number', 'textarea'].includes(element.type) && (
                            <div>
                                <label className="block text-xs font-bold text-white uppercase mb-2">Placeholder</label>
                                <input
                                    type="text"
                                    value={element.placeholder || ''}
                                    onChange={(e) => onChange(element.id, { placeholder: e.target.value })}
                                    className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white text-sm focus:border-fcc-gold outline-none"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-white uppercase">Required</label>
                            <button
                                onClick={() => onChange(element.id, { required: !element.required })}
                                className={`w-10 h-5 px-1 flex items-center transition-colors ${element.required ? 'bg-fcc-gold' : 'bg-gray-700'}`}
                            >
                                <div className={`w-3 h-3 bg-white transition-transform ${element.required ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>

                        {element.type === 'select' && (
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-white uppercase">Allow Multiple</label>
                                <button
                                    onClick={() => onChange(element.id, { multiple: !element.multiple })}
                                    className={`w-10 h-5 px-1 flex items-center transition-colors ${element.multiple ? 'bg-fcc-gold' : 'bg-gray-700'}`}
                                >
                                    <div className={`w-3 h-3 bg-white transition-transform ${element.multiple ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>
                        )}

                        {['select', 'radio', 'checkbox'].includes(element.type) && (
                            <div>
                                <label className="block text-xs font-bold text-white uppercase mb-2">Options</label>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {element.options?.map((opt, idx) => {
                                        const optionValue = typeof opt === 'string' ? opt : (opt.Value ?? opt.Label ?? '');
                                        const optionLabel = typeof opt === 'string' ? opt : (opt.Label ?? opt.Value ?? '');
                                        return (
                                            <div key={idx} className="flex items-center space-x-2">
                                                <input
                                                    type="text"
                                                    value={optionLabel}
                                                    onChange={(e) => {
                                                        const newOptions = [...(element.options || [])];
                                                        const currentOpt = newOptions[idx];
                                                        if (typeof currentOpt === 'string') {
                                                            newOptions[idx] = { Value: e.target.value, Label: e.target.value };
                                                        } else {
                                                            newOptions[idx] = { ...currentOpt, Label: e.target.value, Value: currentOpt.Value || e.target.value };
                                                        }
                                                        onChange(element.id, { options: newOptions });
                                                    }}
                                                    className="flex-1 bg-fcc-charcoal border border-fcc-border px-2 py-1 text-white text-sm focus:border-fcc-gold outline-none"
                                                    placeholder="Label"
                                                />
                                                <input
                                                    type="text"
                                                    value={optionValue}
                                                    onChange={(e) => {
                                                        const newOptions = [...(element.options || [])];
                                                        const currentOpt = newOptions[idx];
                                                        if (typeof currentOpt === 'string') {
                                                            newOptions[idx] = { Value: e.target.value, Label: e.target.value };
                                                        } else {
                                                            newOptions[idx] = { ...currentOpt, Value: e.target.value };
                                                        }
                                                        onChange(element.id, { options: newOptions });
                                                    }}
                                                    className="w-24 bg-fcc-charcoal border border-fcc-border px-2 py-1 text-white text-sm focus:border-fcc-gold outline-none"
                                                    placeholder="Value"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newOptions = (element.options || []).filter((_, i) => i !== idx);
                                                        onChange(element.id, { options: newOptions });
                                                    }}
                                                    className="text-red-400 hover:text-red-300 p-1"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => {
                                        const newOption = { Value: `option${(element.options?.length || 0) + 1}`, Label: `Option ${(element.options?.length || 0) + 1}` };
                                        onChange(element.id, { options: [...(element.options || []), newOption] });
                                    }}
                                    className="mt-2 flex items-center space-x-1 text-xs text-fcc-gold hover:text-white"
                                >
                                    <Plus size={14} />
                                    <span>Add Option</span>
                                </button>
                            </div>
                        )}

                        <FieldConfigurator
                            element={element}
                            elements={elements}
                            onElementChange={(updates) => onChange(element.id, updates)}
                        />

                        <ConditionBuilder
                            elements={elements}
                            conditions={element.conditions}
                            onConditionsChange={(conditions) => onChange(element.id, { conditions })}
                            currentElementId={element.id}
                        />
                    </div>
                </>
            ) : (
                <>
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Form Properties</h3>

                    <div className="space-y-6">
                        {onFormLayoutChange && (
                            <LayoutDesigner
                                layout={formLayout}
                                onLayoutChange={onFormLayoutChange}
                            />
                        )}

                        {onFormThemeChange && (
                            <StyleEditor
                                theme={formTheme}
                                onThemeChange={onFormThemeChange}
                            />
                        )}
                    </div>
                </>
            )}
        </aside>
    );
};
