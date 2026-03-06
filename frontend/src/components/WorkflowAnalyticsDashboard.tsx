'use client';

import React from 'react';
import { TrendingUp, Clock, AlertTriangle, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import type { WorkflowAnalytics } from '@/lib/api/types';

interface WorkflowAnalyticsDashboardProps {
    analytics: WorkflowAnalytics;
}

export const WorkflowAnalyticsDashboard: React.FC<WorkflowAnalyticsDashboardProps> = ({ analytics }) => {
    const maxTrendCount = Math.max(...(analytics.executionTrend?.map(t => t.count) || [1]), 1);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                <h2 className="text-2xl font-bold text-white mb-6">{analytics.workflowName} - Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-fcc-charcoal rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-400 text-sm">Total Executions</h3>
                            <TrendingUp className="text-fcc-gold" size={20} />
                        </div>
                        <p className="text-2xl font-bold text-white">{analytics.stats.totalExecutions}</p>
                    </div>

                    <div className="bg-fcc-charcoal rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-400 text-sm">Successful</h3>
                            <CheckCircle className="text-green-500" size={20} />
                        </div>
                        <p className="text-2xl font-bold text-green-400">{analytics.stats.successfulExecutions}</p>
                    </div>

                    <div className="bg-fcc-charcoal rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-400 text-sm">Failed</h3>
                            <XCircle className="text-red-500" size={20} />
                        </div>
                        <p className="text-2xl font-bold text-red-400">{analytics.stats.failedExecutions}</p>
                    </div>

                    <div className="bg-fcc-charcoal rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-400 text-sm">Success Rate</h3>
                            <CheckCircle className="text-green-500" size={20} />
                        </div>
                        <p className="text-2xl font-bold text-white">{analytics.stats.successRate.toFixed(1)}%</p>
                    </div>

                    <div className="bg-fcc-charcoal rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-400 text-sm">Avg Duration</h3>
                            <Clock className="text-blue-500" size={20} />
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {analytics.stats.averageDurationMs ? `${Math.round(analytics.stats.averageDurationMs / 1000)}s` : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Execution Trend Chart */}
            {analytics.executionTrend && analytics.executionTrend.length > 0 && (
                <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <BarChart3 size={20} className="text-fcc-gold" />
                        Execution Trend
                    </h3>
                    <div className="flex items-end gap-1 h-48">
                        {analytics.executionTrend.map((trend, index) => {
                            const successHeight = (trend.successCount / maxTrendCount) * 100;
                            const failedHeight = (trend.failedCount / maxTrendCount) * 100;
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center justify-end gap-0 group relative">
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-fcc-charcoal text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-fcc-border">
                                        {trend.date}: {trend.count} total ({trend.successCount}✓ / {trend.failedCount}✗)
                                    </div>
                                    {trend.failedCount > 0 && (
                                        <div className="w-full bg-red-500 rounded-t-sm" style={{ height: `${failedHeight}%`, minHeight: trend.failedCount > 0 ? '4px' : '0' }} />
                                    )}
                                    <div className="w-full bg-green-500 rounded-t-sm" style={{ height: `${successHeight}%`, minHeight: trend.successCount > 0 ? '4px' : '0' }} />
                                    <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">
                                        {new Date(trend.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /> Success</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded" /> Failed</div>
                    </div>
                </div>
            )}

            {/* Bottleneck List */}
            {analytics.topBottlenecks && analytics.topBottlenecks.length > 0 && (
                <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-yellow-500" />
                        Top Bottlenecks
                    </h3>
                    <div className="space-y-3">
                        {analytics.topBottlenecks.map((bottleneck, index) => {
                            const maxDuration = Math.max(...analytics.topBottlenecks.map(b => b.averageDurationMs), 1);
                            const widthPct = (bottleneck.averageDurationMs / maxDuration) * 100;
                            return (
                                <div key={index} className="bg-fcc-charcoal rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white font-medium">{bottleneck.nodeName}</span>
                                        <span className="text-gray-400 text-sm">
                                            {(bottleneck.averageDurationMs / 1000).toFixed(1)}s avg • {bottleneck.executionCount} runs
                                        </span>
                                    </div>
                                    <div className="w-full bg-fcc-midnight rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-yellow-500 to-red-500 h-2 rounded-full transition-all"
                                            style={{ width: `${widthPct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
