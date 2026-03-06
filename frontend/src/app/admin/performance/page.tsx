'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { AuthGuard } from '../../../components/AuthGuard';
import { ChevronLeft, Cpu, Database, Activity, Clock, Users, FileText, GitBranch, Bell, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Metrics {
    system: {
        uptime: number;
        memoryUsageMB: number;
        threadCount: number;
        cpuTimeMs: number;
    };
    database: {
        formCount: number;
        workflowCount: number;
        submissionCount: number;
        activeInstances: number;
        pendingApprovals: number;
        unreadNotifications: number;
        userCount: number;
    };
    activity: {
        submissionsLast24h: number;
        workflowRunsLast24h: number;
        avgWorkflowExecutionMs: number;
        workflowSuccessRate: number;
    };
}

function PerformancePage() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const loadMetrics = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('Performance/metrics');
            setMetrics(response.data);
            setLastRefresh(new Date());
            setError(null);
        } catch (err) {
            setError('Failed to load performance metrics');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMetrics();
        const interval = setInterval(loadMetrics, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const StatCard = ({ icon: Icon, label, value, subtext, color }: {
        icon: React.ElementType; label: string; value: string | number; subtext?: string; color: string
    }) => (
        <div className="bg-fcc-charcoal rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm">{label}</h3>
                <Icon className={color} size={20} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
    );

    return (
        <div className="min-h-screen bg-fcc-charcoal text-white">
            <header className="bg-fcc-midnight border-b border-fcc-border px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-fcc-charcoal rounded border border-transparent hover:border-fcc-border">
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter">Performance Monitor</h1>
                            <p className="text-sm text-gray-400">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
                        </div>
                    </div>
                    <button
                        onClick={loadMetrics}
                        disabled={loading}
                        className="px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
                    >
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-6">
                {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-400">
                        {error}
                    </div>
                )}

                {metrics && (
                    <>
                        {/* System Health */}
                        <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Cpu size={20} className="text-fcc-gold" /> System Health
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <StatCard icon={Clock} label="Uptime" value={`${metrics.system.uptime.toFixed(1)}h`} color="text-green-500" />
                                <StatCard icon={Cpu} label="Memory Usage" value={`${metrics.system.memoryUsageMB} MB`} color="text-blue-500" />
                                <StatCard icon={Activity} label="Threads" value={metrics.system.threadCount} color="text-yellow-500" />
                                <StatCard icon={Clock} label="CPU Time" value={`${(metrics.system.cpuTimeMs / 1000).toFixed(1)}s`} color="text-purple-500" />
                            </div>
                        </div>

                        {/* Database Stats */}
                        <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Database size={20} className="text-fcc-gold" /> Database
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                <StatCard icon={FileText} label="Forms" value={metrics.database.formCount} color="text-blue-500" />
                                <StatCard icon={GitBranch} label="Workflows" value={metrics.database.workflowCount} color="text-green-500" />
                                <StatCard icon={FileText} label="Submissions" value={metrics.database.submissionCount} color="text-cyan-500" />
                                <StatCard icon={Activity} label="Active Instances" value={metrics.database.activeInstances} color="text-yellow-500" />
                                <StatCard icon={CheckCircle} label="Pending Approvals" value={metrics.database.pendingApprovals} color="text-purple-500" />
                                <StatCard icon={Bell} label="Unread Notifs" value={metrics.database.unreadNotifications} color="text-red-500" />
                                <StatCard icon={Users} label="Users" value={metrics.database.userCount} color="text-indigo-500" />
                            </div>
                        </div>

                        {/* Activity */}
                        <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Activity size={20} className="text-fcc-gold" /> Activity (Last 24 Hours)
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <StatCard icon={FileText} label="Submissions" value={metrics.activity.submissionsLast24h} color="text-blue-500" />
                                <StatCard icon={GitBranch} label="Workflow Runs" value={metrics.activity.workflowRunsLast24h} color="text-green-500" />
                                <StatCard icon={Clock} label="Avg Execution" value={metrics.activity.avgWorkflowExecutionMs > 0 ? `${(metrics.activity.avgWorkflowExecutionMs / 1000).toFixed(1)}s` : 'N/A'} color="text-yellow-500" />
                                <div className="bg-fcc-charcoal rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-gray-400 text-sm">Success Rate</h3>
                                        <CheckCircle className={metrics.activity.workflowSuccessRate >= 90 ? 'text-green-500' : metrics.activity.workflowSuccessRate >= 70 ? 'text-yellow-500' : 'text-red-500'} size={20} />
                                    </div>
                                    <p className="text-2xl font-bold text-white">{metrics.activity.workflowSuccessRate}%</p>
                                    <div className="w-full bg-fcc-midnight rounded-full h-2 mt-2">
                                        <div className={`h-2 rounded-full ${metrics.activity.workflowSuccessRate >= 90 ? 'bg-green-500' : metrics.activity.workflowSuccessRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${metrics.activity.workflowSuccessRate}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {loading && !metrics && (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold mx-auto mb-4" />
                        <p className="text-gray-400">Loading performance metrics...</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function PerformancePageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin']}>
            <PerformancePage />
        </AuthGuard>
    );
}
