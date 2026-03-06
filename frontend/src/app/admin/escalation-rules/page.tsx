'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { escalationApi, workflowsApi } from '../../../lib/api';
import { AuthGuard } from '../../../components/AuthGuard';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { MainNavigation } from '../../../components/MainNavigation';
import { ChevronLeft, Plus, Trash2, Clock, AlertTriangle, Bell, Settings, Pencil, TestTube } from 'lucide-react';
import Link from 'next/link';
import type { EscalationRule } from '../../../types/entities';

const defaultFormState = {
    workflowId: '',
    escalationHours: 24,
    escalateToManager: true,
    maxEscalationLevels: 3,
    sendReminder: true,
    autoApprove: false,
    autoReject: false,
    isActive: true,
    escalationMessageTemplate: '',
};

function EscalationRulesPage() {
    const searchParams = useSearchParams();
    const workflowFilter = searchParams.get('workflowId') || '';
    const [rules, setRules] = useState<EscalationRule[]>([]);
    const [workflows, setWorkflows] = useState<Array<{ id: string; name: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formState, setFormState] = useState(defaultFormState);
    const [testingId, setTestingId] = useState<string | null>(null);
    const toast = useToast();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();

    const loadData = useCallback(async () => {
        setLoading(true);
        // Load workflows and rules independently so one failure doesn't block the other
        try {
            const workflowsData = await workflowsApi.getAll();
            setWorkflows(workflowsData.map((w: any) => ({ id: w.id, name: w.name })));
        } catch (err) {
            console.error('Failed to load workflows:', err);
        }
        try {
            const rulesData = await escalationApi.getAll();
            setRules(rulesData);
        } catch (err) {
            console.error('Failed to load escalation rules:', err);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const openCreate = () => {
        setEditingId(null);
        setFormState({ ...defaultFormState, workflowId: workflowFilter || '' });
        setShowModal(true);
    };

    const openEdit = (rule: EscalationRule) => {
        setEditingId(rule.id);
        setFormState({
            workflowId: rule.workflowId || '',
            escalationHours: rule.escalationHours,
            escalateToManager: rule.escalateToManager,
            maxEscalationLevels: rule.maxEscalationLevels,
            sendReminder: rule.sendReminder,
            autoApprove: rule.autoApprove,
            autoReject: rule.autoReject,
            isActive: rule.isActive,
            escalationMessageTemplate: rule.escalationMessageTemplate || '',
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formState.workflowId) return;
        try {
            if (editingId) {
                await escalationApi.update(editingId, formState);
            } else {
                await escalationApi.create(formState);
            }
            setShowModal(false);
            setEditingId(null);
            setFormState(defaultFormState);
            loadData();
        } catch (err) {
            console.error('Failed to save rule:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!(await confirmAction({ message: 'Delete this escalation rule?' }))) return;
        try {
            await escalationApi.delete(id);
            loadData();
        } catch (err) {
            console.error('Failed to delete rule:', err);
        }
    };

    const handleTest = async (id: string) => {
        setTestingId(id);
        try {
            const result = await escalationApi.testRule(id);
            toast.success(`Test completed: ${JSON.stringify(result)}`);
        } catch (err) {
            console.error('Failed to test rule:', err);
            toast.error('Test failed. Check console for details.');
        } finally {
            setTestingId(null);
        }
    };

    const getWorkflowName = (workflowId: string) => workflows.find(w => w.id === workflowId)?.name || 'Unknown';

    const visibleRules = workflowFilter
        ? rules.filter(r => r.workflowId === workflowFilter)
        : rules;

    return (
        <div className="min-h-screen bg-fcc-charcoal text-white">
            <MainNavigation />
            <header className="bg-fcc-midnight border-b border-fcc-border px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-fcc-charcoal rounded border border-transparent hover:border-fcc-border">
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter">Escalation Rules</h1>
                            <p className="text-sm text-gray-400">
                                {visibleRules.length} rule(s) configured
                                {workflowFilter && ' for selected workflow'}
                            </p>
                        </div>
                    </div>
                    <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold rounded hover:bg-yellow-400">
                        <Plus size={16} /> New Rule
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 space-y-4">
                {loading ? (
                    <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold mx-auto" /></div>
                ) : visibleRules.length === 0 ? (
                    <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-12 text-center text-gray-400">
                        <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No escalation rules configured</p>
                    </div>
                ) : (
                    visibleRules.map(rule => (
                        <div key={rule.id} className="bg-fcc-midnight border border-fcc-border rounded-lg p-4 hover:border-fcc-gold transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded ${rule.isActive ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                                        <Clock size={20} className={rule.isActive ? 'text-green-400' : 'text-gray-400'} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">Workflow: {getWorkflowName(rule.workflowId)}</h3>
                                        <p className="text-sm text-gray-400">
                                            Escalate after {rule.escalationHours}h • Max {rule.maxEscalationLevels} levels
                                            {rule.escalateToManager && ' • To Manager'}
                                            {rule.autoApprove && ' • Auto-approve'}
                                            {rule.autoReject && ' • Auto-reject'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {rule.sendReminder && <span title="Reminders enabled"><Bell size={14} className="text-blue-400" /></span>}
                                        <span className={`text-xs px-2 py-0.5 rounded ${rule.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                            {rule.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <button onClick={() => handleTest(rule.id)} className={`p-2 text-gray-400 hover:text-purple-400 ${testingId === rule.id ? 'animate-spin' : ''}`} title="Test rule">
                                        <TestTube size={16} />
                                    </button>
                                    <button onClick={() => openEdit(rule)} className="p-2 text-gray-400 hover:text-fcc-gold" title="Edit rule">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(rule.id)} className="p-2 text-gray-400 hover:text-red-400" title="Delete rule">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Settings size={20} /> {editingId ? 'Edit' : 'New'} Escalation Rule</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white uppercase mb-2">Workflow</label>
                                <select value={formState.workflowId} onChange={e => setFormState(r => ({ ...r, workflowId: e.target.value }))} className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white rounded focus:border-fcc-gold outline-none">
                                    <option value="">Select workflow...</option>
                                    {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-white uppercase mb-2">Escalation Hours</label>
                                    <input type="number" value={formState.escalationHours} onChange={e => setFormState(r => ({ ...r, escalationHours: parseInt(e.target.value) }))} className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white rounded focus:border-fcc-gold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-white uppercase mb-2">Max Levels</label>
                                    <input type="number" value={formState.maxEscalationLevels} onChange={e => setFormState(r => ({ ...r, maxEscalationLevels: parseInt(e.target.value) }))} className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white rounded focus:border-fcc-gold outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { key: 'escalateToManager', label: 'Escalate to Manager' },
                                    { key: 'sendReminder', label: 'Send Reminders' },
                                    { key: 'autoApprove', label: 'Auto-Approve on Final Escalation' },
                                    { key: 'autoReject', label: 'Auto-Reject on Final Escalation' },
                                    { key: 'isActive', label: 'Rule Active' },
                                ].map(({ key, label }) => (
                                    <label key={key} className="flex items-center gap-2 text-sm text-white">
                                        <input type="checkbox" checked={(formState as any)[key]} onChange={e => setFormState(r => ({ ...r, [key]: e.target.checked }))} className="rounded" />
                                        {label}
                                    </label>
                                ))}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white uppercase mb-2">Message Template (optional)</label>
                                <textarea value={formState.escalationMessageTemplate} onChange={e => setFormState(r => ({ ...r, escalationMessageTemplate: e.target.value }))} rows={3} className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white rounded focus:border-fcc-gold outline-none resize-none" placeholder="Escalation notification message..." />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => { setShowModal(false); setEditingId(null); }} className="px-4 py-2 text-sm font-bold border border-white text-white hover:bg-white hover:text-fcc-charcoal rounded">Cancel</button>
                            <button onClick={handleSave} disabled={!formState.workflowId} className="px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold rounded hover:bg-yellow-400 disabled:opacity-50">{editingId ? 'Update Rule' : 'Create Rule'}</button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialog />
        </div>
    );
}

export default function EscalationRulesPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'workflow-designer']}>
            <EscalationRulesPage />
        </AuthGuard>
    );
}
