'use client';

import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { FormElement, FormLayoutConfig } from '../types/form-builder';
import FileUploadField from './FileUploadField';
import QuillWrapper from './QuillWrapper';
import { useToast } from '../contexts/ToastContext';
import { Calculator } from 'lucide-react';
import { useFormEngine } from '../hooks/useFormEngine';

const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false }) as any;

interface SignatureCanvasRef {
    clear: () => void;
    isEmpty: () => boolean;
    toDataURL: () => string;
}

interface FormTheme {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    baseFontSize?: string;
    borderRadius?: string;
    labelColor?: string;
    inputBorderColor?: string;
    errorColor?: string;
}

interface FormRendererProps {
    definition: string;
    formId?: string;
    onSubmit?: (data: Record<string, unknown>) => void;
    onSave?: (data: Record<string, unknown>) => void;
    onChange?: (data: Record<string, unknown>) => void;
    initialData?: Record<string, unknown>;
    layout?: FormLayoutConfig;
    mode?: 'preview' | 'submit' | 'view';
    theme?: FormTheme;
}

const FormRenderer: React.FC<FormRendererProps> = ({
    definition,
    formId,
    onSubmit,
    onSave,
    onChange,
    initialData,
    layout = { type: 'single-column', columns: 1, rowGap: 24, columnGap: 24, padding: 24, maxWidth: 900 },
    mode = 'preview',
    theme
}) => {
    const {
        formData,
        parsedElements,
        validationErrors,
        calculationErrors,
        elementStates,
        visibleElementIds: currentVisibleElements,
        hasUserInteracted,
        handleInputChange,
        validateAll,
    } = useFormEngine({
        definition,
        initialData,
        onChange,
    });

    const signatureRefs = useRef<Record<string, SignatureCanvasRef | null>>({});
    const [uploadingFields, setUploadingFields] = useState<Set<string>>(new Set());
    const { error } = useToast();
    const isViewMode = mode === 'view';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (uploadingFields.size > 0) {
            error('Please wait for all file uploads to complete before submitting.');
            return;
        }

        const errors = validateAll();

        if (Object.keys(errors).length > 0) {
            return;
        }

        onSubmit?.(formData);
    };

    const handleSave = () => {
        if (onSave) {
            onSave(formData);
        }
    };

    const renderElement = (element: FormElement, fieldId?: string, errorId?: string) => {
        if (!currentVisibleElements.has(element.id)) {
            return null;
        }

        const value = formData[element.id] ?? '';
        const isCalculated = !!element.calculation?.Expression;
        const errors = validationErrors[element.id] || [];
        const hasErrors = errors.length > 0;
        const state = elementStates[element.id] || { isRequired: element.required, isDisabled: false, isVisible: true, pendingValues: {} };

        const inputClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${hasErrors ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`;
        // Accessibility attributes (fixes FB-21, FB-22)
        const a11yProps = {
            id: fieldId,
            'aria-invalid': hasErrors ? true as const : undefined,
            'aria-describedby': hasErrors && errorId ? errorId : undefined,
        };

        switch (element.type) {
            case 'text':
            case 'email':
            case 'phone':
                return (
                    <div>
                        <input
                            {...a11yProps}
                            type={element.type === 'phone' ? 'tel' : element.type}
                            value={value as string || ''}
                            onChange={(e) => handleInputChange(element.id, e.target.value)}
                            placeholder={element.placeholder}
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated || isViewMode}
                            className={inputClasses}
                        />
                        {hasErrors && (
                            <div id={errorId} role="alert" className="mt-1 text-sm text-red-600">
                                {errors.map((err, i) => (
                                    <div key={i}>{err}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'textarea':
                return (
                    <div>
                        <textarea
                            {...a11yProps}
                            value={value as string || ''}
                            onChange={(e) => handleInputChange(element.id, e.target.value)}
                            placeholder={element.placeholder}
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated || isViewMode}
                            rows={4}
                            className={inputClasses + ' resize-none'}
                        />
                        {hasErrors && (
                            <div id={errorId} role="alert" className="mt-1 text-sm text-red-600">
                                {errors.map((err, i) => (
                                    <div key={i}>{err}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'number':
                return (
                    <div>
                        <input
                            {...a11yProps}
                            type="number"
                            value={value as number || ''}
                            onChange={(e) => handleInputChange(element.id, Number(e.target.value))}
                            placeholder={element.placeholder}
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated || isViewMode}
                            className={inputClasses}
                        />
                        {hasErrors && (
                            <div id={errorId} role="alert" className="mt-1 text-sm text-red-600">
                                {errors.map((err, i) => (
                                    <div key={i}>{err}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'date':
                return (
                    <div>
                        <input
                            {...a11yProps}
                            type="date"
                            value={value as string || ''}
                            onChange={(e) => handleInputChange(element.id, e.target.value)}
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated || isViewMode}
                            className={inputClasses}
                        />
                        {hasErrors && (
                            <div id={errorId} role="alert" className="mt-1 text-sm text-red-600">
                                {errors.map((err, i) => (
                                    <div key={i}>{err}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'file':
                return (
                    <div>
                        <FileUploadField
                            fieldId={element.id}
                            formId={formId}
                            label=""
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated}
                            multiple={element.multiple !== false}
                            allowedTypes={element.validation?.FileTypes}
                            maxSize={element.validation?.MaxSize}
                            onChange={(fileIds) => handleInputChange(element.id, fileIds)}
                            onUploadingChange={(uploading) => {
                                setUploadingFields(prev => {
                                    const newSet = new Set(prev);
                                    if (uploading) {
                                        newSet.add(element.id);
                                    } else {
                                        newSet.delete(element.id);
                                    }
                                    return newSet;
                                });
                            }}
                        />
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-600">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'richtext':
                return (
                    <div>
                        <QuillWrapper
                            value={value as string || ''}
                            onChange={(content: string) => handleInputChange(element.id, content)}
                            readOnly={state.isDisabled || isCalculated}
                            theme="snow"
                            placeholder={element.placeholder}
                        />
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-600">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'rating':
                return (
                    <div>
                        <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => !(state.isDisabled || isCalculated) && handleInputChange(element.id, star)}
                                    disabled={state.isDisabled || isCalculated}
                                    className={`text-2xl ${star <= (typeof value === 'number' ? value : 0) ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-600">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'signature':
                return (
                    <div>
                        <SignatureCanvas
                            ref={(ref: SignatureCanvasRef | null) => {
                                signatureRefs.current[element.id] = ref;
                            }}
                            canvasProps={{
                                className: `w-full h-32 border-2 rounded ${hasErrors ? 'border-red-500' : 'border-gray-300'}`,
                                style: { borderStyle: 'dashed', pointerEvents: state.isDisabled ? 'none' : 'auto', opacity: state.isDisabled ? 0.6 : 1 }
                            }}
                            onEnd={() => {
                                if (state.isDisabled || isCalculated) return;
                                const sigRef = signatureRefs.current[element.id];
                                if (sigRef && !sigRef.isEmpty()) {
                                    handleInputChange(element.id, sigRef.toDataURL());
                                }
                            }}
                        />
                        <div className="mt-2 flex space-x-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (state.isDisabled || isCalculated) return;
                                    const sigRef = signatureRefs.current[element.id];
                                    if (sigRef) {
                                        sigRef.clear();
                                        handleInputChange(element.id, '');
                                    }
                                }}
                                disabled={state.isDisabled || isCalculated}
                                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Clear
                            </button>
                        </div>
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-600">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'select':
                return (
                    <div>
                        {element.multiple ? (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    {Array.isArray(value) && value.map((val, idx) => {
                                        const optLabel = element.options?.find(o => (typeof o === 'string' ? o : (o.Value ?? o.Label)) === val)?.Label || val;
                                        return (
                                            <span key={idx} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                                {optLabel}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (state.isDisabled || isCalculated) return;
                                                        const newValues = (value as string[]).filter(v => v !== val);
                                                        handleInputChange(element.id, newValues);
                                                    }}
                                                    disabled={state.isDisabled || isCalculated}
                                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        if (state.isDisabled || isCalculated || isViewMode || !e.target.value) return;
                                        const currentValues = Array.isArray(value) ? value : [];
                                        if (!currentValues.includes(e.target.value)) {
                                            handleInputChange(element.id, [...currentValues, e.target.value]);
                                        }
                                    }}
                                    disabled={state.isDisabled || isCalculated || isViewMode}
                                    className={inputClasses}
                                >
                                    <option value="">Select options...</option>
                                    {element.options?.filter(opt => {
                                        const optValue = typeof opt === 'string' ? opt : (opt.Value ?? opt.Label ?? '');
                                        return !Array.isArray(value) || !value.includes(optValue);
                                    }).map((opt, i) => (
                                        <option key={i} value={typeof opt === 'string' ? opt : (opt.Value ?? opt.Label ?? '')}>
                                            {typeof opt === 'string' ? opt : (opt.Label ?? opt.Value ?? '')}
                                        </option>
                                    ))}
                                </select>
                                {state.isRequired && (!value || (Array.isArray(value) && value.length === 0)) && (
                                    <div className="mt-1 text-sm text-red-600">
                                        Please select at least one option
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <select
                                    value={value as string || ''}
                                    onChange={(e) => handleInputChange(element.id, e.target.value)}
                                    required={state.isRequired}
                                    disabled={state.isDisabled || isCalculated || isViewMode}
                                    className={inputClasses}
                                >
                                    <option value="" disabled={state.isRequired}>Select an option...</option>
                                    {element.options?.map((opt, i) => (
                                        <option key={i} value={typeof opt === 'string' ? opt : (opt.Value ?? opt.Label ?? '')}>
                                            {typeof opt === 'string' ? opt : (opt.Label ?? opt.Value ?? '')}
                                        </option>
                                    ))}
                                </select>
                                {hasErrors && (
                                    <div className="mt-1 text-sm text-red-600">
                                        {errors.map((error, i) => (
                                            <div key={i}>{error}</div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );
            case 'radio':
                return (
                    <div className="space-y-2">
                        {element.options?.map((opt, i) => {
                            const optValue = typeof opt === 'string' ? opt : (opt.Value ?? opt.Label ?? '');
                            const optLabel = typeof opt === 'string' ? opt : (opt.Label ?? opt.Value ?? '');
                            return (
                                <label key={i} className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name={element.id}
                                        value={optValue}
                                        checked={value === optValue}
                                        onChange={(e) => handleInputChange(element.id, e.target.value)}
                                        disabled={state.isDisabled || isCalculated || isViewMode}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{optLabel}</span>
                                </label>
                            );
                        })}
                        {state.isRequired && !value && (
                            <div className="mt-1 text-sm text-red-600">
                                Please select an option
                            </div>
                        )}
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-600">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'checkbox':
                return (
                    <div className="space-y-2">
                        {element.options?.map((opt, i) => {
                            const optValue = typeof opt === 'string' ? opt : (opt.Value ?? opt.Label ?? '');
                            const optLabel = typeof opt === 'string' ? opt : (opt.Label ?? opt.Value ?? '');
                            const isChecked = Array.isArray(value) ? value.includes(optValue) : false;
                            return (
                                <label key={i} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        value={optValue}
                                        checked={isChecked}
                                        onChange={(e) => {
                                            if (state.isDisabled || isCalculated || isViewMode) return;
                                            const currentValues = Array.isArray(value) ? value : [];
                                            if (e.target.checked) {
                                                handleInputChange(element.id, [...currentValues, optValue]);
                                            } else {
                                                handleInputChange(element.id, currentValues.filter(v => v !== optValue));
                                            }
                                        }}
                                        disabled={state.isDisabled || isCalculated || isViewMode}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{optLabel}</span>
                                </label>
                            );
                        })}
                        {state.isRequired && (!value || (Array.isArray(value) && value.length === 0)) && (
                            <div className="mt-1 text-sm text-red-600">
                                Please select at least one option
                            </div>
                        )}
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-600">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            default:
                return <div className="text-gray-500">Unsupported field type</div>;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg" style={{ padding: `${layout.padding ?? 24}px`, maxWidth: `${layout.maxWidth ?? 900}px`, margin: '0 auto', ...(theme?.fontFamily && { fontFamily: theme.fontFamily }), ...(theme?.baseFontSize && { fontSize: theme.baseFontSize }), ...(theme?.borderRadius && { borderRadius: theme.borderRadius }), ...(theme?.backgroundColor && { backgroundColor: theme.backgroundColor }), ...(theme?.textColor && { color: theme.textColor }) }}>
            <form
                onSubmit={isViewMode ? undefined : handleSubmit}
                className="w-full"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${layout.type === 'single-column' ? 1 : layout.type === 'two-column' ? 2 : (layout.columns || 3)}, minmax(0, 1fr))`,
                    rowGap: `${layout.rowGap ?? 24}px`,
                    columnGap: `${layout.columnGap ?? 24}px`
                }}
            >
                {parsedElements.filter((element) => elementStates[element.id]?.isVisible).map((element) => {
                    const isCalculated = !!element.calculation?.Expression;
                    const fieldId = `field-${element.id}`;
                    const errorId = `error-${element.id}`;
                    const errors = validationErrors[element.id] || [];
                    const hasErrors = errors.length > 0;
                    return (
                        <div
                            key={element.id}
                            className="space-y-2"
                            style={{
                                gridColumn: (layout.type !== 'single-column' && (element.type === 'richtext' || element.type === 'signature' || element.style?.width === '100%' || element.style?.cssClass?.includes('full-width'))) ? '1 / -1' : undefined,
                                gridColumnStart: element.style?.columnStart,
                                gridColumnEnd: element.style?.columnSpan ? `span ${element.style.columnSpan}` : undefined,
                                gridRowStart: element.style?.rowStart,
                                gridRowEnd: element.style?.rowSpan ? `span ${element.style.rowSpan}` : undefined
                            }}
                        >
                            <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 flex items-center" style={theme?.labelColor ? { color: theme.labelColor } : undefined}>
                                {element.label}
                                {elementStates[element.id]?.isRequired && <span className="text-red-500 ml-1">*</span>}
                                {isCalculated && <Calculator size={14} className="ml-1 text-blue-500" />}
                            </label>
                            {renderElement(element, fieldId, hasErrors ? errorId : undefined)}
                            {mode === 'submit' && hasUserInteracted && calculationErrors[element.id] && (
                                <div className="text-red-500 text-sm mt-1">{calculationErrors[element.id]}</div>
                            )}
                        </div>
                    );
                })}

                {!isViewMode && (
                    <div className="flex justify-between pt-6 border-t border-gray-200" style={{ gridColumn: '1 / -1' }}>
                        {onSave && (
                            <button
                                type="button"
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                Save Draft
                            </button>
                        )}
                        <button
                            type="submit"
                            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Submit Form
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default FormRenderer;
