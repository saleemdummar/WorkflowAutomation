'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { crossFieldValidationApi } from '../lib/api';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import type { CrossFieldValidationRule } from '../lib/api/types';

interface Props {
    formId: string;
    fields: Array<{ id: string; label: string; type: string }>;
}

type ValidationType = 'comparison' | 'sum' | 'daterange' | 'custom';

export default function CrossFieldValidation({ formId, fields }: Props) {
    const [confirmAction, ConfirmDialog] = useConfirmDialog();
    const [rules, setRules] = useState<CrossFieldValidationRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

    const [ruleName, setRuleName] = useState('');
    const [validationType, setValidationType] = useState<ValidationType>('comparison');
    const [errorMessage, setErrorMessage] = useState('');
    const [executionOrder, setExecutionOrder] = useState(0);

    const [compField1, setCompField1] = useState('');
    const [compOperator, setCompOperator] = useState('lessThan');
    const [compField2, setCompField2] = useState('');

    const [sumFields, setSumFields] = useState<string[]>([]);
    const [sumTotalField, setSumTotalField] = useState('');
    const [sumTolerance, setSumTolerance] = useState('0.01');

    const [dateStartField, setDateStartField] = useState('');
    const [dateEndField, setDateEndField] = useState('');
    const [dateMinDays, setDateMinDays] = useState('');
    const [dateMaxDays, setDateMaxDays] = useState('');

    const [customExpression, setCustomExpression] = useState('');
    const [customFields, setCustomFields] = useState<string[]>([]);

    const loadRules = useCallback(async () => {
        try {
            setLoading(true);
            const data = await crossFieldValidationApi.getByForm(formId);
            setRules(data);
            setError(null);
        } catch (err: unknown) {
            const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load validation rules';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [formId]);

    useEffect(() => {
        loadRules();
    }, [loadRules]);

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);

            let ruleConfiguration = '';

            switch (validationType) {
                case 'comparison':
                    ruleConfiguration = JSON.stringify({
                        field1: compField1,
                        operator: compOperator,
                        field2: compField2,
                    });
                    break;

                case 'sum':
                    ruleConfiguration = JSON.stringify({
                        fields: sumFields,
                        totalField: sumTotalField,
                        tolerance: parseFloat(sumTolerance),
                    });
                    break;

                case 'daterange':
                    ruleConfiguration = JSON.stringify({
                        startDateField: dateStartField,
                        endDateField: dateEndField,
                        minDays: dateMinDays ? parseInt(dateMinDays) : null,
                        maxDays: dateMaxDays ? parseInt(dateMaxDays) : null,
                    });
                    break;

                case 'custom':
                    ruleConfiguration = JSON.stringify({
                        expression: customExpression,
                        requiredFields: customFields,
                    });
                    break;
            }

            if (editingRuleId) {
                await crossFieldValidationApi.update(editingRuleId, {
                    ruleName,
                    validationType,
                    ruleConfiguration,
                    errorMessage,
                    executionOrder,
                });
            } else {
                await crossFieldValidationApi.create({
                    formId,
                    ruleName,
                    validationType,
                    ruleConfiguration,
                    errorMessage,
                    executionOrder,
                });
            }

            setError(null);
            resetForm();
            await loadRules();
        } catch (err: unknown) {
            const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create validation rule';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!(await confirmAction({ message: 'Are you sure you want to delete this validation rule?' }))) return;

        try {
            setLoading(true);
            await crossFieldValidationApi.delete(ruleId);
            setError(null);
            if (editingRuleId === ruleId) resetForm();
            await loadRules();
        } catch (err: unknown) {
            const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete validation rule';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleEditRule = (rule: CrossFieldValidationRule) => {
        setEditingRuleId(rule.id);
        setRuleName(rule.ruleName);
        setValidationType(rule.validationType as ValidationType);
        setErrorMessage(rule.errorMessage);
        setExecutionOrder(rule.executionOrder);
        try {
            const config = JSON.parse(rule.ruleConfiguration);
            switch (rule.validationType) {
                case 'comparison':
                    setCompField1(config.field1 || '');
                    setCompOperator(config.operator || 'lessThan');
                    setCompField2(config.field2 || '');
                    break;
                case 'sum':
                    setSumFields(config.fields || []);
                    setSumTotalField(config.totalField || '');
                    setSumTolerance(String(config.tolerance ?? '0.01'));
                    break;
                case 'daterange':
                    setDateStartField(config.startDateField || '');
                    setDateEndField(config.endDateField || '');
                    setDateMinDays(config.minDays != null ? String(config.minDays) : '');
                    setDateMaxDays(config.maxDays != null ? String(config.maxDays) : '');
                    break;
                case 'custom':
                    setCustomExpression(config.expression || '');
                    setCustomFields(config.requiredFields || []);
                    break;
            }
        } catch { /* ignore parse errors */ }
    };

    const resetForm = () => {
        setEditingRuleId(null);
        setRuleName('');
        setErrorMessage('');
        setExecutionOrder(0);
        setCompField1('');
        setCompField2('');
        setCompOperator('lessThan');
        setSumFields([]);
        setSumTotalField('');
        setDateStartField('');
        setDateEndField('');
        setDateMinDays('');
        setDateMaxDays('');
        setCustomExpression('');
        setCustomFields([]);
    };

    const renderConfigForm = () => {
        switch (validationType) {
            case 'comparison':
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Field 1</label>
                                <select
                                    value={compField1}
                                    onChange={(e) => setCompField1(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                >
                                    <option value="">Select field...</option>
                                    {fields.map((f) => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                                <select
                                    value={compOperator}
                                    onChange={(e) => setCompOperator(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="lessThan">&lt; (less than)</option>
                                    <option value="lessThanOrEqual">&lt;= (less or equal)</option>
                                    <option value="equals">= (equals)</option>
                                    <option value="notEquals">≠ (not equals)</option>
                                    <option value="greaterThan">&gt; (greater than)</option>
                                    <option value="greaterThanOrEqual">&gt;= (greater or equal)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Field 2</label>
                                <select
                                    value={compField2}
                                    onChange={(e) => setCompField2(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                >
                                    <option value="">Select field...</option>
                                    {fields.map((f) => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600">Example: Start Date &lt; End Date</p>
                    </div>
                );

            case 'sum':
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fields to Sum</label>
                            <select
                                multiple
                                value={sumFields}
                                onChange={(e) => setSumFields(Array.from(e.target.selectedOptions, (o) => o.value))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
                                required
                            >
                                {fields.filter((f) => f.type === 'number').map((f) => (
                                    <option key={f.id} value={f.id}>{f.label}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Field</label>
                                <select
                                    value={sumTotalField}
                                    onChange={(e) => setSumTotalField(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                >
                                    <option value="">Select field...</option>
                                    {fields.filter((f) => f.type === 'number').map((f) => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tolerance</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={sumTolerance}
                                    onChange={(e) => setSumTolerance(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                        </div>
                        <p className="text-sm text-gray-600">Example: Item1 + Item2 + Item3 = Total</p>
                    </div>
                );

            case 'daterange':
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date Field</label>
                                <select
                                    value={dateStartField}
                                    onChange={(e) => setDateStartField(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                >
                                    <option value="">Select field...</option>
                                    {fields.filter((f) => f.type === 'date').map((f) => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date Field</label>
                                <select
                                    value={dateEndField}
                                    onChange={(e) => setDateEndField(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                >
                                    <option value="">Select field...</option>
                                    {fields.filter((f) => f.type === 'date').map((f) => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min Days (optional)</label>
                                <input
                                    type="number"
                                    value={dateMinDays}
                                    onChange={(e) => setDateMinDays(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Days (optional)</label>
                                <input
                                    type="number"
                                    value={dateMaxDays}
                                    onChange={(e) => setDateMaxDays(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'custom':
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                JavaScript Expression (must return true/false)
                            </label>
                            <textarea
                                value={customExpression}
                                onChange={(e) => setCustomExpression(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                                rows={4}
                                placeholder="e.g., fieldValues.price * fieldValues.quantity <= 1000"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Required Fields</label>
                            <select
                                multiple
                                value={customFields}
                                onChange={(e) => setCustomFields(Array.from(e.target.selectedOptions, (o) => o.value))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
                            >
                                {fields.map((f) => (
                                    <option key={f.id} value={f.id}>{f.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-fcc-midnight border border-fcc-border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">
                        {editingRuleId ? 'Edit Cross-Field Validation Rule' : 'Create Cross-Field Validation Rule'}
                    </h3>
                    {editingRuleId && (
                        <button onClick={resetForm} className="px-3 py-1 border border-fcc-border text-gray-400 text-sm hover:text-white hover:border-white transition-colors">
                            Cancel Edit
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleCreateRule} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Rule Name</label>
                            <input
                                type="text"
                                value={ruleName}
                                onChange={(e) => setRuleName(e.target.value)}
                                className="w-full bg-fcc-charcoal border border-fcc-border text-white px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-fcc-gold"
                                placeholder="e.g., Date Range Validation"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Validation Type</label>
                            <select
                                value={validationType}
                                onChange={(e) => setValidationType(e.target.value as ValidationType)}
                                className="w-full bg-fcc-charcoal border border-fcc-border text-white px-3 py-2 focus:outline-none focus:border-fcc-gold"
                            >
                                <option value="comparison">Field Comparison</option>
                                <option value="sum">Sum Validation</option>
                                <option value="daterange">Date Range</option>
                                <option value="custom">Custom Expression</option>
                            </select>
                        </div>
                    </div>

                    {renderConfigForm()}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Error Message</label>
                        <input
                            type="text"
                            value={errorMessage}
                            onChange={(e) => setErrorMessage(e.target.value)}
                            className="w-full bg-fcc-charcoal border border-fcc-border text-white px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-fcc-gold"
                            placeholder="Message to show when validation fails"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Execution Order</label>
                            <input
                                type="number"
                                value={executionOrder}
                                onChange={(e) => setExecutionOrder(parseInt(e.target.value))}
                                className="w-full bg-fcc-charcoal border border-fcc-border text-white px-3 py-2 focus:outline-none focus:border-fcc-gold"
                            />
                            <p className="text-xs text-gray-500 mt-1">Lower numbers execute first</p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Saving...' : editingRuleId ? 'Update Rule' : 'Create Rule'}
                    </button>
                </form>
            </div>

            <div className="bg-fcc-midnight border border-fcc-border p-6">
                <h3 className="text-lg font-bold text-white mb-4">Existing Validation Rules</h3>

                {loading && rules.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">Loading rules...</div>
                ) : rules.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No validation rules configured yet</div>
                ) : (
                    <div className="space-y-3">
                        {rules.map((rule) => (
                            <div key={rule.id} className="p-4 border border-fcc-border bg-fcc-charcoal">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <h4 className="font-bold text-white">{rule.ruleName}</h4>
                                            <span className="px-2 py-0.5 text-xs bg-fcc-gold text-fcc-charcoal font-bold">
                                                {rule.validationType}
                                            </span>
                                            <span className="text-xs text-gray-400">Order: {rule.executionOrder}</span>
                                        </div>
                                        <p className="text-sm text-gray-400 mt-1">{rule.errorMessage}</p>
                                        <details className="mt-2">
                                            <summary className="text-sm text-fcc-gold cursor-pointer">View Configuration</summary>
                                            <pre className="mt-2 p-2 bg-fcc-midnight border border-fcc-border text-xs text-gray-300 overflow-x-auto">
                                                {JSON.stringify(JSON.parse(rule.ruleConfiguration), null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => handleEditRule(rule)}
                                            className="text-sm text-fcc-gold hover:text-yellow-300 font-bold"
                                            disabled={loading}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="text-sm text-red-500 hover:text-red-300 font-bold"
                                            disabled={loading}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <ConfirmDialog />
        </div>
    );
}
