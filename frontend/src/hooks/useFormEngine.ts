'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FormElement } from '../types/form-builder';
import { evaluateExpression } from '../lib/expressionEvaluator';
import { computeElementState, normalizeFileList } from '../lib/formConditionUtils';

export interface FormEngineOptions {
    /** JSON string representing the form definition */
    definition?: string;
    /** Pre-parsed elements array (used by FormPreview which has elements directly) */
    elements?: FormElement[];
    /** Initial form data to populate */
    initialData?: Record<string, unknown>;
    /** Called when form data changes (debounced) */
    onChange?: (data: Record<string, unknown>) => void;
    /** Debounce delay for onChange callback in ms */
    onChangeDebounceMs?: number;
    /** Debounce delay for calculations in ms */
    calculationDebounceMs?: number;
    /** Whether calculations should be synchronous (no debounce) — used in preview mode */
    syncCalculations?: boolean;
}

export interface ElementState {
    isVisible: boolean;
    isRequired: boolean;
    isDisabled: boolean;
    pendingValues: Record<string, unknown>;
}

export interface FormEngineResult {
    /** Current form data */
    formData: Record<string, unknown>;
    /** Parsed form elements */
    parsedElements: FormElement[];
    /** Validation errors keyed by element ID */
    validationErrors: Record<string, string[]>;
    /** Calculation errors keyed by element ID */
    calculationErrors: Record<string, string>;
    /** Computed element states (visibility, required, disabled) */
    elementStates: Record<string, ElementState>;
    /** Set of currently visible element IDs */
    visibleElementIds: Set<string>;
    /** Whether the user has interacted with the form */
    hasUserInteracted: boolean;
    /** Handle input value change for an element */
    handleInputChange: (elementId: string, value: unknown) => void;
    /** Validate all visible fields; returns error map (empty = valid) */
    validateAll: () => Record<string, string[]>;
    /** Validate a single field */
    validateField: (element: FormElement, value: unknown, state: { isRequired: boolean; isDisabled: boolean }) => string[];
    /** Set form data directly */
    setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}

/**
 * Core form engine hook — shared between FormRenderer and FormPreview.
 * Handles: parsing, validation, conditional logic, calculations, and data management.
 */
export function useFormEngine(options: FormEngineOptions): FormEngineResult {
    const {
        definition,
        elements: rawElements,
        initialData,
        onChange,
        onChangeDebounceMs = 150,
        calculationDebounceMs = 100,
        syncCalculations = false,
    } = options;

    const [formData, setFormData] = useState<Record<string, unknown>>(initialData || {});
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
    const [calculationErrors, setCalculationErrors] = useState<Record<string, string>>({});
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

    const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const prevInitialDataRef = useRef<string | undefined>(undefined);

    // Notify parent of form data changes via debounced callback
    useEffect(() => {
        if (!onChange || !hasUserInteracted) return;

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            onChange(formData);
        }, onChangeDebounceMs);

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [formData, onChange, hasUserInteracted, onChangeDebounceMs]);

    // Sync from parent initialData when it meaningfully changes
    useEffect(() => {
        if (!initialData) return;
        const serialized = JSON.stringify(initialData);
        if (serialized !== prevInitialDataRef.current) {
            prevInitialDataRef.current = serialized;
            setFormData(initialData);
        }
    }, [initialData]);

    // Parse form definition JSON into elements array
    const parsedElements = useMemo(() => {
        // If raw elements are provided directly, use them
        if (rawElements) return rawElements;

        if (!definition || typeof definition !== 'string') {
            console.warn('Form definition is empty or invalid');
            return [];
        }
        try {
            const parsed = JSON.parse(definition);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Failed to parse form definition:', error);
            return [];
        }
    }, [definition, rawElements]);

    // Run calculations — either synchronous (for preview) or debounced
    const computedFormData = useMemo(() => {
        if (!syncCalculations) return formData;

        // Synchronous calculation mode (used by FormPreview)
        const result = { ...formData };
        const dataByFieldName: Record<string, unknown> = {};
        parsedElements.forEach((element) => {
            if (element.fieldName) {
                dataByFieldName[element.fieldName] = result[element.id];
            }
        });

        parsedElements.forEach((element) => {
            if (!element.calculation?.Expression) return;
            const evalResult = evaluateExpression(element.calculation.Expression, dataByFieldName, element.calculation.OutputType);
            if (evalResult.result !== undefined) {
                result[element.id] = evalResult.result;
            }
        });

        return result;
    }, [syncCalculations, formData, parsedElements]);

    // Debounced calculations (for FormRenderer)
    useEffect(() => {
        if (syncCalculations) return; // Skip — handled by computedFormData memo above

        if (calculationTimeoutRef.current) {
            clearTimeout(calculationTimeoutRef.current);
        }

        calculationTimeoutRef.current = setTimeout(() => {
            let changed = false;
            const updated = { ...formData };
            const newCalculationErrors: Record<string, string> = {};

            const dataByFieldName: Record<string, unknown> = {};
            parsedElements.forEach((element) => {
                if (element.fieldName) {
                    dataByFieldName[element.fieldName] = formData[element.id];
                }
            });

            parsedElements.forEach((element) => {
                if (!element.calculation?.Expression) return;
                const evalResult = evaluateExpression(element.calculation.Expression, dataByFieldName, element.calculation.OutputType);
                if (evalResult.result !== undefined && updated[element.id] !== evalResult.result) {
                    updated[element.id] = evalResult.result;
                    changed = true;
                }
                if (evalResult.error) {
                    newCalculationErrors[element.id] = evalResult.error;
                }
            });

            if (changed) {
                setFormData(updated);
            }
            setCalculationErrors(newCalculationErrors);
        }, calculationDebounceMs);

        return () => {
            if (calculationTimeoutRef.current) {
                clearTimeout(calculationTimeoutRef.current);
            }
        };
    }, [parsedElements, formData, syncCalculations, calculationDebounceMs]);

    // The effective data used for condition evaluation (sync mode uses computed, async uses raw)
    const effectiveData = syncCalculations ? computedFormData : formData;

    // Compute element states using pure function
    const elementStates = useMemo(() => {
        const map: Record<string, ElementState> = {};
        parsedElements.forEach((element) => {
            map[element.id] = computeElementState(element, effectiveData);
        });
        return map;
    }, [effectiveData, parsedElements]);

    // Apply set_value condition results via useEffect (not during render)
    useEffect(() => {
        const allPending: Record<string, unknown> = {};
        Object.values(elementStates).forEach(state => {
            Object.assign(allPending, state.pendingValues);
        });
        if (Object.keys(allPending).length > 0) {
            setFormData(prev => {
                const updated = { ...prev };
                let changed = false;
                for (const [key, value] of Object.entries(allPending)) {
                    if (updated[key] !== value) {
                        updated[key] = value;
                        changed = true;
                    }
                }
                return changed ? updated : prev;
            });
        }
    }, [elementStates]);

    // Visible elements set
    const visibleElementIds = useMemo(() => {
        const ids = new Set<string>();
        parsedElements.forEach((element) => {
            if (elementStates[element.id]?.isVisible) {
                ids.add(element.id);
            }
        });
        return ids;
    }, [parsedElements, elementStates]);

    // Field validation
    const validateField = useCallback((element: FormElement, value: unknown, state: { isRequired: boolean; isDisabled: boolean }): string[] => {
        const errors: string[] = [];

        try {
            if (state.isDisabled) {
                return errors;
            }

            const isEmptyString = typeof value === 'string' && value.trim().length === 0;
            const isEmptyArray = Array.isArray(value) && value.length === 0;
            const isEmptyFileList = element.type === 'file' && normalizeFileList(value).length === 0;
            if (state.isRequired && (!value || isEmptyString || isEmptyArray || isEmptyFileList)) {
                errors.push('This field is required');
            }
            if (value && element.validation) {
                const validation = element.validation;

                if (validation.pattern && typeof validation.pattern === 'string' && !new RegExp(validation.pattern).test(String(value))) {
                    errors.push(validation.customMessage || 'Invalid format');
                }

                if (typeof validation.min === 'number' && Number(value) < validation.min) {
                    errors.push(validation.customMessage || `Value must be at least ${validation.min}`);
                }

                if (typeof validation.max === 'number' && Number(value) > validation.max) {
                    errors.push(validation.customMessage || `Value must be at most ${validation.max}`);
                }

                // File validation
                if (element.type === 'file') {
                    const files = normalizeFileList(value);

                    if (validation.FileTypes && validation.FileTypes.length > 0) {
                        const allowedTypes = validation.FileTypes.map(t => t.toLowerCase().trim());
                        for (const file of files) {
                            const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
                            const fileMime = file.type.toLowerCase();
                            const isValid = allowedTypes.some(t => fileMime.includes(t) || fileExt === t);
                            if (!isValid) {
                                errors.push(`File "${file.name}" is not an allowed file type`);
                            }
                        }
                    }

                    if (validation.MaxSize) {
                        const maxBytes = validation.MaxSize * 1024 * 1024;
                        for (const file of files) {
                            if (file.size > maxBytes) {
                                errors.push(`File "${file.name}" exceeds ${validation.MaxSize}MB limit`);
                            }
                        }
                    }
                }
            }
        } catch (validationErr) {
            console.error('Validation error for field', element.id, validationErr);
            errors.push('Validation failed');
        }

        return errors;
    }, []);

    // Handle input change
    const handleInputChange = useCallback((elementId: string, value: unknown) => {
        setFormData(prev => ({ ...prev, [elementId]: value }));
        setHasUserInteracted(true);

        const element = parsedElements.find(el => el.id === elementId);
        if (element) {
            const state = elementStates[element.id] || { isRequired: element.required, isDisabled: false, isVisible: true };
            const errors = validateField(element, value, state);
            setValidationErrors(prev => ({
                ...prev,
                [elementId]: errors
            }));
        }
    }, [parsedElements, elementStates, validateField]);

    // Validate all visible fields
    const validateAll = useCallback((): Record<string, string[]> => {
        const errors: Record<string, string[]> = {};
        parsedElements.forEach((element) => {
            const state = elementStates[element.id] || { isRequired: element.required, isDisabled: false, isVisible: true };
            if (!state.isVisible) return;
            const data = syncCalculations ? computedFormData : formData;
            const value = data[element.id];
            const fieldErrors = validateField(element, value, state);
            if (fieldErrors.length > 0) {
                errors[element.id] = fieldErrors;
            }
        });
        setValidationErrors(errors);
        return errors;
    }, [parsedElements, elementStates, formData, computedFormData, syncCalculations, validateField]);

    return {
        formData: syncCalculations ? computedFormData : formData,
        parsedElements,
        validationErrors,
        calculationErrors,
        elementStates,
        visibleElementIds,
        hasUserInteracted,
        handleInputChange,
        validateAll,
        validateField,
        setFormData,
    };
}
