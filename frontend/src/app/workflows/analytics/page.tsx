'use client';

import React, { useState, useEffect } from 'react';
import { MainNavigation } from '@/components/MainNavigation';
import { WorkflowAnalyticsDashboard } from '@/components/WorkflowAnalyticsDashboard';
import { ArrowLeft, TrendingUp, Activity, Clock, AlertTriangle } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import Link from 'next/link';
import { useWorkflowAnalytics } from '@/hooks/queries';
import type { WorkflowAnalytics } from '@/lib/api/types';

function WorkflowAnalyticsPage() {
    const { data: analytics = [], isLoading: loading } = useWorkflowAnalytics();
    const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');

    // Auto-select first workflow when data loads
    useEffect(() => {
        if (analytics.length > 0 && !selectedWorkflow) {
            setSelectedWorkflow((analytics as WorkflowAnalytics[])[0].workflowId);
        }
    }, [analytics, selectedWorkflow]);

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ${seconds % 60}s`;
    };

    const selectedAnalytics = analytics.find((a) => a.workflowId === selectedWorkflow);

    const totalStats = analytics.reduce(
        (acc, a) => ({
            totalExecutions: acc.totalExecutions + a.stats.totalExecutions,
            successfulExecutions: acc.successfulExecutions + a.stats.successfulExecutions,
            failedExecutions: acc.failedExecutions + a.stats.failedExecutions,
            runningExecutions: acc.runningExecutions + a.stats.runningExecutions,
            averageDurationMs: acc.averageDurationMs + a.stats.averageDurationMs / analytics.length,
        }),
        { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, runningExecutions: 0, averageDurationMs: 0 }
    );

    const overallSuccessRate = totalStats.totalExecutions > 0
        ? ((totalStats.successfulExecutions / totalStats.totalExecutions) * 100).toFixed(1)
        : '0.0';

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <Link
                        href="/workflows/executions"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Back to Executions
                    </Link>
                    <h1 className="text-4xl font-bold text-white mb-2">Workflow Analytics</h1>
                    <p className="text-gray-400">Monitor workflow performance and identify bottlenecks</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold mx-auto"></div>
                        <p className="text-gray-400 mt-4">Loading analytics...</p>
                    </div>
                ) : analytics.length === 0 ? (
                    <div className="text-center py-12 bg-fcc-midnight rounded-lg">
                        <Activity className="mx-auto text-gray-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">No Analytics Data</h3>
                        <p className="text-gray-400">No workflow executions have been recorded yet.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-gray-400 text-sm">Total Executions</h3>
                                    <Activity className="text-fcc-gold" size={20} />
                                </div>
                                <p className="text-3xl font-bold text-white">{totalStats.totalExecutions}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {totalStats.runningExecutions} currently running
                                </p>
                            </div>

                            <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-gray-400 text-sm">Success Rate</h3>
                                    <TrendingUp className="text-green-500" size={20} />
                                </div>
                                <p className="text-3xl font-bold text-white">{overallSuccessRate}%</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {totalStats.successfulExecutions} successful
                                </p>
                            </div>

                            <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-gray-400 text-sm">Failed Executions</h3>
                                    <AlertTriangle className="text-red-500" size={20} />
                                </div>
                                <p className="text-3xl font-bold text-white">{totalStats.failedExecutions}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {((totalStats.failedExecutions / totalStats.totalExecutions) * 100).toFixed(1)}% failure rate
                                </p>
                            </div>

                            <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-gray-400 text-sm">Avg Duration</h3>
                                    <Clock className="text-blue-500" size={20} />
                                </div>
                                <p className="text-3xl font-bold text-white">
                                    {formatDuration(totalStats.averageDurationMs)}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">Average execution time</p>
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-white mb-2">Select Workflow</label>
                            <select
                                value={selectedWorkflow}
                                onChange={(e) => setSelectedWorkflow(e.target.value)}
                                className="bg-fcc-midnight border border-fcc-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-fcc-gold w-full md:w-96"
                            >
                                {analytics.map((a) => (
                                    <option key={a.workflowId} value={a.workflowId}>
                                        {a.workflowName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedAnalytics && (
                            <WorkflowAnalyticsDashboard analytics={selectedAnalytics} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function WorkflowAnalyticsPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'workflow-designer']}>
            <WorkflowAnalyticsPage />
        </AuthGuard>
    );
}
