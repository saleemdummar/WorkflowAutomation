'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MainNavigation } from '@/components/MainNavigation';
import { WorkflowImportModal } from '@/components/WorkflowImportModal';
import { WorkflowTestModal } from '@/components/WorkflowTestModal';
import { useWorkflowsList, useDeleteWorkflow, useCloneWorkflow, useTestWorkflow, useImportWorkflow } from '@/hooks/queries';
import { workflowsApi } from '@/lib/api';
import type { WorkflowTestResult } from '@/lib/api';
import { Workflow } from '@/types/entities';
import { Plus, Edit, Trash2, Play, Copy, FlaskConical, Download, Upload } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useToast } from '@/contexts/ToastContext';

type WorkflowFilter = 'all' | 'active' | 'draft' | 'archived';

function WorkflowsPage() {
    const router = useRouter();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();
    const toast = useToast();

    // Local UI state
    const [filter, setFilter] = useState<WorkflowFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showTestModal, setShowTestModal] = useState(false);
    const [testingWorkflow, setTestingWorkflow] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<WorkflowTestResult | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState('');
    const [importName, setImportName] = useState('');
    const [importing, setImporting] = useState(false);

    // TanStack Query
    const { data: workflows = [], isLoading: loading } = useWorkflowsList();
    const deleteWorkflowMutation = useDeleteWorkflow();
    const cloneWorkflowMutation = useCloneWorkflow();
    const importWorkflowMutation = useImportWorkflow();

    // Client-side filtering
    const filteredWorkflows = useMemo(() => {
        return workflows.filter((workflow: Workflow) => {
            const matchesSearch = workflow.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());
            if (filter === 'all') return matchesSearch;
            if (filter === 'active') return matchesSearch && workflow.isActive;
            if (filter === 'draft') return matchesSearch && !workflow.isPublished;
            if (filter === 'archived') return matchesSearch && !workflow.isActive;
            return matchesSearch;
        });
    }, [workflows, filter, searchQuery]);

    const handleDelete = async (id: string) => {
        try {
            await deleteWorkflowMutation.mutateAsync(id);
        } catch (error) {
            console.error('Failed to delete workflow:', error);
            toast.error('Failed to delete workflow');
        }
    };

    const handleClone = async (workflow: Workflow) => {
        try {
            await cloneWorkflowMutation.mutateAsync(workflow.id);
        } catch (error) {
            console.error('Failed to clone workflow:', error);
            toast.error('Failed to clone workflow');
        }
    };

    const handleTest = async (workflowId: string) => {
        setTestingWorkflow(workflowId);
        setTestResult(null);
        setShowTestModal(true);
        try {
            const result = await workflowsApi.testWorkflow(workflowId);
            setTestResult(result);
        } catch (error: any) {
            setTestResult({
                success: false,
                message: error.response?.data?.message || 'Test failed',
                validationErrors: [error.message || 'Unknown error occurred']
            });
        } finally {
            setTestingWorkflow(null);
        }
    };

    const handleExport = async (workflowId: string, workflowName: string) => {
        try {
            const data = await workflowsApi.exportWorkflow(workflowId);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${workflowName.replace(/[^a-z0-9]/gi, '_')}_workflow.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export workflow:', error);
            toast.error('Failed to export workflow');
        }
    };

    const handleImport = async () => {
        if (!importData.trim()) return;
        setImporting(true);
        try {
            const parsed = JSON.parse(importData);
            await importWorkflowMutation.mutateAsync({
                name: importName || parsed.name || 'Imported Workflow',
                description: parsed.description,
                definition: typeof parsed.definition === 'string' ? parsed.definition : JSON.stringify(parsed.definition),
            });
            setShowImportModal(false);
            setImportData('');
            setImportName('');
        } catch (error: any) {
            console.error('Failed to import workflow:', error);
            toast.error(error.message?.includes('JSON') ? 'Invalid JSON format' : 'Failed to import workflow');
        } finally {
            setImporting(false);
        }
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const content = evt.target?.result as string;
            setImportData(content);
            try {
                const parsed = JSON.parse(content);
                if (parsed.name) setImportName(parsed.name);
            } catch { /* ignore parse errors for name extraction */ }
        };
        reader.readAsText(file);
    };

    const onDelete = async (id: string) => {
        if (!(await confirmAction({ message: 'Are you sure you want to delete this workflow?' }))) return;
        await handleDelete(id);
    };

    return (
        <div className="min-h-screen bg-fcc-midnight">
            <MainNavigation />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Workflows</h1>
                        <p className="text-gray-400 mt-2">Create and manage approval workflows</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push('/workflows/executions')}
                            className="bg-fcc-charcoal hover:bg-fcc-midnight text-white border border-fcc-border px-4 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <Play size={20} />
                            Executions
                        </button>
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="bg-fcc-charcoal hover:bg-fcc-midnight text-white border border-fcc-border px-4 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <Upload size={20} />
                            Import
                        </button>
                        <button
                            onClick={() => router.push('/workflows/new')}
                            className="bg-fcc-gold hover:bg-yellow-500 text-fcc-charcoal px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <Plus size={20} />
                            Create Workflow
                        </button>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-fcc-charcoal border border-fcc-border rounded-lg p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search workflows..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-fcc-midnight border border-fcc-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                            />
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'active', 'draft', 'archived'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f
                                        ? 'bg-fcc-gold text-fcc-charcoal'
                                        : 'bg-fcc-midnight text-gray-400 hover:text-white border border-fcc-border'
                                        }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Workflow List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold mx-auto"></div>
                        <p className="text-gray-400 mt-4">Loading workflows...</p>
                    </div>
                ) : filteredWorkflows.length === 0 ? (
                    <div className="bg-fcc-charcoal border border-fcc-border rounded-lg p-12 text-center">
                        <Play size={48} className="mx-auto text-gray-600 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No workflows found</h3>
                        <p className="text-gray-400 mb-6">
                            {searchQuery || filter !== 'all'
                                ? 'Try adjusting your filters or search query'
                                : 'Create your first workflow to automate approvals'}
                        </p>
                        {!searchQuery && filter === 'all' && (
                            <button
                                onClick={() => router.push('/workflows/new')}
                                className="bg-fcc-gold hover:bg-yellow-500 text-fcc-charcoal px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
                            >
                                <Plus size={20} />
                                Create Workflow
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredWorkflows.map((workflow) => (
                            <div
                                key={workflow.id}
                                className="bg-fcc-charcoal border border-fcc-border rounded-lg p-6 hover:border-fcc-gold transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">{workflow.name}</h3>
                                            <div className="flex gap-2">
                                                {workflow.isPublished && (
                                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">
                                                        Published
                                                    </span>
                                                )}
                                                {!workflow.isPublished && (
                                                    <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded">
                                                        Draft
                                                    </span>
                                                )}
                                                {workflow.isActive && (
                                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-gray-400 mb-4">{workflow.description || 'No description'}</p>

                                        <div className="flex items-center gap-6 text-sm text-gray-500">
                                            <span>Version {workflow.version || 1}</span>
                                            <span>Created {new Date(workflow.createdAt || Date.now()).toLocaleDateString()}</span>
                                            {workflow.updatedAt && (
                                                <span>Updated {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleTest(workflow.id)}
                                            className="p-2 text-gray-400 hover:text-purple-400 hover:bg-fcc-midnight rounded-lg transition-colors"
                                            title="Test Workflow"
                                        >
                                            <FlaskConical size={18} />
                                        </button>
                                        <button
                                            onClick={() => router.push(`/workflows/edit/${workflow.id}`)}
                                            className="p-2 text-gray-400 hover:text-fcc-gold hover:bg-fcc-midnight rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleExport(workflow.id, workflow.name)}
                                            className="p-2 text-gray-400 hover:text-green-400 hover:bg-fcc-midnight rounded-lg transition-colors"
                                            title="Export"
                                        >
                                            <Download size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleClone(workflow)}
                                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-fcc-midnight rounded-lg transition-colors"
                                            title="Clone"
                                        >
                                            <Copy size={18} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(workflow.id)}
                                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-fcc-midnight rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showImportModal && (
                <WorkflowImportModal
                    importName={importName}
                    setImportName={setImportName}
                    importData={importData}
                    setImportData={setImportData}
                    importing={importing}
                    onImport={handleImport}
                    onImportFile={handleImportFile}
                    onClose={() => setShowImportModal(false)}
                />
            )}

            {showTestModal && (
                <WorkflowTestModal
                    testing={!!testingWorkflow}
                    result={testResult}
                    onClose={() => setShowTestModal(false)}
                />
            )}

            <ConfirmDialog />
        </div>
    );
}

export default function WorkflowsPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'workflow-designer']}>
            <WorkflowsPage />
        </AuthGuard>
    );
}
