'use client';

import { useState, useEffect, useCallback } from 'react';
import { workflowsApi, type WorkflowTestResult } from '@/lib/api';
import { Workflow } from '@/types/entities';
import { useToast } from '@/contexts/ToastContext';

export type { WorkflowTestResult };
export type WorkflowFilter = 'all' | 'active' | 'draft' | 'archived';

export function useWorkflows() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<WorkflowFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [testingWorkflow, setTestingWorkflow] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<WorkflowTestResult | null>(null);
    const [showTestModal, setShowTestModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState('');
    const [importName, setImportName] = useState('');
    const [importing, setImporting] = useState(false);
    const toast = useToast();

    const loadWorkflows = useCallback(async () => {
        try {
            setLoading(true);
            const data = await workflowsApi.getAll();
            setWorkflows(data);
        } catch (error) {
            console.error('Failed to load workflows:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadWorkflows();
    }, [loadWorkflows]);

    const handleDelete = async (id: string) => {
        try {
            await workflowsApi.delete(id);
            await loadWorkflows();
        } catch (error) {
            console.error('Failed to delete workflow:', error);
            toast.error('Failed to delete workflow');
        }
    };

    const handleClone = async (workflow: Workflow) => {
        try {
            await workflowsApi.clone(workflow.id);
            await loadWorkflows();
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
            await workflowsApi.importWorkflow({
                name: importName || parsed.name || 'Imported Workflow',
                description: parsed.description,
                definition: typeof parsed.definition === 'string' ? parsed.definition : JSON.stringify(parsed.definition),
            });
            setShowImportModal(false);
            setImportData('');
            setImportName('');
            await loadWorkflows();
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

    const filteredWorkflows = workflows.filter(workflow => {
        const matchesSearch = workflow.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());

        if (filter === 'all') return matchesSearch;
        if (filter === 'active') return matchesSearch && workflow.isActive;
        if (filter === 'draft') return matchesSearch && !workflow.isPublished;
        if (filter === 'archived') return matchesSearch && !workflow.isActive;

        return matchesSearch;
    });

    return {
        workflows: filteredWorkflows,
        loading,
        filter,
        setFilter,
        searchQuery,
        setSearchQuery,
        // Test modal
        showTestModal,
        setShowTestModal,
        testingWorkflow,
        testResult,
        handleTest,
        // Import modal
        showImportModal,
        setShowImportModal,
        importData,
        setImportData,
        importName,
        setImportName,
        importing,
        handleImport,
        handleImportFile,
        // Actions
        handleDelete,
        handleClone,
        handleExport,
    };
}
