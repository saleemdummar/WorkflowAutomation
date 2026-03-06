'use client';

import React from 'react';
import { FlaskConical, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import type { WorkflowTestResult } from '@/hooks/useWorkflows';

interface WorkflowTestModalProps {
    testing: boolean;
    result: WorkflowTestResult | null;
    onClose: () => void;
}

export function WorkflowTestModal({ testing, result, onClose }: WorkflowTestModalProps) {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-fcc-midnight border border-fcc-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-fcc-border">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FlaskConical className="text-purple-400" size={24} />
                        Workflow Test Results
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {testing ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                            <p className="text-gray-400">Running workflow validation...</p>
                        </div>
                    ) : result ? (
                        <div className="space-y-6">
                            {/* Status Banner */}
                            <div className={`p-4 rounded-lg flex items-center gap-3 ${result.success
                                ? 'bg-green-500/10 border border-green-500/30'
                                : 'bg-red-500/10 border border-red-500/30'
                                }`}>
                                {result.success ? (
                                    <CheckCircle className="text-green-400" size={24} />
                                ) : (
                                    <XCircle className="text-red-400" size={24} />
                                )}
                                <div>
                                    <h4 className={`font-bold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.success ? 'Validation Passed' : 'Validation Failed'}
                                    </h4>
                                    <p className="text-gray-400 text-sm">{result.message}</p>
                                </div>
                            </div>

                            {/* Validation Errors */}
                            {result.validationErrors && result.validationErrors.length > 0 && (
                                <div>
                                    <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                                        <XCircle size={16} />
                                        Errors ({result.validationErrors.length})
                                    </h4>
                                    <ul className="space-y-2">
                                        {result.validationErrors.map((error, i: number) => (
                                            <li key={i} className="text-sm text-red-300 bg-red-500/10 p-2 rounded">
                                                {typeof error === 'string' ? error : JSON.stringify(error)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Warnings */}
                            {result.warnings && result.warnings.length > 0 && (
                                <div>
                                    <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        Warnings ({result.warnings.length})
                                    </h4>
                                    <ul className="space-y-2">
                                        {result.warnings.map((warning: string, i: number) => (
                                            <li key={i} className="text-sm text-yellow-300 bg-yellow-500/10 p-2 rounded">
                                                {warning}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Simulated Steps */}
                            {result.simulatedSteps && result.simulatedSteps.length > 0 && (
                                <div>
                                    <h4 className="text-white font-bold mb-2">Simulated Execution Path</h4>
                                    <div className="space-y-2">
                                        {result.simulatedSteps.map((step, i: number) => (
                                            <div key={i} className="flex items-center gap-3 bg-fcc-charcoal p-3 rounded">
                                                <span className="w-6 h-6 bg-fcc-gold/20 text-fcc-gold rounded-full flex items-center justify-center text-sm font-bold">
                                                    {String(step.stepOrder ?? i + 1)}
                                                </span>
                                                <div className="flex-1">
                                                    <span className="text-white font-medium">{String(step.nodeLabel ?? '')}</span>
                                                    <span className="text-gray-500 text-sm ml-2">({String(step.nodeType ?? '')})</span>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded ${step.status === 'Simulated'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : step.status === 'ValidationFailed'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {String(step.status ?? '')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                <div className="p-4 border-t border-fcc-border flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold rounded-lg hover:bg-yellow-400 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
