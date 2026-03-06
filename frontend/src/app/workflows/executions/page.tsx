'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MainNavigation } from '@/components/MainNavigation';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import Link from 'next/link';
import { Play, CheckCircle, XCircle, Clock, AlertCircle, Filter, Search, ChevronRight } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { useWorkflowExecutions } from '@/hooks/queries';
import type { WorkflowExecution } from '@/types/entities';

function WorkflowExecutionsPage() {
    const { data: executions = [], isLoading: loading } = useWorkflowExecutions();
    const [activeTab, setActiveTab] = useState<'all' | 'running' | 'completed' | 'failed'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm, selectedWorkflow]);

    const getFilteredExecutions = () => {
        let filtered = executions;
        switch (activeTab) {
            case 'running':
                filtered = filtered.filter((e) => e.status === 'Running' || e.status === 'Pending');
                break;
            case 'completed':
                filtered = filtered.filter((e) => e.status === 'Completed');
                break;
            case 'failed':
                filtered = filtered.filter((e) => e.status === 'Failed');
                break;
        }

        if (selectedWorkflow) {
            filtered = filtered.filter((e) => e.workflowId === selectedWorkflow);
        }
        if (searchTerm) {
            filtered = filtered.filter((e) =>
                (e.workflowName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (e.triggeredBy || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Running':
            case 'Pending':
                return <Clock className="text-blue-500 animate-pulse" size={20} />;
            case 'Completed':
                return <CheckCircle className="text-green-500" size={20} />;
            case 'Failed':
                return <XCircle className="text-red-500" size={20} />;
            default:
                return <AlertCircle className="text-gray-500" size={20} />;
        }
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
        switch (status) {
            case 'Running':
                return `${baseClasses} bg-blue-500/20 text-blue-400`;
            case 'Pending':
                return `${baseClasses} bg-yellow-500/20 text-yellow-400`;
            case 'Completed':
                return `${baseClasses} bg-green-500/20 text-green-400`;
            case 'Failed':
                return `${baseClasses} bg-red-500/20 text-red-400`;
            default:
                return `${baseClasses} bg-gray-500/20 text-gray-400`;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
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

    const getProgressPercentage = (execution: WorkflowExecution) => {
        if (!execution.totalSteps) return 0;
        return Math.round(((execution.completedSteps || 0) / execution.totalSteps) * 100);
    };

    const filteredExecutions = getFilteredExecutions();
    const totalPages = Math.ceil(filteredExecutions.length / pageSize);
    const paginatedExecutions = filteredExecutions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const runningCount = executions.filter((e) => e.status === 'Running' || e.status === 'Pending').length;
    const completedCount = executions.filter((e) => e.status === 'Completed').length;
    const failedCount = executions.filter((e) => e.status === 'Failed').length;

    const uniqueWorkflows = Array.from(new Set(executions.map((e) => e.workflowId))).map((id) => {
        const execution = executions.find((e) => e.workflowId === id);
        return { id, name: execution?.workflowName || 'Unknown' };
    });

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">Workflow Executions</h1>
                            <p className="text-gray-400">Monitor workflow execution history and status</p>
                        </div>
                        <Link
                            href="/workflows/analytics"
                            className="flex items-center gap-2 bg-fcc-gold hover:bg-yellow-500 text-fcc-charcoal px-6 py-3 rounded-lg font-bold transition-colors"
                        >
                            <Play size={20} />
                            View Analytics
                        </Link>
                    </div>
                </div>
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by workflow or user..."
                            className="w-full bg-fcc-midnight border border-fcc-border text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-fcc-gold"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <select
                            value={selectedWorkflow}
                            onChange={(e) => setSelectedWorkflow(e.target.value)}
                            className="bg-fcc-midnight border border-fcc-border text-white pl-10 pr-8 py-3 rounded-lg focus:outline-none focus:border-fcc-gold appearance-none min-w-[200px]"
                        >
                            <option value="">All Workflows</option>
                            {uniqueWorkflows.map((workflow) => (
                                <option key={workflow.id} value={workflow.id}>
                                    {workflow.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-4 mb-6 border-b border-fcc-border">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'all'
                            ? 'text-fcc-gold border-b-2 border-fcc-gold'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        All Executions
                    </button>
                    <button
                        onClick={() => setActiveTab('running')}
                        className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'running'
                            ? 'text-fcc-gold border-b-2 border-fcc-gold'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Running
                        {runningCount > 0 && (
                            <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                {runningCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'completed'
                            ? 'text-fcc-gold border-b-2 border-fcc-gold'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Completed
                        <span className="ml-2 bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                            {completedCount}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('failed')}
                        className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'failed'
                            ? 'text-fcc-gold border-b-2 border-fcc-gold'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Failed
                        {failedCount > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                {failedCount}
                            </span>
                        )}
                    </button>
                </div>
                {loading ? (
                    <TableSkeleton rows={5} />
                ) : filteredExecutions.length === 0 ? (
                    <div className="text-center py-12 bg-fcc-midnight rounded-lg">
                        <AlertCircle className="mx-auto text-gray-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">No Executions Found</h3>
                        <p className="text-gray-400">No workflow executions match your filters.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {paginatedExecutions.map((execution) => (
                            <Link
                                key={execution.id}
                                href={`/workflows/executions/${execution.id}`}
                                className="block bg-fcc-midnight rounded-lg p-6 hover:bg-fcc-midnight/80 transition-colors border border-fcc-border hover:border-fcc-gold"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            {getStatusIcon(execution.status)}
                                            <h3 className="text-lg font-bold text-white">{execution.workflowName}</h3>
                                            <span className={getStatusBadge(execution.status)}>{execution.status}</span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                            <div>
                                                <span className="text-gray-500">Triggered By:</span>
                                                <p className="text-white font-medium">{execution.triggeredBy}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Started:</span>
                                                <p className="text-white font-medium">{formatDate(execution.startedAt)}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Duration:</span>
                                                <p className="text-white font-medium">
                                                    {getDuration(execution.startedAt, execution.completedAt)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Progress:</span>
                                                <p className="text-white font-medium">
                                                    {execution.completedSteps}/{execution.totalSteps} steps
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                                <span>{execution.currentStep || 'Initializing...'}</span>
                                                <span>{getProgressPercentage(execution)}%</span>
                                            </div>
                                            <div className="w-full bg-fcc-charcoal rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${execution.status === 'Failed'
                                                        ? 'bg-red-500'
                                                        : execution.status === 'Completed'
                                                            ? 'bg-green-500'
                                                            : 'bg-blue-500'
                                                        }`}
                                                    style={{ width: `${getProgressPercentage(execution)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        {execution.errorMessage && (
                                            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm">
                                                <p className="text-red-400 font-medium">Error: {execution.errorMessage}</p>
                                            </div>
                                        )}
                                    </div>

                                    <ChevronRight className="text-gray-500 ml-4" size={20} />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                        <p className="text-sm text-gray-400">
                            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredExecutions.length)} of {filteredExecutions.length}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-fcc-midnight border border-fcc-border text-gray-300 rounded-lg disabled:opacity-40 hover:border-fcc-gold transition-colors"
                            >
                                Previous
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let page: number;
                                if (totalPages <= 5) {
                                    page = i + 1;
                                } else if (currentPage <= 3) {
                                    page = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    page = totalPages - 4 + i;
                                } else {
                                    page = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-3 py-2 rounded-lg font-medium transition-colors ${currentPage === page
                                            ? 'bg-fcc-gold text-fcc-charcoal'
                                            : 'bg-fcc-midnight border border-fcc-border text-gray-300 hover:border-fcc-gold'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-fcc-midnight border border-fcc-border text-gray-300 rounded-lg disabled:opacity-40 hover:border-fcc-gold transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function WorkflowExecutionsPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'workflow-designer']}>
            <WorkflowExecutionsPage />
        </AuthGuard>
    );
}
