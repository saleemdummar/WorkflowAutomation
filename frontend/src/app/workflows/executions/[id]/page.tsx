'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MainNavigation } from '@/components/MainNavigation';
import { WorkflowExecutionTimeline } from '@/components/WorkflowExecutionTimeline';
import { CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft, RefreshCw, Play, Square } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import Link from 'next/link';
import { useWorkflowExecutionDetail, useRetryExecution, useCancelExecution } from '@/hooks/queries';
import type { WorkflowExecutionDetail, ExecutionStep, ExecutionLog } from '@/lib/api/types';

function ExecutionDetailPage() {
    const params = useParams();
    const executionId = params.id as string;
    const toast = useToast();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();
    const [autoRefresh, setAutoRefresh] = useState(false);

    const { data: execution, isLoading: loading, refetch } = useWorkflowExecutionDetail(executionId);
    const retryMutation = useRetryExecution();
    const cancelMutation = useCancelExecution();

    // Auto-enable refresh for running executions
    useEffect(() => {
        if (execution && (execution.status === 'Running' || execution.status === 'Pending')) {
            setAutoRefresh(true);
        }
    }, [execution?.status]);

    // Auto-refresh polling
    useEffect(() => {
        if (autoRefresh && execution?.status === 'Running') {
            const interval = setInterval(() => {
                refetch();
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, execution?.status, refetch]);

    const handleRetry = async () => {
        if (!execution) return;
        if (await confirmAction({ message: 'Are you sure you want to retry this workflow execution?' })) {
            try {
                await retryMutation.mutateAsync(execution.id);
                refetch();
            } catch (error) {
                console.error('Failed to retry execution:', error);
                toast.error('Failed to retry execution. Please try again.');
            }
        }
    };

    const handleCancel = async () => {
        if (!execution) return;
        if (await confirmAction({ message: 'Are you sure you want to cancel this running execution?' })) {
            try {
                await cancelMutation.mutateAsync(execution.id);
                refetch();
            } catch (error) {
                console.error('Failed to cancel execution:', error);
                toast.error('Failed to cancel execution. Please try again.');
            }
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Running':
            case 'Pending':
                return <Clock className="text-blue-500 animate-pulse" size={24} />;
            case 'Completed':
                return <CheckCircle className="text-green-500" size={24} />;
            case 'Failed':
                return <XCircle className="text-red-500" size={24} />;
            default:
                return <AlertCircle className="text-gray-500" size={24} />;
        }
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = 'px-4 py-2 rounded-lg text-sm font-bold';
        switch (status) {
            case 'Running':
                return `${baseClasses} bg-blue-500/20 text-blue-400`;
            case 'Pending':
                return `${baseClasses} bg-yellow-500/20 text-yellow-400`;
            case 'Completed':
                return `${baseClasses} bg-green-500/20 text-green-400`;
            case 'Failed':
                return `${baseClasses} bg-red-500/20 text-red-400`;
            case 'Skipped':
                return `${baseClasses} bg-gray-500/20 text-gray-400`;
            default:
                return `${baseClasses} bg-gray-500/20 text-gray-400`;
        }
    };

    const getLogLevelColor = (level: string) => {
        switch (level) {
            case 'Error':
                return 'text-red-400';
            case 'Warning':
                return 'text-yellow-400';
            case 'Info':
                return 'text-blue-400';
            case 'Debug':
                return 'text-gray-400';
            default:
                return 'text-white';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getDuration = (start: string, end?: string) => {
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : new Date();
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);

        if (diffMins > 0) {
            return `${diffMins}m ${diffSecs}s`;
        }
        return `${diffSecs}s`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-fcc-charcoal">
                <MainNavigation />
                <div className="container mx-auto px-6 py-8">
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold mx-auto"></div>
                        <p className="text-gray-400 mt-4">Loading execution details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!execution) {
        return (
            <div className="min-h-screen bg-fcc-charcoal">
                <MainNavigation />
                <div className="container mx-auto px-6 py-8">
                    <div className="text-center py-12">
                        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">Execution Not Found</h3>
                        <p className="text-gray-400 mb-6">The requested execution could not be found.</p>
                        <Link
                            href="/workflows/executions"
                            className="inline-flex items-center gap-2 bg-fcc-gold hover:bg-yellow-500 text-fcc-charcoal px-6 py-3 rounded-lg font-bold transition-colors"
                        >
                            <ArrowLeft size={20} />
                            Back to Executions
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const isRunning = execution.status === 'Running' || execution.status === 'Pending';
    const isFailed = execution.status === 'Failed';

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />
            <div className="container mx-auto px-6 py-8">
                <div className="mb-6">
                    <Link
                        href="/workflows/executions"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Back to Executions
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">{execution.workflowName}</h1>
                            <p className="text-gray-400">Execution ID: {execution.id}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {getStatusIcon(execution.status)}
                            <span className={getStatusBadge(execution.status)}>{execution.status}</span>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`p-2 rounded-lg transition-colors ${autoRefresh
                                    ? 'bg-fcc-gold text-fcc-charcoal'
                                    : 'bg-fcc-midnight text-gray-400 hover:text-white'
                                    }`}
                                title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
                            >
                                <RefreshCw size={20} className={autoRefresh ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>
                {(isRunning || isFailed) && (
                    <div className="mb-6 flex gap-3">
                        {isRunning && (
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                <Square size={18} />
                                Cancel Execution
                            </button>
                        )}
                        {isFailed && (
                            <button
                                onClick={handleRetry}
                                className="flex items-center gap-2 bg-fcc-gold hover:bg-yellow-500 text-fcc-charcoal px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                <Play size={18} />
                                Retry Execution
                            </button>
                        )}
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                            <h2 className="text-xl font-bold text-white mb-4">Execution Timeline</h2>
                            <WorkflowExecutionTimeline steps={execution.executionSteps} />
                        </div>
                        <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                            <h2 className="text-xl font-bold text-white mb-4">Execution Logs</h2>
                            <div className="bg-fcc-charcoal rounded-lg p-4 max-h-96 overflow-y-auto">
                                {execution.logs.length === 0 ? (
                                    <p className="text-gray-400 text-center py-4">No logs available</p>
                                ) : (
                                    <div className="space-y-2 font-mono text-sm">
                                        {execution.logs.map((log) => (
                                            <div key={log.id} className="flex gap-3">
                                                <span className="text-gray-500 shrink-0">
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </span>
                                                <span className={`font-bold shrink-0 ${getLogLevelColor(log.level)}`}>
                                                    [{log.level}]
                                                </span>
                                                <span className="text-gray-300">{log.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                            <h2 className="text-xl font-bold text-white mb-4">Summary</h2>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="text-gray-500">Triggered By:</span>
                                    <p className="text-white font-medium">{execution.triggeredBy}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Started:</span>
                                    <p className="text-white font-medium">{formatDate(execution.startedAt)}</p>
                                </div>
                                {execution.completedAt && (
                                    <div>
                                        <span className="text-gray-500">Completed:</span>
                                        <p className="text-white font-medium">{formatDate(execution.completedAt)}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-gray-500">Duration:</span>
                                    <p className="text-white font-medium">
                                        {getDuration(execution.startedAt, execution.completedAt)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Total Steps:</span>
                                    <p className="text-white font-medium">{execution.executionSteps.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                            <h2 className="text-xl font-bold text-white mb-4">Related</h2>
                            <div className="space-y-2">
                                <Link
                                    href={`/workflows/edit/${execution.workflowId}`}
                                    className="block text-fcc-gold hover:underline"
                                >
                                    View Workflow
                                </Link>
                                {execution.formSubmissionId && (
                                    <Link
                                        href={`/submissions/${execution.formSubmissionId}`}
                                        className="block text-fcc-gold hover:underline"
                                    >
                                        View Form Submission
                                    </Link>
                                )}
                            </div>
                        </div>
                        {execution.context && Object.keys(execution.context).length > 0 && (
                            <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                                <h2 className="text-xl font-bold text-white mb-4">Context Data</h2>
                                <pre className="bg-fcc-charcoal p-4 rounded-lg text-xs text-gray-300 overflow-x-auto">
                                    {JSON.stringify(execution.context, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <ConfirmDialog />
        </div>
    );
}

export default function ExecutionDetailPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'workflow-designer']}>
            <ExecutionDetailPage />
        </AuthGuard>
    );
}
