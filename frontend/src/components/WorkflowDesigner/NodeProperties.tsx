'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Node } from 'reactflow';
import { X, Trash2, Settings } from 'lucide-react';
import { formsApi, rolesAdminApi, usersAdminApi } from '@/lib/api';
import { Form } from '@/types/entities';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

interface User {
    id: string;
    name?: string;
    email?: string;
    username?: string;
}

interface FormField {
    id: string;
    label?: string;
    name: string;
    type?: string;
    options?: Array<{ value?: string; label?: string } | string>;
}

interface RoleDto {
    id: string;
    name: string;
    description?: string;
    composite: boolean;
    clientRole: boolean;
}



interface NodePropertiesProps {
    node: Node | null;
    onUpdate: (nodeId: string, updates: Record<string, unknown>) => void;
    onDelete: (nodeId: string) => void;
    onClose: () => void;
    workflowId?: string;
}

export const NodeProperties: React.FC<NodePropertiesProps> = ({
    node,
    onUpdate,
    onDelete,
    onClose,
    workflowId,
}) => {
    const [confirmAction, ConfirmDialog] = useConfirmDialog();
    const [label, setLabel] = useState(node?.data?.label || '');
    const [config, setConfig] = useState(node?.data?.config || {});
    const [forms, setForms] = useState<Form[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [loadingForms, setLoadingForms] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [loadingFields, setLoadingFields] = useState(false);

    useEffect(() => {
        setLabel(node?.data?.label || '');
        setConfig(node?.data?.config || {});
    }, [node]);

    useEffect(() => {
        loadForms();
    }, []);

    // Only load users when an approval node is selected (fixes WF-07)
    useEffect(() => {
        if (node?.type === 'approval') {
            if (users.length === 0) {
                loadUsers();
            }
            if (roles.length === 0) {
                loadRoles();
            }
        }
    }, [node?.type]);

    useEffect(() => {
        if (typeof config.formId === 'string' && config.formId) {
            loadFormFields(config.formId);
        } else {
            setFormFields([]);
        }
    }, [config.formId]);

    // Auto-generate condition expression from simple mode configs
    useEffect(() => {
        if (node?.type === 'condition' && config.conditionMode === 'simple' && config.field && config.operator && config.value !== undefined && config.value !== '') {
            const fieldAccess = `fields[${JSON.stringify(config.field)}]`;
            let expression = '';
            switch (config.operator) {
                case 'equals':
                    expression = `${fieldAccess} == ${typeof config.value === 'string' ? `'${config.value}'` : config.value}`;
                    break;
                case 'notequals':
                    expression = `${fieldAccess} != ${typeof config.value === 'string' ? `'${config.value}'` : config.value}`;
                    break;
                case 'greaterthan':
                    expression = `${fieldAccess} > ${typeof config.value === 'string' ? `'${config.value}'` : config.value}`;
                    break;
                case 'lessthan':
                    expression = `${fieldAccess} < ${typeof config.value === 'string' ? `'${config.value}'` : config.value}`;
                    break;
                case 'contains':
                    expression = `String(${fieldAccess} ?? '').includes(${typeof config.value === 'string' ? `'${config.value}'` : config.value})`;
                    break;
                default:
                    expression = `${fieldAccess} ${config.operator} ${typeof config.value === 'string' ? `'${config.value}'` : config.value}`;
                    break;
            }
            if (expression !== config.condition) {
                handleConfigChange('condition', expression);
            }
        }
    }, [config.field, config.operator, config.value, config.conditionMode, node?.type]);

    const loadForms = async () => {
        try {
            setLoadingForms(true);
            const formsData = await formsApi.getAll();
            setForms(formsData);
        } catch (error) {
            console.error('Failed to load forms:', error);
        } finally {
            setLoadingForms(false);
        }
    };

    const loadUsers = async () => {
        try {
            setLoadingUsers(true);
            const usersData = await usersAdminApi.getAll({ max: 1000 });
            setUsers(usersData);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const loadRoles = async () => {
        try {
            setLoadingRoles(true);
            const roleData = await rolesAdminApi.getAll();
            const filteredRoles = (Array.isArray(roleData) ? roleData : [])
                .filter(
                    (role: RoleDto) =>
                        !role.name.startsWith('default-roles') &&
                        role.name !== 'offline_access' &&
                        role.name !== 'uma_authorization'
                )
                .map((role: RoleDto) => role.name);
            setRoles(filteredRoles);
        } catch (error) {
            console.error('Failed to load roles:', error);
        } finally {
            setLoadingRoles(false);
        }
    };

    const loadFormFields = async (formId: string) => {
        try {
            setLoadingFields(true);
            const apiFields = await formsApi.getFields(formId);
            const fields: FormField[] = apiFields.map((f) => ({
                id: f.id,
                name: f.fieldName,
                label: f.fieldLabel,
                type: f.fieldType,
                options: f.options ? (() => { try { return JSON.parse(f.options); } catch { return undefined; } })() : undefined,
            }));
            setFormFields(fields);
        } catch (error) {
            console.error('Failed to load form fields:', error);
            setFormFields([]);
        } finally {
            setLoadingFields(false);
        }
    };

    if (!node) return null;

    const fieldFromConfig = formFields.find(
        (field) => (field.name || field.label || field.id) === config.field,
    );
    const selectedFieldType = String(fieldFromConfig?.type || '').toLowerCase();
    const selectedFieldOptions = Array.isArray(fieldFromConfig?.options)
        ? fieldFromConfig.options
            .map((option) => (typeof option === 'string'
                ? { value: option, label: option }
                : { value: option.value || option.label || '', label: option.label || option.value || '' }))
            .filter((option) => option.value)
        : [];

    const conditionOperators = [
        { value: 'equals', label: 'Equals' },
        { value: 'notequals', label: 'Not Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'greaterthan', label: 'Greater Than' },
        { value: 'lessthan', label: 'Less Than' },
    ];

    const handleConfigChange = (key: string, value: unknown) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        onUpdate(node.id, { label, config: newConfig });
    };

    const renderConfigFields = () => {
        switch (node.type) {
            case 'trigger':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Trigger Type
                            </label>
                            <select
                                value={config.triggerType || 'form_submission'}
                                onChange={(e) => handleConfigChange('triggerType', e.target.value)}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                            >
                                <option value="form_submission">Form Submission</option>
                                <option value="schedule">Scheduled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Form (optional)
                            </label>
                            <select
                                value={config.formId || ''}
                                onChange={(e) => handleConfigChange('formId', e.target.value)}
                                disabled={loadingForms}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold disabled:opacity-50"
                            >
                                <option value="">Any form</option>
                                {forms.map((form) => (
                                    <option key={form.id} value={form.id}>
                                        {form.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {config.triggerType === 'schedule' && (
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Cron Expression
                                </label>
                                <input
                                    type="text"
                                    value={config.cronExpression || ''}
                                    onChange={(e) => handleConfigChange('cronExpression', e.target.value)}
                                    placeholder="e.g., */15 * * * *"
                                    className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Use standard 5-field cron format (min hour day month weekday).
                                </p>
                            </div>
                        )}
                    </div>
                );

            case 'condition':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Condition Mode
                            </label>
                            <select
                                value={config.conditionMode || (config.condition ? 'expression' : 'simple')}
                                onChange={(e) => handleConfigChange('conditionMode', e.target.value)}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                            >
                                <option value="simple">Simple (Field / Operator / Value)</option>
                                <option value="expression">JavaScript Expression</option>
                            </select>
                        </div>

                        {(config.conditionMode === 'expression') ? (
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Condition Expression
                                </label>
                                <textarea
                                    value={config.condition || ''}
                                    onChange={(e) => handleConfigChange('condition', e.target.value)}
                                    placeholder="e.g., amount > 1000"
                                    rows={4}
                                    className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold font-mono text-sm"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Use `fields["Field Name"]` for safe access to form values
                                </p>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Form (for field lookup)
                                    </label>
                                    <select
                                        value={config.formId || ''}
                                        onChange={(e) => handleConfigChange('formId', e.target.value)}
                                        disabled={loadingForms}
                                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold disabled:opacity-50"
                                    >
                                        <option value="">Select a form</option>
                                        {forms.map((form) => (
                                            <option key={form.id} value={form.id}>
                                                {form.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Field
                                    </label>
                                    {config.formId ? (
                                        <select
                                            value={config.field || ''}
                                            onChange={(e) => handleConfigChange('field', e.target.value)}
                                            disabled={loadingFields}
                                            className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold disabled:opacity-50"
                                        >
                                            <option value="">Select a field</option>
                                            {formFields.map((field) => (
                                                <option key={field.id} value={field.name || field.label || field.id}>
                                                    {field.label || field.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={config.field || ''}
                                            onChange={(e) => handleConfigChange('field', e.target.value)}
                                            placeholder="Field name (e.g., Total Amount)"
                                            className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Operator
                                    </label>
                                    <select
                                        value={config.operator || ''}
                                        onChange={(e) => handleConfigChange('operator', e.target.value)}
                                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                    >
                                        <option value="">Select operator</option>
                                        {conditionOperators.map((operator) => (
                                            <option key={operator.value} value={operator.value}>
                                                {operator.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Value
                                    </label>
                                    {selectedFieldOptions.length > 0 ? (
                                        <select
                                            value={config.value || ''}
                                            onChange={(e) => handleConfigChange('value', e.target.value)}
                                            className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                        >
                                            <option value="">Select value</option>
                                            {selectedFieldOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    ) : selectedFieldType === 'number' ? (
                                        <input
                                            type="number"
                                            value={config.value || ''}
                                            onChange={(e) => handleConfigChange('value', e.target.value)}
                                            placeholder="e.g., 1000"
                                            className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                        />
                                    ) : selectedFieldType === 'date' ? (
                                        <input
                                            type="date"
                                            value={config.value || ''}
                                            onChange={(e) => handleConfigChange('value', e.target.value)}
                                            className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={config.value || ''}
                                            onChange={(e) => handleConfigChange('value', e.target.value)}
                                            placeholder="e.g., 1000"
                                            className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                        />
                                    )}
                                </div>
                                <p className="text-xs text-gray-400">
                                    Evaluates: {config.field || '(field)'} {config.operator || '(operator)'} {config.value || '(value)'}
                                </p>
                            </>
                        )}
                    </div>
                );

            case 'action':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Action Type
                            </label>
                            <select
                                value={config.actionType || 'send_email'}
                                onChange={(e) => handleConfigChange('actionType', e.target.value)}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                            >
                                <option value="send_email">Send Email</option>
                                <option value="update_field">Update Field</option>
                                <option value="webhook">Call Webhook</option>
                                <option value="update_status">Update Submission Status</option>
                            </select>
                        </div>

                        {config.actionType === 'send_email' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Recipient Source
                                    </label>
                                    <select
                                        value={config.recipientSource || 'specific_email'}
                                        onChange={(e) => {
                                            const nextSource = e.target.value;
                                            const baseConfig = { ...config, recipientSource: nextSource };
                                            if (nextSource === 'workflow_initiator') {
                                                setConfig(baseConfig);
                                                onUpdate(node.id, { label, config: { ...baseConfig, toEmail: '{{submittedByEmail}}' } });
                                                return;
                                            }
                                            if (nextSource === 'specific_user' && users.length > 0) {
                                                const firstUser = users[0];
                                                const email = firstUser.email || '';
                                                const updatedConfig = { ...baseConfig, recipientUserId: firstUser.id, toEmail: email };
                                                setConfig(updatedConfig);
                                                onUpdate(node.id, { label, config: updatedConfig });
                                                return;
                                            }
                                            setConfig(baseConfig);
                                            onUpdate(node.id, { label, config: baseConfig });
                                        }}
                                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                    >
                                        <option value="specific_email">Specific Email Address</option>
                                        <option value="specific_user">Select Existing User</option>
                                        <option value="workflow_initiator">Workflow Initiator Email</option>
                                    </select>
                                </div>
                                {config.recipientSource === 'specific_user' && (
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Recipient User
                                        </label>
                                        <select
                                            value={config.recipientUserId || ''}
                                            onChange={(e) => {
                                                const user = users.find((item) => item.id === e.target.value);
                                                handleConfigChange('recipientUserId', e.target.value);
                                                handleConfigChange('toEmail', user?.email || '');
                                            }}
                                            disabled={loadingUsers}
                                            className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold disabled:opacity-50"
                                        >
                                            <option value="">Select a user</option>
                                            {users.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name || user.email || user.username}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        To Email
                                    </label>
                                    <input
                                        type="email"
                                        value={config.toEmail || ''}
                                        onChange={(e) => handleConfigChange('toEmail', e.target.value)}
                                        placeholder="user@example.com"
                                        disabled={config.recipientSource === 'workflow_initiator'}
                                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        value={config.subject || ''}
                                        onChange={(e) => handleConfigChange('subject', e.target.value)}
                                        placeholder="Email subject"
                                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Message
                                    </label>
                                    <textarea
                                        value={config.message || ''}
                                        onChange={(e) => handleConfigChange('message', e.target.value)}
                                        placeholder="Email message body"
                                        rows={4}
                                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                    />
                                </div>
                            </>
                        )}
                        {config.actionType === 'update_field' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Form
                                    </label>
                                    <select
                                        value={config.formId || ''}
                                        onChange={(e) => handleConfigChange('formId', e.target.value)}
                                        disabled={loadingForms}
                                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold disabled:opacity-50"
                                    >
                                        <option value="">Select a form</option>
                                        {forms.map((form) => (
                                            <option key={form.id} value={form.id}>
                                                {form.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {config.formId && (
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Field to Update
                                        </label>
                                        <select
                                            value={config.fieldId || ''}
                                            onChange={(e) => handleConfigChange('fieldId', e.target.value)}
                                            disabled={loadingFields}
                                            className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold disabled:opacity-50"
                                        >
                                            <option value="">Select a field</option>
                                            {formFields.map((field) => (
                                                <option key={field.id} value={field.id}>
                                                    {field.label || field.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Field Value
                                    </label>
                                    <input
                                        type="text"
                                        value={config.fieldValue || ''}
                                        onChange={(e) => handleConfigChange('fieldValue', e.target.value)}
                                        placeholder="New value"
                                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                    />
                                </div>
                            </>
                        )}
                        {config.actionType === 'webhook' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Webhook URL
                                    </label>
                                    <input
                                        type="text"
                                        value={config.webhookUrl || ''}
                                        onChange={(e) => handleConfigChange('webhookUrl', e.target.value)}
                                        placeholder="https://example.com/webhook"
                                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Method
                                    </label>
                                    <select
                                        value={config.method || 'POST'}
                                        onChange={(e) => handleConfigChange('method', e.target.value)}
                                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                    >
                                        <option value="POST">POST</option>
                                        <option value="PUT">PUT</option>
                                        <option value="GET">GET</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Headers (JSON)
                                    </label>
                                    <textarea
                                        value={config.headers || ''}
                                        onChange={(e) => handleConfigChange('headers', e.target.value)}
                                        placeholder='{"Authorization":"Bearer token"}'
                                        rows={3}
                                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold font-mono text-xs"
                                    />
                                </div>
                            </>
                        )}
                        {config.actionType === 'update_status' && (
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    New Status
                                </label>
                                <select
                                    value={config.status || 'Submitted'}
                                    onChange={(e) => handleConfigChange('status', e.target.value)}
                                    className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                >
                                    <option value="Submitted">Submitted</option>
                                    <option value="InProgress">In Progress</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Returned">Returned</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                        )}
                    </div>
                );

            case 'approval':
                return <ApprovalNodeConfig
                    config={config}
                    handleConfigChange={handleConfigChange}
                    onUpdate={onUpdate}
                    node={node}
                    label={label}
                    setConfig={setConfig}
                    users={users}
                    roles={roles}
                    loadingUsers={loadingUsers}
                    loadingRoles={loadingRoles}
                    workflowId={workflowId}
                />;

            case 'wait':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Wait Hours
                            </label>
                            <input
                                type="number"
                                value={config.waitHours || 0}
                                onChange={(e) => handleConfigChange('waitHours', parseInt(e.target.value) || 0)}
                                min="0"
                                placeholder="0"
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Wait Minutes
                            </label>
                            <input
                                type="number"
                                value={config.waitMinutes || 0}
                                onChange={(e) => handleConfigChange('waitMinutes', parseInt(e.target.value) || 0)}
                                min="0"
                                max="59"
                                placeholder="0"
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                            />
                        </div>
                        <p className="text-xs text-gray-400">
                            Total delay: {config.waitHours || 0}h {config.waitMinutes || 0}m
                            {((config.waitHours || 0) * 60 + (config.waitMinutes || 0)) > 1 &&
                                '. Delays over 1 minute are scheduled as background jobs.'}
                        </p>
                    </div>
                );

            case 'script':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                JavaScript Code
                            </label>
                            <textarea
                                value={config.script || ''}
                                onChange={(e) => handleConfigChange('script', e.target.value)}
                                placeholder={'// Access form fields as variables\n// e.g., amount, name, email\nvar result = amount * 1.1;'}
                                rows={8}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold font-mono text-sm"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                JavaScript executed via Jint engine. Use `fields["Field Name"]` for safe access.
                                Max 5s timeout, 1000 statement limit.
                            </p>
                        </div>
                    </div>
                );

            case 'end':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Completion Message
                            </label>
                            <input
                                type="text"
                                value={config.message || ''}
                                onChange={(e) => handleConfigChange('message', e.target.value)}
                                placeholder="Workflow completed successfully"
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Optional message displayed when the workflow reaches this end point.
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="hidden md:block w-60 lg:w-80 bg-fcc-charcoal border-l border-fcc-border p-4 lg:p-6 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Settings size={20} className="text-fcc-gold" />
                    <h3 className="text-lg font-bold text-white">Node Properties</h3>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <span className="px-3 py-1 bg-fcc-midnight text-fcc-gold text-sm font-medium rounded-full">
                        {node.type?.toUpperCase()}
                    </span>
                </div>
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        Node Label
                    </label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => {
                            setLabel(e.target.value);
                            onUpdate(node.id, { label: e.target.value, config });
                        }}
                        className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                    />
                </div>
                <div>
                    <h4 className="text-sm font-medium text-white mb-4">Configuration</h4>
                    {renderConfigFields()}
                </div>
                <button
                    onClick={async () => {
                        if (await confirmAction({ message: 'Are you sure you want to delete this node?' })) {
                            onDelete(node.id);
                        }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-colors"
                >
                    <Trash2 size={18} />
                    Delete Node
                </button>
            </div>
            <ConfirmDialog />
        </div>
    );
};

// Separate component for approval node config to keep things organized
interface ApprovalNodeConfigProps {
    config: Record<string, unknown>;
    handleConfigChange: (key: string, value: unknown) => void;
    onUpdate: (nodeId: string, updates: Record<string, unknown>) => void;
    node: Node;
    label: string;
    setConfig: (config: Record<string, unknown>) => void;
    users: User[];
    roles: string[];
    loadingUsers: boolean;
    loadingRoles: boolean;
    workflowId?: string;
}

const ApprovalNodeConfig: React.FC<ApprovalNodeConfigProps> = ({ config, handleConfigChange, onUpdate, node, label, setConfig, users, roles, loadingUsers, loadingRoles, workflowId }) => {
    const isMultiStep = Boolean(config.multiStep || (Array.isArray(config.steps) && config.steps.length > 0));
    const steps = Array.isArray(config.steps) ? config.steps : [];

    // Helper function to safely get string value from config
    const getStringValue = (obj: Record<string, unknown>, key: string, defaultValue: string = ''): string => {
        const value = obj[key];
        return typeof value === 'string' ? value : defaultValue;
    };

    // Helper function to safely get number value from config
    const getNumberValue = (obj: Record<string, unknown>, key: string, defaultValue: number): number => {
        const value = obj[key];
        return typeof value === 'number' ? value : defaultValue;
    };

    const updateSteps = (nextSteps: Array<Record<string, unknown>>) => {
        handleConfigChange('steps', nextSteps);
    };

    const handleStepChange = (index: number, key: string, value: unknown) => {
        const nextSteps = steps.map((step: Record<string, unknown>, idx: number) =>
            idx === index ? { ...step, [key]: value } : step
        );
        updateSteps(nextSteps);
    };

    const addStep = () => {
        updateSteps([
            ...steps,
            {
                stepName: `Step ${steps.length + 1}`,
                approverType: 'user',
                approverId: '',
                approvalType: 'any',
                deadlineHours: 24,
            },
        ]);
    };

    const removeStep = (index: number) => {
        const nextSteps = steps.filter((_step: unknown, idx: number) => idx !== index);
        updateSteps(nextSteps);
    };

    const toggleMultiStep = (enabled: boolean) => {
        if (enabled) {
            const initialSteps = steps.length > 0
                ? steps
                : [{
                    stepName: 'Step 1',
                    approverType: config.approverType || 'user',
                    approverId: config.approverId || '',
                    approvalType: config.approvalType || 'any',
                    deadlineHours: config.deadlineHours || 24,
                }];
            onUpdate(node.id, { label, config: { ...config, multiStep: true, steps: initialSteps } });
            setConfig({ ...config, multiStep: true, steps: initialSteps });
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { steps, ...rest } = config;
            onUpdate(node.id, { label, config: { ...rest, multiStep: false } });
            setConfig({ ...rest, multiStep: false });
        }
    };

    return (
        <div className="space-y-4">
            {workflowId && (
                <div className="p-3 bg-fcc-midnight border border-fcc-border rounded-lg flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400">Approval Escalation Rules</p>
                        <p className="text-sm text-white">Manage escalation settings for this workflow.</p>
                    </div>
                    <Link
                        href={`/admin/escalation-rules?workflowId=${workflowId}`}
                        className="px-3 py-1.5 text-xs font-bold text-fcc-charcoal bg-fcc-gold rounded hover:bg-yellow-400"
                    >
                        Open
                    </Link>
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    Approval Mode
                </label>
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={isMultiStep}
                        onChange={(e) => toggleMultiStep(e.target.checked)}
                        className="rounded border-fcc-border bg-fcc-charcoal"
                    />
                    <span className="text-sm text-gray-300">Enable multi-step approvals</span>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    Routing Mode
                </label>
                <select
                    value={getStringValue(config, 'routingMode', 'sequential')}
                    onChange={(e) => handleConfigChange('routingMode', e.target.value)}
                    className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                >
                    <option value="sequential">Sequential</option>
                    <option value="parallel">Parallel</option>
                </select>
            </div>

            {isMultiStep ? (
                <div className="space-y-4">
                    {steps.map((step: Record<string, unknown>, index: number) => (
                        <div key={index} className="p-3 bg-fcc-midnight border border-fcc-border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <input
                                    type="text"
                                    value={getStringValue(step as Record<string, unknown>, 'stepName', `Step ${index + 1}`)}
                                    onChange={(e) => handleStepChange(index, 'stepName', e.target.value)}
                                    className="bg-fcc-charcoal border border-fcc-border text-white px-2 py-1 rounded text-sm w-full"
                                />
                                <button
                                    onClick={() => removeStep(index)}
                                    className="ml-2 text-red-400 hover:text-red-300 text-xs"
                                >
                                    Remove
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white mb-2">
                                    Approver Type
                                </label>
                                <select
                                    value={getStringValue(step as Record<string, unknown>, 'approverType', 'user')}
                                    onChange={(e) => handleStepChange(index, 'approverType', e.target.value)}
                                    className="w-full bg-fcc-charcoal border border-fcc-border text-white px-3 py-2 rounded-lg text-sm"
                                >
                                    <option value="user">Specific User</option>
                                    <option value="role">Role</option>
                                    <option value="group">Group</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white mb-2">
                                    {getStringValue(step as Record<string, unknown>, 'approverType', 'user') === 'user' ? 'Approver' : getStringValue(step as Record<string, unknown>, 'approverType', 'user') === 'role' ? 'Role ID' : 'Group ID'}
                                </label>
                                {getStringValue(step as Record<string, unknown>, 'approverType', 'user') === 'user' ? (
                                    <select
                                        value={getStringValue(step as Record<string, unknown>, 'approverId', '')}
                                        onChange={(e) => handleStepChange(index, 'approverId', e.target.value)}
                                        disabled={loadingUsers}
                                        className="w-full bg-fcc-charcoal border border-fcc-border text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                                    >
                                        <option value="">Select a user</option>
                                        {users.map((user: User) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name || user.email || user.username}
                                            </option>
                                        ))}
                                    </select>
                                ) : getStringValue(step as Record<string, unknown>, 'approverType', 'user') === 'role' ? (
                                    <select
                                        value={getStringValue(step as Record<string, unknown>, 'approverId', '')}
                                        onChange={(e) => handleStepChange(index, 'approverId', e.target.value)}
                                        disabled={loadingRoles}
                                        className="w-full bg-fcc-charcoal border border-fcc-border text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                                    >
                                        <option value="">Select a role</option>
                                        {roles.map((role) => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={getStringValue(step as Record<string, unknown>, 'approverId', '')}
                                        onChange={(e) => handleStepChange(index, 'approverId', e.target.value)}
                                        placeholder={`Enter ${getStringValue(step as Record<string, unknown>, 'approverType', 'approver')} ID`}
                                        className="w-full bg-fcc-charcoal border border-fcc-border text-white px-3 py-2 rounded-lg text-sm"
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white mb-2">
                                    Approval Type
                                </label>
                                <select
                                    value={getStringValue(step as Record<string, unknown>, 'approvalType', 'any')}
                                    onChange={(e) => handleStepChange(index, 'approvalType', e.target.value)}
                                    className="w-full bg-fcc-charcoal border border-fcc-border text-white px-3 py-2 rounded-lg text-sm"
                                >
                                    <option value="any">Any One Approver</option>
                                    <option value="all">All Approvers</option>
                                    <option value="majority">Majority</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white mb-2">
                                    Deadline (hours)
                                </label>
                                <input
                                    type="number"
                                    value={getNumberValue(step as Record<string, unknown>, 'deadlineHours', 24)}
                                    onChange={(e) => handleStepChange(index, 'deadlineHours', parseInt(e.target.value))}
                                    min="1"
                                    className="w-full bg-fcc-charcoal border border-fcc-border text-white px-3 py-2 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={addStep}
                        className="w-full px-3 py-2 border border-dashed border-fcc-gold text-fcc-gold rounded-lg text-sm hover:bg-fcc-charcoal"
                    >
                        Add Step
                    </button>
                </div>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Approver Type
                        </label>
                        <select
                            value={getStringValue(config, 'approverType', 'user')}
                            onChange={(e) => handleConfigChange('approverType', e.target.value)}
                            className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                        >
                            <option value="user">Specific User</option>
                            <option value="role">Role</option>
                            <option value="group">Group</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            {getStringValue(config, 'approverType', 'user') === 'user' ? 'Approver' : getStringValue(config, 'approverType', 'user') === 'role' ? 'Role ID' : 'Group ID'}
                        </label>
                        {getStringValue(config, 'approverType', 'user') === 'user' ? (
                            <select
                                value={getStringValue(config, 'approverId', '')}
                                onChange={(e) => handleConfigChange('approverId', e.target.value)}
                                disabled={loadingUsers}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold disabled:opacity-50"
                            >
                                <option value="">Select a user</option>
                                {users.map((user: User) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name || user.email || user.username}
                                    </option>
                                ))}
                            </select>
                        ) : getStringValue(config, 'approverType', 'user') === 'role' ? (
                            <select
                                value={getStringValue(config, 'approverId', '')}
                                onChange={(e) => handleConfigChange('approverId', e.target.value)}
                                disabled={loadingRoles}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold disabled:opacity-50"
                            >
                                <option value="">Select a role</option>
                                {roles.map((role) => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={getStringValue(config, 'approverId', '')}
                                onChange={(e) => handleConfigChange('approverId', e.target.value)}
                                placeholder={`Enter ${getStringValue(config, 'approverType', 'approver')} ID`}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Approval Type
                        </label>
                        <select
                            value={getStringValue(config, 'approvalType', 'any')}
                            onChange={(e) => handleConfigChange('approvalType', e.target.value)}
                            className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                        >
                            <option value="any">Any One Approver</option>
                            <option value="all">All Approvers</option>
                            <option value="majority">Majority</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Deadline (hours)
                        </label>
                        <input
                            type="number"
                            value={getNumberValue(config, 'deadlineHours', 24)}
                            onChange={(e) => handleConfigChange('deadlineHours', parseInt(e.target.value))}
                            min="1"
                            className="w-full bg-fcc-midnight border border-fcc-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                        />
                    </div>
                </>
            )}
        </div>
    );
};
