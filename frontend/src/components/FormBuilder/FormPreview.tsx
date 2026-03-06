/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from 'react';
import { FormElement, FormLayoutConfig } from '../../types/form-builder';
import { X } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import QuillWrapper from '../QuillWrapper';
import { useToast } from '../../contexts/ToastContext';
import { useFormEngine } from '../../hooks/useFormEngine';

interface FormPreviewProps {
    elements: FormElement[];
    isOpen: boolean;
    onClose: () => void;
    formName: string;
    formTheme?: { primaryColor: string; backgroundColor: string; textColor: string };
    formLayout?: FormLayoutConfig;
}

export const FormPreview: React.FC<FormPreviewProps> = ({
    elements,
    isOpen,
    onClose,
    formName,
    formTheme = { primaryColor: '#FFD700', backgroundColor: '#ffffff', textColor: '#000000', fontFamily: 'Inter, sans-serif', baseFontSize: '16px', borderRadius: '8px', labelColor: '#9ca3af', inputBorderColor: '#374151', errorColor: '#ef4444', successColor: '#10b981', spacing: '1rem' } as any,
    formLayout = { type: 'single-column', columns: 1, rowGap: 24, columnGap: 24, padding: 24, maxWidth: 900 }
}) => {
    const {
        formData,
        validationErrors,
        elementStates,
        handleInputChange,
        validateAll,
    } = useFormEngine({
        elements,
        syncCalculations: true,
    });

    const signatureRefs = useRef<Record<string, SignatureCanvas | null>>({});
    const { success } = useToast();

    const getElementState = (element: FormElement) => {
        return elementStates[element.id] || { isVisible: true, isRequired: element.required, isDisabled: false, pendingValues: {} };
    };

    const visibleElements = elements.filter((element) => elementStates[element.id]?.isVisible);

    if (!isOpen) return null;

    const renderElement = (element: FormElement, state: { isRequired: boolean; isDisabled: boolean }) => {
        const rawValue = formData[element.id];
        const value = (rawValue !== undefined && rawValue !== null) ? rawValue : '';
        const stringValue = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
        const isCalculated = !!element.calculation?.Expression;
        const errors = validationErrors[element.id] || [];
        const hasErrors = errors.length > 0;

        const customStyle: React.CSSProperties = {
            width: element.style?.width || '100%',
            height: element.style?.height,
            fontSize: element.style?.fontSize,
            color: element.style?.color || formTheme.textColor,
            backgroundColor: element.style?.backgroundColor || formTheme.backgroundColor,
        };

        const customClassName = element.style?.cssClass;

        switch (element.type) {
            case 'text':
            case 'email':
                return (
                    <div>
                        <input
                            type={element.type}
                            value={stringValue}
                            onChange={(e) => handleInputChange(element.id, e.target.value)}
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated}
                            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 ${customClassName || ''} ${hasErrors ? 'border-red-500' : ''}`}
                            style={{
                                ...customStyle,
                                borderColor: formTheme.primaryColor + '40',
                                '--tw-ring-color': formTheme.primaryColor
                            } as React.CSSProperties}
                        />
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-400">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'textarea':
                return (
                    <div>
                        <textarea
                            value={stringValue}
                            onChange={(e) => handleInputChange(element.id, e.target.value)}
                            placeholder={element.placeholder}
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 resize-none ${hasErrors ? 'border-red-500' : ''}`}
                            style={{
                                borderColor: formTheme.primaryColor + '40',
                                color: formTheme.textColor,
                                backgroundColor: formTheme.backgroundColor,
                                '--tw-ring-color': formTheme.primaryColor
                            } as React.CSSProperties}
                        />
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-400">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'number':
                return (
                    <div>
                        <input
                            type="number"
                            value={stringValue}
                            onChange={(e) => handleInputChange(element.id, Number(e.target.value))}
                            placeholder={element.placeholder}
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${hasErrors ? 'border-red-500' : ''}`}
                            style={{
                                borderColor: formTheme.primaryColor + '40',
                                color: formTheme.textColor,
                                backgroundColor: formTheme.backgroundColor,
                                '--tw-ring-color': formTheme.primaryColor
                            } as React.CSSProperties}
                        />
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-400">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'date':
                return (
                    <div>
                        <input
                            type="date"
                            value={stringValue}
                            onChange={(e) => handleInputChange(element.id, e.target.value)}
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${hasErrors ? 'border-red-500' : ''}`}
                            style={{
                                borderColor: formTheme.primaryColor + '40',
                                color: formTheme.textColor,
                                backgroundColor: formTheme.backgroundColor,
                                '--tw-ring-color': formTheme.primaryColor
                            } as React.CSSProperties}
                        />
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-400">
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
                        <select
                            value={stringValue}
                            onChange={(e) => handleInputChange(element.id, e.target.value)}
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${hasErrors ? 'border-red-500' : ''}`}
                            style={{
                                borderColor: formTheme.primaryColor + '40',
                                color: formTheme.textColor,
                                backgroundColor: formTheme.backgroundColor,
                                '--tw-ring-color': formTheme.primaryColor
                            } as React.CSSProperties}
                        >
                            <option value="">Select an option...</option>
                            {element.options?.map((opt, i) => (
                                <option key={i} value={typeof opt === 'string' ? opt : opt.Value}>
                                    {typeof opt === 'string' ? opt : opt.Label}
                                </option>
                            ))}
                        </select>
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-400">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'radio':
                return (
                    <div className="space-y-2">
                        {element.options?.map((opt, i) => {
                            const optValue = typeof opt === 'string' ? opt : opt.Value;
                            const optLabel = typeof opt === 'string' ? opt : opt.Label;
                            return (
                                <label key={i} className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name={element.id}
                                        value={optValue}
                                        checked={stringValue === optValue}
                                        onChange={(e) => handleInputChange(element.id, e.target.value)}
                                        required={state.isRequired}
                                        disabled={state.isDisabled || isCalculated}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{optLabel}</span>
                                </label>
                            );
                        })}
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-400">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'phone':
                return (
                    <div>
                        <input
                            type="tel"
                            value={stringValue}
                            onChange={(e) => handleInputChange(element.id, e.target.value)}
                            placeholder={element.placeholder}
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${hasErrors ? 'border-red-500' : ''}`}
                            style={{
                                borderColor: formTheme.primaryColor + '40',
                                color: formTheme.textColor,
                                backgroundColor: formTheme.backgroundColor,
                                '--tw-ring-color': formTheme.primaryColor
                            } as React.CSSProperties}
                        />
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-400">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'file':
                const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) {
                        handleInputChange(element.id, null);
                        return;
                    }
                    handleInputChange(element.id, files);
                };

                const selectedFiles = formData[element.id] as FileList | null;
                const fileList = selectedFiles ? Array.from(selectedFiles).map((file: File, index: number) => (
                    <div key={index} className="text-sm" style={{ color: formTheme.textColor }}>
                        📎 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                )) : null;

                return (
                    <div className="space-y-2">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            required={state.isRequired}
                            disabled={state.isDisabled || isCalculated}
                            multiple={element.multiple !== false}
                            accept={element.validation?.FileTypes?.join(',')}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${hasErrors ? 'border-red-500' : ''}`}
                            style={{
                                borderColor: formTheme.primaryColor + '40',
                                color: formTheme.textColor,
                                backgroundColor: formTheme.backgroundColor,
                                '--tw-ring-color': formTheme.primaryColor
                            } as React.CSSProperties}
                        />
                        {fileList && (
                            <div className="space-y-1">
                                {fileList}
                            </div>
                        )}
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-400">
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
                            value={stringValue}
                            onChange={(val) => handleInputChange(element.id, val)}
                            readOnly={state.isDisabled || isCalculated}
                        />
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-400">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'rating':
                const numericValue = typeof value === 'number' ? value : 0;
                return (
                    <div>
                        <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => !(state.isDisabled || isCalculated) && handleInputChange(element.id, star)}
                                    disabled={state.isDisabled || isCalculated}
                                    className={`text-2xl ${star <= numericValue ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-400">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'signature':
                return (
                    <div className="w-full">
                        <SignatureCanvas
                            ref={(ref) => {
                                signatureRefs.current[element.id] = ref;
                            }}
                            canvasProps={{
                                className: `w-full h-32 border-2 rounded ${hasErrors ? 'border-red-500' : 'border-gray-300'}`,
                                style: { borderStyle: 'dashed', pointerEvents: state.isDisabled || isCalculated ? 'none' : 'auto', opacity: state.isDisabled || isCalculated ? 0.6 : 1 }
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
                            <div className="mt-1 text-sm text-red-400">
                                {errors.map((error, i) => (
                                    <div key={i}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'checkbox':
                const arrayValue = Array.isArray(value) ? value as string[] : [];
                return (
                    <div className="space-y-2">
                        {element.options?.map((opt, i) => {
                            const optValue = typeof opt === 'string' ? opt : opt.Value;
                            const optLabel = typeof opt === 'string' ? opt : opt.Label;
                            const isChecked = arrayValue.includes(optValue);
                            return (
                                <label key={i} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        value={optValue}
                                        checked={isChecked}
                                        onChange={(e) => {
                                            if (state.isDisabled || isCalculated) return;
                                            if (e.target.checked) {
                                                handleInputChange(element.id, [...arrayValue, optValue]);
                                            } else {
                                                handleInputChange(element.id, arrayValue.filter(v => v !== optValue));
                                            }
                                        }}
                                        required={state.isRequired}
                                        disabled={state.isDisabled || isCalculated}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{optLabel}</span>
                                </label>
                            );
                        })}
                        {hasErrors && (
                            <div className="mt-1 text-sm text-red-400">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
                className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                style={{ backgroundColor: formTheme.backgroundColor, fontFamily: (formTheme as any).fontFamily || 'Inter, sans-serif', fontSize: (formTheme as any).baseFontSize || '16px', borderRadius: (formTheme as any).borderRadius || '8px' }}
            >
                <div
                    className="flex items-center justify-between p-6 border-b"
                    style={{ borderColor: formTheme.primaryColor + '20' }}
                >
                    <h2
                        className="text-xl font-bold"
                        style={{ color: formTheme.textColor }}
                    >
                        {formName} - Preview
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full transition-colors"
                        style={{
                            color: formTheme.textColor,
                            backgroundColor: formTheme.primaryColor + '10'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <form
                        className="w-full"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${formLayout.type === 'single-column' ? 1 : formLayout.type === 'two-column' ? 2 : (formLayout.columns || 3)}, minmax(0, 1fr))`,
                            rowGap: `${formLayout.rowGap ?? 24}px`,
                            columnGap: `${formLayout.columnGap ?? 24}px`,
                            padding: `${formLayout.padding ?? 24}px`,
                            maxWidth: `${formLayout.maxWidth ?? 900}px`,
                            margin: '0 auto'
                        }}
                    >
                        {visibleElements.map((element, index) => {
                            const elementState = getElementState(element);
                            const totalColumns = formLayout.type === 'single-column' ? 1 : formLayout.type === 'two-column' ? 2 : (formLayout.columns || 3);
                            const shouldSpanColumns = totalColumns > 1 &&
                                (element.type === 'richtext' || element.type === 'signature' ||
                                    (element.style?.width === '100%' || element.style?.cssClass?.includes('full-width')));

                            const placementStyle: React.CSSProperties = {
                                gridColumnStart: element.style?.columnStart,
                                gridColumnEnd: element.style?.columnSpan ? `span ${element.style.columnSpan}` : undefined,
                                gridRowStart: element.style?.rowStart,
                                gridRowEnd: element.style?.rowSpan ? `span ${element.style.rowSpan}` : undefined
                            };

                            return (
                                <div
                                    key={element.id}
                                    className="space-y-2"
                                    style={shouldSpanColumns ? { gridColumn: '1 / -1', ...placementStyle } : placementStyle}
                                >
                                    <label
                                        className="block text-sm font-medium"
                                        style={{ color: (formTheme as any).labelColor || formTheme.textColor }}
                                    >
                                        {element.label}
                                        {elementState.isRequired && <span style={{ color: (formTheme as any).errorColor || '#ef4444' }} className="ml-1">*</span>}
                                    </label>
                                    {renderElement(element, elementState)}
                                </div>
                            );
                        })}

                        {elements.length === 0 && (
                            <div className="text-center py-12" style={{ color: formTheme.textColor + '80' }}>
                                <p className="text-lg">No form elements to preview</p>
                                <p className="text-sm">Add some elements to see the preview</p>
                            </div>
                        )}
                    </form>
                </div>

                <div
                    className="flex justify-end space-x-3 p-6 border-t"
                    style={{
                        borderColor: formTheme.primaryColor + '20',
                        backgroundColor: formTheme.backgroundColor + '95'
                    }}
                >
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                        style={{
                            color: formTheme.textColor,
                            backgroundColor: formTheme.backgroundColor,
                            borderColor: formTheme.primaryColor + '40'
                        }}
                    >
                        Close Preview
                    </button>
                    {elements.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                const errors = validateAll();

                                if (Object.keys(errors).length > 0) {
                                    return;
                                }

                                success('Form submitted successfully!');
                            }}
                            className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                            style={{
                                backgroundColor: formTheme.primaryColor,
                                borderColor: formTheme.primaryColor
                            }}
                        >
                            Submit Form
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
