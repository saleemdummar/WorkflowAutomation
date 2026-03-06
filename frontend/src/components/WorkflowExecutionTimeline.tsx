'use client';

import React from 'react';
import { CheckCircle, XCircle, Clock, Circle, AlertCircle } from 'lucide-react';
import type { ExecutionStep } from '@/lib/api/types';

interface WorkflowExecutionTimelineProps {
    steps: ExecutionStep[];
}

export const WorkflowExecutionTimeline: React.FC<WorkflowExecutionTimelineProps> = ({ steps }) => {
    const getStepIcon = (status: string) => {
        switch (status) {
            case 'Completed':
                return <CheckCircle className="text-green-500" size={24} />;
            case 'Failed':
                return <XCircle className="text-red-500" size={24} />;
            case 'Running':
                return <Clock className="text-blue-500 animate-pulse" size={24} />;
            case 'Skipped':
                return <Circle className="text-gray-500" size={24} />;
            case 'Pending':
                return <Circle className="text-gray-500" size={24} />;
            default:
                return <AlertCircle className="text-gray-500" size={24} />;
        }
    };

    const getNodeTypeColor = (nodeType: string) => {
        switch (nodeType.toLowerCase()) {
            case 'trigger':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
            case 'condition':
                return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
            case 'action':
                return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
            case 'approval':
                return 'bg-green-500/20 text-green-400 border-green-500/50';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getDuration = (start?: string, end?: string) => {
        if (!start) return '-';
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : new Date();
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffSecs = Math.floor(diffMs / 1000);

        if (diffSecs < 60) return `${diffSecs}s`;
        const diffMins = Math.floor(diffSecs / 60);
        return `${diffMins}m ${diffSecs % 60}s`;
    };

    if (steps.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-400">No execution steps available</p>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-fcc-border"></div>
            <div className="space-y-6">
                {steps.map((step, index) => (
                    <div key={step.id} className="relative pl-10">
                        <div className="absolute left-0 top-0 bg-fcc-charcoal p-1">
                            {getStepIcon(step.status)}
                        </div>
                        <div className="bg-fcc-charcoal rounded-lg p-4 border border-fcc-border hover:border-fcc-gold/50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-white font-bold">{step.nodeName}</h3>
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium border ${getNodeTypeColor(
                                            step.nodeType || ''
                                        )}`}
                                    >
                                        {step.nodeType || 'Unknown'}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {step.startedAt ? formatDate(step.startedAt) : 'Not started'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                <div>
                                    <span className="text-gray-500">Status:</span>
                                    <p className="text-white font-medium">{step.status}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Duration:</span>
                                    <p className="text-white font-medium">
                                        {getDuration(step.startedAt, step.completedAt)}
                                    </p>
                                </div>
                            </div>
                            {step.errorMessage && (
                                <div className="bg-red-500/10 border border-red-500/50 rounded p-3 mb-3">
                                    <p className="text-red-400 text-sm font-medium">Error: {step.errorMessage}</p>
                                </div>
                            )}
                            {step.output != null && typeof step.output === 'object' && Object.keys(step.output as Record<string, unknown>).length > 0 ? (
                                <div className="mt-3">
                                    <details className="cursor-pointer">
                                        <summary className="text-sm text-gray-400 hover:text-white mb-2">
                                            View Output Data
                                        </summary>
                                        <pre className="bg-fcc-midnight p-3 rounded text-xs text-gray-300 overflow-x-auto">
                                            {JSON.stringify(step.output, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            ) : null}
                            <div className="absolute top-2 right-2 bg-fcc-midnight px-2 py-1 rounded text-xs text-gray-500">
                                #{index + 1}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
