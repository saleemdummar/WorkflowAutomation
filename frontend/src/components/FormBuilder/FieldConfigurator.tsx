'use client';

import React, { useState, useMemo } from 'react';
import { FormElement, ValidationRules, ElementStyle, CalculationRule } from '../../types/form-builder';
import { Settings, Palette } from 'lucide-react';
import { expressionApi } from '../../lib/api';
import { generateFieldName } from '../../lib/formConditionUtils';

interface FieldConfiguratorProps {
    element: FormElement;
    elements: FormElement[];
    onElementChange: (updates: Partial<FormElement>) => void;
}

export const FieldConfigurator: React.FC<FieldConfiguratorProps> = ({
    element,
    elements,
    onElementChange
}) => {
    const [testResult, setTestResult] = useState<string | null>(null);
    const [testError, setTestError] = useState<string | null>(null);

    const availableVariables = useMemo(() => {
        return elements
            .map(e => e.fieldName || generateFieldName(e.label))
            .filter(name => name);
    }, [elements]);

    const testExpression = async () => {
        if (!element.calculation?.Expression) return;
        setTestResult(null);
        setTestError(null);
        try {
            // Use type-aware sample values based on field types (fixes FB-05)
            const sampleVariables: Record<string, unknown> = {};
            elements.forEach(el => {
                const varName = el.fieldName || generateFieldName(el.label);
                if (!varName) return;
                switch (el.type) {
                    case 'number': sampleVariables[varName] = 10; break;
                    case 'date': sampleVariables[varName] = '2024-01-15'; break;
                    case 'checkbox': sampleVariables[varName] = ['option1']; break;
                    case 'text': case 'textarea': case 'email': sampleVariables[varName] = 'sample'; break;
                    case 'rating': sampleVariables[varName] = 3; break;
                    default: sampleVariables[varName] = 'test'; break;
                }
            });
            const response = await expressionApi.evaluate(element.calculation.Expression, sampleVariables);
            setTestResult(JSON.stringify(response.result));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setTestError(error.response?.data?.error || error.message);
        }
    };
    const updateValidation = (validationUpdates: Partial<ValidationRules>) => {
        const newValidation = { ...element.validation, ...validationUpdates };
        onElementChange({ validation: newValidation });
    };

    const updateStyle = (styleUpdates: Partial<ElementStyle>) => {
        const newStyle = { ...element.style, ...styleUpdates };
        onElementChange({ style: newStyle });
    };

    const updateCalculation = (calculationUpdates: Partial<CalculationRule>) => {
        const newCalculation = { ...element.calculation, ...calculationUpdates } as CalculationRule;
        onElementChange({ calculation: newCalculation });
    };

    const renderValidationFields = () => {
        switch (element.type) {
            case 'text':
            case 'textarea':
            case 'email':
                return (
                    <>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Min Length</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={element.validation?.minLength ?? ''}
                                    onChange={(e) => updateValidation({ minLength: e.target.value ? Number(e.target.value) : undefined })}
                                    className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Max Length</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={element.validation?.maxLength ?? ''}
                                    onChange={(e) => updateValidation({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
                                    className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                    placeholder="255"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Pattern (Regex)</label>
                            <input
                                type="text"
                                value={element.validation?.pattern || ''}
                                onChange={(e) => updateValidation({ pattern: e.target.value })}
                                className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                placeholder="e.g., ^[A-Za-z]+$"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Custom Error Message</label>
                            <input
                                type="text"
                                value={element.validation?.customMessage || ''}
                                onChange={(e) => updateValidation({ customMessage: e.target.value })}
                                className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                placeholder="Custom validation message"
                            />
                        </div>
                    </>
                );
            case 'date':
                return (
                    <>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Min Date</label>
                                <input
                                    type="date"
                                    value={element.validation?.minDate || ''}
                                    onChange={(e) => updateValidation({ minDate: e.target.value || undefined })}
                                    className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Max Date</label>
                                <input
                                    type="date"
                                    value={element.validation?.maxDate || ''}
                                    onChange={(e) => updateValidation({ maxDate: e.target.value || undefined })}
                                    className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                />
                            </div>
                        </div>
                    </>
                );
            case 'number':
                return (
                    <>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Min</label>
                                <input
                                    type="number"
                                    value={element.validation?.min || ''}
                                    onChange={(e) => updateValidation({ min: Number(e.target.value) || undefined })}
                                    className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Max</label>
                                <input
                                    type="number"
                                    value={element.validation?.max || ''}
                                    onChange={(e) => updateValidation({ max: Number(e.target.value) || undefined })}
                                    className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                />
                            </div>
                        </div>
                    </>
                );
            case 'file':
                return (
                    <>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Allowed File Types</label>
                            <input
                                type="text"
                                value={element.validation?.FileTypes?.join(', ') || ''}
                                onChange={(e) => updateValidation({ FileTypes: e.target.value.split(',').map(s => s.trim()) })}
                                className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                placeholder="pdf, jpg, png"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Max File Size (MB)</label>
                            <input
                                type="number"
                                value={element.validation?.MaxSize || ''}
                                onChange={(e) => updateValidation({ MaxSize: Number(e.target.value) || undefined })}
                                className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                            />
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Settings size={16} className="text-fcc-gold" />
                <h4 className="text-sm font-bold text-white">Field Configuration</h4>
            </div>

            <div className="space-y-3">
                {renderValidationFields()}

                <div className="pt-2 border-t border-fcc-border">
                    <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400">Calculated Field</label>
                        <input
                            type="checkbox"
                            checked={!!element.calculation}
                            onChange={(e) => onElementChange({ calculation: e.target.checked ? { Expression: '', OutputType: 'number' } : undefined })}
                            className="text-fcc-gold focus:ring-fcc-gold"
                        />
                    </div>

                    {element.calculation && (
                        <div className="mt-2 space-y-2">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Available Variables</label>
                                <div className="text-xs text-gray-300 bg-fcc-charcoal p-2 rounded max-h-20 overflow-y-auto">
                                    {availableVariables.length > 0 ? availableVariables.join(', ') : 'No other fields available'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Expression</label>
                                <input
                                    type="text"
                                    value={element.calculation.Expression || ''}
                                    onChange={(e) => updateCalculation({ Expression: e.target.value })}
                                    className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                    placeholder="e.g., quantity * price"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Output Type</label>
                                <select
                                    value={element.calculation.OutputType || 'number'}
                                    onChange={(e) => updateCalculation({ OutputType: e.target.value as CalculationRule['OutputType'] })}
                                    className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                >
                                    <option value="number">number</option>
                                    <option value="string">string</option>
                                    <option value="boolean">boolean</option>
                                </select>
                            </div>
                            <div>
                                <button
                                    onClick={testExpression}
                                    className="w-full bg-fcc-gold text-black text-sm px-2 py-1 rounded hover:bg-yellow-500"
                                >
                                    Test Expression
                                </button>
                            </div>
                            {testResult && (
                                <div className="text-xs text-green-400">
                                    Result: {testResult}
                                </div>
                            )}
                            {testError && (
                                <div className="text-xs text-red-400">
                                    Error: {testError}
                                </div>
                            )}
                            <p className="text-xs text-gray-500">Use field names as variables, e.g., quantity * price, or Math.max(a, b). Test your expression using the button above.</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-fcc-border">
                    <Palette size={16} className="text-fcc-gold" />
                    <h4 className="text-sm font-bold text-white">Styling</h4>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Width</label>
                        <input
                            type="text"
                            value={element.style?.width || ''}
                            onChange={(e) => updateStyle({ width: e.target.value })}
                            className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                            placeholder="100%"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Height</label>
                        <input
                            type="text"
                            value={element.style?.height || ''}
                            onChange={(e) => updateStyle({ height: e.target.value })}
                            className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                            placeholder="auto"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Column Start</label>
                        <input
                            type="number"
                            min={1}
                            value={element.style?.columnStart || ''}
                            onChange={(e) => updateStyle({ columnStart: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                            placeholder="1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Column Span</label>
                        <input
                            type="number"
                            min={1}
                            value={element.style?.columnSpan || ''}
                            onChange={(e) => updateStyle({ columnSpan: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                            placeholder="1"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Row Start</label>
                        <input
                            type="number"
                            min={1}
                            value={element.style?.rowStart || ''}
                            onChange={(e) => updateStyle({ rowStart: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                            placeholder="1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Row Span</label>
                        <input
                            type="number"
                            min={1}
                            value={element.style?.rowSpan || ''}
                            onChange={(e) => updateStyle({ rowSpan: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                            placeholder="1"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Font Size</label>
                        <input
                            type="text"
                            value={element.style?.fontSize || ''}
                            onChange={(e) => updateStyle({ fontSize: e.target.value })}
                            className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                            placeholder="14px"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Color</label>
                        <input
                            type="color"
                            value={element.style?.color || '#ffffff'}
                            onChange={(e) => updateStyle({ color: e.target.value })}
                            className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded h-8"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1">Background Color</label>
                    <input
                        type="color"
                        value={element.style?.backgroundColor || '#1a1a1a'}
                        onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                        className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded h-8"
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1">CSS Class</label>
                    <input
                        type="text"
                        value={element.style?.cssClass || ''}
                        onChange={(e) => updateStyle({ cssClass: e.target.value })}
                        className="w-full bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                        placeholder="custom-class"
                    />
                </div>
            </div>
        </div>
    );
};