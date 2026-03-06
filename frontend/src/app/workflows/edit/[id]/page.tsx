'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainNavigation } from '../../../../components/MainNavigation';
import { WorkflowDesigner } from '../../../../components/WorkflowDesigner/WorkflowDesigner';
import { WorkflowVersionHistory } from '../../../../components/WorkflowDesigner/WorkflowVersionHistory';
import { workflowVersionsApi } from '../../../../lib/api';
import { ChevronLeft, History } from 'lucide-react';
import { AuthGuard } from '../../../../components/AuthGuard';
import { useToast } from '../../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../../hooks/useConfirmDialog';
import { useWorkflow, useUpdateWorkflow } from '@/hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/queryKeys';

function EditWorkflowPage() {
    const router = useRouter();
    const params = useParams();
    const workflowId = params?.id as string;

    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const toast = useToast();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();
    const queryClient = useQueryClient();

    const { data: workflow, isLoading: loading } = useWorkflow(workflowId);
    const updateWorkflowMutation = useUpdateWorkflow();
    const saving = updateWorkflowMutation.isPending;

    const handleSave = async (workflowData: any) => {
        try {
            const payload = {
                name: workflowData.Name,
                description: workflowData.Description,
                definition: workflowData.Definition,
                isActive: workflowData.IsActive,
                isPublished: workflowData.IsPublished,
                formId: workflowData.FormId || undefined,
                changeDescription: workflowData.ChangeDescription,
            };
            await updateWorkflowMutation.mutateAsync({ id: workflowId, data: payload });
        } catch (error) {
            console.error('Failed to save workflow:', error);
            toast.error('Failed to save workflow');
        }
    };

    const handleRevert = async (version: any) => {
        if (!(await confirmAction({ message: `Are you sure you want to revert to version ${version.versionNumber}? This will create a new version with the old definition.` }))) {
            return;
        }
        try {
            await workflowVersionsApi.rollback(workflowId, version.versionNumber);
            queryClient.invalidateQueries({ queryKey: queryKeys.workflows.detail(workflowId) });
            setShowVersionHistory(false);
            toast.success('Successfully reverted to version ' + version.versionNumber);
        } catch (error) {
            console.error('Failed to revert:', error);
            toast.error('Failed to revert to this version');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-fcc-midnight">
                <MainNavigation />
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold"></div>
                </div>
            </div>
        );
    }

    if (!workflow) {
        return null;
    }

    return (
        <div className="min-h-screen bg-fcc-midnight">
            <MainNavigation />

            <div className="border-b border-fcc-border bg-fcc-charcoal">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <button
                        onClick={() => router.push('/workflows')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                    >
                        <ChevronLeft size={20} />
                        Back to Workflows
                    </button>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-white">{workflow.name}</h1>
                        <div className="flex gap-2 items-center">
                            <button
                                onClick={() => setShowVersionHistory(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-fcc-midnight border border-fcc-border rounded hover:bg-fcc-charcoal transition-colors"
                            >
                                <History size={16} />
                                Version History
                            </button>
                            {workflow.isPublished && (
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded">
                                    Published
                                </span>
                            )}
                            {!workflow.isPublished && (
                                <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm font-medium rounded">
                                    Draft
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <WorkflowDesigner
                initialWorkflow={workflow}
                onSave={handleSave}
                saving={saving}
            />

            <WorkflowVersionHistory
                workflowId={workflowId}
                isOpen={showVersionHistory}
                onClose={() => setShowVersionHistory(false)}
                onRevert={handleRevert}
            />
            <ConfirmDialog />
        </div>
    );
}

export default function EditWorkflowPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'workflow-designer']}>
            <EditWorkflowPage />
        </AuthGuard>
    );
}
