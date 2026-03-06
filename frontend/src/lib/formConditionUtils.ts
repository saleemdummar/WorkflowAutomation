/**
 * Shared utilities for form condition evaluation, validation, and field operations.
 * Extracted from FormPreview.tsx, FormRenderer.tsx, ConditionBuilder.tsx, and FormBuilder.tsx
 * to eliminate code duplication (audit items FB-16, FB-02, 13.5).
 */

import { FieldCondition, ConditionGroup, FormElementType } from '../types/form-builder';

// ─── Condition Evaluation ────────────────────────────────────────────────────

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty FileList).
 */
export const isEmpty = (val: unknown): boolean => {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof FileList !== 'undefined' && val instanceof FileList && val.length === 0) return true;
    return false;
};

/**
 * Evaluate a single field condition against form data.
 */
export const evaluateCondition = (condition: FieldCondition, data: Record<string, unknown>): boolean => {
    const fieldValue = data[condition.fieldId];
    const compareValue = condition.value;

    let result: boolean;
    switch (condition.operator) {
        case 'equals':
            if (Array.isArray(fieldValue)) {
                result = fieldValue.includes(compareValue);
            } else {
                result = fieldValue == compareValue;
            }
            break;
        case 'not_equals':
            if (Array.isArray(fieldValue)) {
                result = !fieldValue.includes(compareValue as string);
            } else {
                result = fieldValue != compareValue;
            }
            break;
        case 'contains':
            if (Array.isArray(fieldValue)) {
                result = fieldValue.includes(compareValue as string);
            } else if (typeof fieldValue === 'string') {
                result = String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
            } else {
                result = false;
            }
            break;
        case 'greater_than':
            result = Number(fieldValue) > Number(compareValue);
            break;
        case 'less_than':
            result = Number(fieldValue) < Number(compareValue);
            break;
        case 'is_empty':
            result = isEmpty(fieldValue);
            break;
        case 'is_not_empty':
            result = !isEmpty(fieldValue);
            break;
        default:
            result = false;
    }

    return condition.negate ? !result : result;
};

/**
 * Evaluate a condition group (AND / OR / NOT logic) recursively.
 */
export const evaluateConditionGroup = (group: ConditionGroup, data: Record<string, unknown>): boolean => {
    if (!group || !group.conditions) return true;

    const results = group.conditions.map((item: FieldCondition | ConditionGroup) => {
        if ('logic' in item) {
            return evaluateConditionGroup(item, data);
        } else {
            return evaluateCondition(item, data);
        }
    });

    if (group.logic === 'NOT') {
        return !results.every((r: boolean) => r);
    }

    return group.logic === 'AND'
        ? results.every((r: boolean) => r)
        : results.some((r: boolean) => r);
};

/**
 * Recursively collect all flat FieldCondition items from a condition group tree.
 */
export const collectConditions = (group?: ConditionGroup): FieldCondition[] => {
    if (!group) return [];
    const items: FieldCondition[] = [];
    for (const condition of group.conditions) {
        if ('logic' in condition) {
            items.push(...collectConditions(condition as ConditionGroup));
        } else {
            items.push(condition as FieldCondition);
        }
    }
    return items;
};

// ─── Element State Computation ───────────────────────────────────────────────

export interface ElementState {
    isVisible: boolean;
    isRequired: boolean;
    isDisabled: boolean;
    pendingValues: Record<string, unknown>;
}

/**
 * Compute the visibility, required, and disabled state of a form element
 * based on its conditions and the current form data.
 *
 * Returns pending set_value changes instead of calling setFormData directly
 * (fixes audit item FB-17 — no setState during render).
 */
export const computeElementState = (
    element: { id: string; required: boolean; conditions?: ConditionGroup },
    data: Record<string, unknown>
): ElementState => {
    let isVisible = element.conditions ? evaluateConditionGroup(element.conditions, data) : true;
    let isRequired = element.required;
    let isDisabled = false;
    let hasShow = false;
    let hasHide = false;
    const pendingValues: Record<string, unknown> = {};

    const applyAction = (action?: FieldCondition['action'] | FieldCondition['elseAction']) => {
        if (!action || action === 'none') return;
        switch (action) {
            case 'show':
                hasShow = true;
                break;
            case 'hide':
                hasHide = true;
                break;
            case 'require':
                isRequired = true;
                break;
            case 'disable':
                isDisabled = true;
                break;
            case 'enable':
                isDisabled = false;
                break;
            default:
                break;
        }
    };

    if (element.conditions) {
        const conditions = collectConditions(element.conditions);
        for (const condition of conditions) {
            const met = evaluateCondition(condition, data);
            if (met) {
                applyAction(condition.action);
                if (condition.action === 'set_value' && condition.value !== undefined) {
                    pendingValues[element.id] = condition.value;
                }
            } else {
                applyAction(condition.elseAction);
                if (condition.elseAction === 'set_value' && condition.value !== undefined) {
                    pendingValues[element.id] = condition.value;
                }
            }
        }
    }

    if (hasHide) {
        isVisible = false;
    } else if (hasShow) {
        isVisible = true;
    }

    if (isDisabled) {
        isRequired = false;
    }

    return { isVisible, isRequired, isDisabled, pendingValues };
};

// ─── Operator Helpers ────────────────────────────────────────────────────────

/**
 * Return valid condition operators for a given field type.
 * Used by ConditionBuilder, FormBuilder validation, and FormPreview.
 */
export const getValidOperators = (fieldType: string): FieldCondition['operator'][] => {
    switch (fieldType) {
        case 'text':
        case 'textarea':
        case 'email':
        case 'select':
        case 'radio':
            return ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty'];
        case 'number':
            return ['equals', 'not_equals', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'];
        case 'date':
            return ['equals', 'not_equals', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'];
        case 'checkbox':
            return ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty'];
        case 'file':
            return ['is_empty', 'is_not_empty'];
        default:
            return ['equals', 'not_equals', 'is_empty', 'is_not_empty'];
    }
};

/**
 * Format an operator string for display: replaces all underscores with spaces.
 * Fixes audit item FB-04 (replace('_', ' ') only replaces the first underscore).
 */
export const formatOperator = (op: string): string => {
    return op.replaceAll('_', ' ');
};

// ─── File Helpers ────────────────────────────────────────────────────────────

/**
 * Normalize a value to a File array (from FileList, array, or null).
 */
export const normalizeFileList = (value: unknown): File[] => {
    if (!value) return [];
    if (typeof FileList !== 'undefined' && value instanceof FileList) return Array.from(value);
    if (Array.isArray(value)) return value as File[];
    return [];
};

// ─── Field Name Generation ───────────────────────────────────────────────────

/**
 * Generate a machine-safe field name from a label string.
 * Shared between FormBuilder, FieldConfigurator, and backend FormService.
 */
export const generateFieldName = (label: string): string => {
    if (!label) return 'field';
    return label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
};
