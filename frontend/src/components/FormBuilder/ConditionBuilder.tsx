'use client';

import React, { useState } from 'react';
import { FieldCondition, FormElement, ConditionGroup, FormElementType } from '../../types/form-builder';
import { Plus, X, Settings, ChevronDown, ChevronRight, FolderPlus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getValidOperators, formatOperator, collectConditions } from '../../lib/formConditionUtils';

interface ConditionBuilderProps {
    elements: FormElement[];
    conditions: ConditionGroup | undefined;
    onConditionsChange: (conditions: ConditionGroup | undefined) => void;
    currentElementId: string;
}

interface ConditionItemProps {
    item: FieldCondition | ConditionGroup;
    index: number;
    depth: number;
    availableFields: FormElement[];
    onUpdate: (index: number, updates: Partial<FieldCondition | ConditionGroup>) => void;
    onRemove: (index: number) => void;
    onAddCondition: (parentIndex?: number) => void;
    onAddGroup: (parentIndex?: number) => void;
}

const ConditionItem: React.FC<ConditionItemProps> = ({
    item,
    index,
    depth,
    availableFields,
    onUpdate,
    onRemove,
    onAddCondition,
    onAddGroup
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const validateCondition = (condition: FieldCondition): string[] => {
        const errors: string[] = [];

        if (!condition.fieldId) {
            errors.push('Field is required');
        } else {
            const field = availableFields.find(f => f.id === condition.fieldId);
            if (!field) {
                errors.push('Field does not exist');
            } else {
                const validOperators = getValidOperators(field.type as FormElementType as FormElementType);
                if (!validOperators.includes(condition.operator)) {
                    errors.push(`Operator '${condition.operator}' not valid for ${field.type} field`);
                }

                if (condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty') {
                    if (condition.value === '') {
                        errors.push('Value is required');
                    } else if (field.type === 'number' && isNaN(Number(condition.value))) {
                        errors.push('Value must be a number');
                    }
                }
            }
        }

        return errors;
    };

    if ('logic' in item) {
        const group = item as ConditionGroup;
        return (
            <div className={`border-l-2 border-fcc-gold pl-4 ${depth > 0 ? 'ml-4' : ''}`}>
                <div className="flex items-center space-x-2 mb-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-400 hover:text-white"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <select
                        value={group.logic}
                        onChange={(e) => onUpdate(index, { logic: e.target.value as 'AND' | 'OR' | 'NOT' })}
                        className="bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                    >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                        <option value="NOT">NOT</option>
                    </select>
                    <span className="text-xs text-gray-400">{group.logic === 'NOT' ? 'Negate Group' : 'Group'}</span>
                    <button
                        onClick={() => onRemove(index)}
                        className="text-red-400 hover:text-red-300"
                    >
                        <X size={14} />
                    </button>
                </div>

                {isExpanded && (
                    <div className="space-y-2">
                        {group.conditions.map((subItem, subIndex) => (
                            <ConditionItem
                                key={`${index}-${subIndex}`}
                                item={subItem}
                                index={subIndex}
                                depth={depth + 1}
                                availableFields={availableFields}
                                onUpdate={(subIdx, updates) => {
                                    const newConditions = [...group.conditions];
                                    newConditions[subIdx] = { ...newConditions[subIdx], ...updates };
                                    onUpdate(index, { conditions: newConditions });
                                }}
                                onRemove={(subIdx) => {
                                    const newConditions = group.conditions.filter((_, i) => i !== subIdx);
                                    onUpdate(index, { conditions: newConditions });
                                }}
                                onAddCondition={(parentIdx) => {
                                    const newCondition: FieldCondition = {
                                        fieldId: availableFields[0]?.id || '',
                                        operator: 'equals',
                                        value: '',
                                        action: 'show',
                                        elseAction: 'none'
                                    };
                                    const newConditions = [...group.conditions, newCondition];
                                    onUpdate(index, { conditions: newConditions });
                                }}
                                onAddGroup={(parentIdx) => {
                                    const newGroup: ConditionGroup = {
                                        id: uuidv4(),
                                        logic: 'AND',
                                        conditions: []
                                    };
                                    const newConditions = [...group.conditions, newGroup];
                                    onUpdate(index, { conditions: newConditions });
                                }}
                            />
                        ))}

                        <div className="flex space-x-2 ml-6">
                            <button
                                onClick={() => {
                                    // Add condition to THIS group, not parent (fixes FB-03)
                                    const newCondition: FieldCondition = {
                                        fieldId: availableFields[0]?.id || '',
                                        operator: 'equals',
                                        value: '',
                                        action: 'show',
                                        elseAction: 'none'
                                    };
                                    const newConditions = [...group.conditions, newCondition];
                                    onUpdate(index, { conditions: newConditions });
                                }}
                                className="flex items-center space-x-1 text-fcc-gold hover:text-white transition-colors text-xs"
                                disabled={availableFields.length === 0}
                            >
                                <Plus size={12} />
                                <span>Add Condition</span>
                            </button>
                            <button
                                onClick={() => {
                                    // Add sub-group to THIS group, not parent (fixes FB-03)
                                    const newGroup: ConditionGroup = {
                                        id: uuidv4(),
                                        logic: 'AND',
                                        conditions: []
                                    };
                                    const newConditions = [...group.conditions, newGroup];
                                    onUpdate(index, { conditions: newConditions });
                                }}
                                className="flex items-center space-x-1 text-fcc-gold hover:text-white transition-colors text-xs"
                            >
                                <FolderPlus size={12} />
                                <span>Add Group</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    } else {
        const condition = item as FieldCondition;
        const errors = validateCondition(condition);
        const hasErrors = errors.length > 0;

        return (
            <div className={`${depth > 0 ? 'ml-4' : ''}`}>
                <div className={`flex items-center space-x-2 p-2 bg-fcc-midnight rounded border ${hasErrors ? 'border-red-500' : 'border-transparent'}`}>
                    <span className="text-xs text-gray-400">If</span>
                    <select
                        value={condition.fieldId}
                        onChange={(e) => onUpdate(index, { fieldId: e.target.value })}
                        className={`bg-fcc-charcoal border text-white text-sm px-2 py-1 rounded ${hasErrors && !condition.fieldId ? 'border-red-500' : 'border-fcc-border'
                            }`}
                    >
                        <option value="">Select field...</option>
                        {availableFields.map(field => (
                            <option key={field.id} value={field.id}>{field.label}</option>
                        ))}
                    </select>
                    <select
                        value={condition.operator}
                        onChange={(e) => onUpdate(index, { operator: e.target.value as FieldCondition['operator'] })}
                        className="bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                    >
                        {getValidOperators(availableFields.find(f => f.id === condition.fieldId)?.type as FormElementType || 'text').map(op => (
                            <option key={op} value={op}>
                                {formatOperator(op)}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={String(condition.value)}
                        onChange={(e) => onUpdate(index, { value: e.target.value })}
                        disabled={condition.operator === 'is_empty' || condition.operator === 'is_not_empty'}
                        className={`bg-fcc-charcoal border text-white text-sm px-2 py-1 rounded flex-1 ${hasErrors && condition.value === '' ? 'border-red-500' : 'border-fcc-border'
                            }`}
                        placeholder="value"
                    />
                    <span className="text-xs text-gray-400">then</span>
                    <select
                        value={condition.action}
                        onChange={(e) => onUpdate(index, { action: e.target.value as FieldCondition['action'] })}
                        className="bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                    >
                        <option value="show">show</option>
                        <option value="hide">hide</option>
                        <option value="require">require</option>
                        <option value="disable">disable</option>
                        <option value="enable">enable</option>
                        <option value="set_value">set value</option>
                    </select>
                    <span className="text-xs text-gray-400">else</span>
                    <select
                        value={condition.elseAction ?? 'none'}
                        onChange={(e) => onUpdate(index, { elseAction: e.target.value as FieldCondition['elseAction'] })}
                        className="bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                    >
                        <option value="none">none</option>
                        <option value="show">show</option>
                        <option value="hide">hide</option>
                        <option value="require">require</option>
                        <option value="disable">disable</option>
                        <option value="enable">enable</option>
                        <option value="set_value">set value</option>
                    </select>
                    <button
                        onClick={() => onRemove(index)}
                        className="text-red-400 hover:text-red-300"
                    >
                        <X size={16} />
                    </button>
                </div>
                {hasErrors && (
                    <div className="mt-1 ml-2">
                        {errors.map((error, i) => (
                            <div key={i} className="text-xs text-red-400">• {error}</div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
};

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
    elements,
    conditions,
    onConditionsChange,
    currentElementId
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const availableFields = elements.filter(el => el.id !== currentElementId);

    // Use shared getValidOperators from formConditionUtils

    // Use shared collectConditions from formConditionUtils

    const validateAllConditions = (): string[] => {
        if (!conditions) return [];
        const errors: string[] = [];
        const allConditions = collectConditions(conditions);

        allConditions.forEach((condition) => {
            if (!condition.fieldId) {
                errors.push('Condition field is required');
                return;
            }

            const field = availableFields.find(f => f.id === condition.fieldId);
            if (!field) {
                errors.push('Condition references a missing field');
                return;
            }

            const validOperators = getValidOperators(field.type);
            if (!validOperators.includes(condition.operator)) {
                errors.push(`Operator '${condition.operator}' not valid for ${field.type}`);
            }

            if (condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty') {
                if (condition.value === '') {
                    errors.push('Condition value is required');
                } else if (field.type === 'number' && isNaN(Number(condition.value))) {
                    errors.push('Condition value must be a number');
                }
            }
        });

        return errors;
    };

    const conditionErrors = validateAllConditions();

    const initializeConditions = () => {
        const initialGroup: ConditionGroup = {
            id: uuidv4(),
            logic: 'AND',
            conditions: []
        };
        onConditionsChange(initialGroup);
    };

    const addCondition = () => {
        if (!conditions) {
            initializeConditions();
            return;
        }
        const newCondition: FieldCondition = {
            fieldId: availableFields[0]?.id || '',
            operator: 'equals',
            value: '',
            action: 'show',
            elseAction: 'none'
        };
        const newConditions = [...conditions.conditions, newCondition];
        onConditionsChange({ ...conditions, conditions: newConditions });
    };

    const addGroup = () => {
        if (!conditions) {
            initializeConditions();
            return;
        }
        const newGroup: ConditionGroup = {
            id: uuidv4(),
            logic: 'AND',
            conditions: []
        };
        const newConditions = [...conditions.conditions, newGroup];
        onConditionsChange({ ...conditions, conditions: newConditions });
    };

    const updateCondition = (index: number, updates: Partial<FieldCondition | ConditionGroup>) => {
        if (!conditions) return;
        const newConditions = [...conditions.conditions];
        newConditions[index] = { ...newConditions[index], ...updates };
        onConditionsChange({ ...conditions, conditions: newConditions });
    };

    const removeCondition = (index: number) => {
        if (!conditions) return;
        const newConditions = conditions.conditions.filter((_, i) => i !== index);
        onConditionsChange({ ...conditions, conditions: newConditions });
    };

    const conditionCount = conditions?.conditions.length || 0;

    return (
        <div className="mt-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 text-sm text-fcc-gold hover:text-white transition-colors"
            >
                <Settings size={16} />
                <span>Conditional Logic ({conditionCount})</span>
            </button>

            {isOpen && (
                <div className="mt-3 p-4 bg-fcc-charcoal border border-fcc-border rounded">
                    {conditionErrors.length > 0 && (
                        <div className="mb-3 p-3 border border-red-500 bg-red-500/10 rounded">
                            <p className="text-xs font-bold text-red-300 mb-1">Fix these condition issues:</p>
                            <ul className="text-xs text-red-300 list-disc pl-4 space-y-1">
                                {conditionErrors.map((error, i) => (
                                    <li key={i}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!conditions ? (
                        <div className="text-center py-4">
                            <p className="text-gray-400 text-sm mb-3">No conditions set up yet</p>
                            <button
                                onClick={initializeConditions}
                                className="flex items-center space-x-2 text-fcc-gold hover:text-white transition-colors text-sm mx-auto"
                            >
                                <Plus size={16} />
                                <span>Create Condition Group</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2 mb-4">
                                <span className="text-xs text-gray-400">All conditions must be</span>
                                <select
                                    value={conditions.logic}
                                    onChange={(e) => onConditionsChange({ ...conditions, logic: e.target.value as 'AND' | 'OR' | 'NOT' })}
                                    className="bg-fcc-charcoal border border-fcc-border text-white text-sm px-2 py-1 rounded"
                                >
                                    <option value="AND">AND</option>
                                    <option value="OR">OR</option>
                                    <option value="NOT">NOT (negate)</option>
                                </select>
                                <span className="text-xs text-gray-400">{conditions.logic === 'NOT' ? '' : 'true'}</span>
                            </div>

                            {conditions.conditions.map((item, index) => (
                                <ConditionItem
                                    key={index}
                                    item={item}
                                    index={index}
                                    depth={0}
                                    availableFields={availableFields}
                                    onUpdate={updateCondition}
                                    onRemove={removeCondition}
                                    onAddCondition={addCondition}
                                    onAddGroup={addGroup}
                                />
                            ))}

                            <div className="flex space-x-2">
                                <button
                                    onClick={addCondition}
                                    className="flex items-center space-x-2 text-fcc-gold hover:text-white transition-colors text-sm"
                                    disabled={availableFields.length === 0}
                                >
                                    <Plus size={16} />
                                    <span>Add Condition</span>
                                </button>
                                <button
                                    onClick={addGroup}
                                    className="flex items-center space-x-2 text-fcc-gold hover:text-white transition-colors text-sm"
                                >
                                    <FolderPlus size={16} />
                                    <span>Add Group</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
