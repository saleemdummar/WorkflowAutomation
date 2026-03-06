'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, CheckCircle, XCircle, AlertTriangle, ArrowRight, Clock, RotateCcw } from 'lucide-react';
import { Node, Edge } from 'reactflow';
import { workflowsApi } from '@/lib/api';

interface WorkflowTestingToolProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: Node[];
    edges: Edge[];
    workflowName: string;
    workflowId?: string;
}

interface TestStep {
    nodeId: string;
    nodeType: string;
    label: string;
    status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
    message?: string;
    duration?: number;
}

interface TestResult {
    overall: 'passed' | 'failed' | 'running' | 'idle';
    steps: TestStep[];
    startTime?: Date;
    endTime?: Date;
    errors: string[];
    warnings: string[];
}

type TestDataRow = {
    key: string;
    type: 'string' | 'number' | 'boolean';
    value: string;
};

export const WorkflowTestingTool: React.FC<WorkflowTestingToolProps> = ({
    isOpen,
    onClose,
    nodes,
    edges,
    workflowName,
    workflowId,
}) => {
    const [testResult, setTestResult] = useState<TestResult>({
        overall: 'idle',
        steps: [],
        errors: [],
        warnings: [],
    });
    const [isRunning, setIsRunning] = useState(false);
    const [autoApprove, setAutoApprove] = useState(true);
    const [testDataMode, setTestDataMode] = useState<'simple' | 'json'>('simple');
    const [testDataText, setTestDataText] = useState('{}');
    const [testDataRows, setTestDataRows] = useState<TestDataRow[]>([
        { key: 'amount', type: 'number', value: '1000' },
        { key: 'status', type: 'string', value: 'New' },
    ]);
    const [testDataError, setTestDataError] = useState<string | null>(null);

    const buildDataFromRows = useCallback((): Record<string, unknown> => {
        const data: Record<string, unknown> = {};
        testDataRows.forEach(row => {
            const key = row.key.trim();
            if (!key) return;
            if (row.type === 'number') {
                const n = Number(row.value);
                data[key] = Number.isNaN(n) ? row.value : n;
            } else if (row.type === 'boolean') {
                data[key] = row.value.toLowerCase() === 'true';
            } else {
                data[key] = row.value;
            }
        });
        return data;
    }, [testDataRows]);

    const parseTestData = useCallback((): { data: Record<string, unknown>; error: string | null } => {
        if (testDataMode === 'simple') {
            setTestDataError(null);
            return { data: buildDataFromRows(), error: null };
        }
        try {
            const parsed = JSON.parse(testDataText || '{}');
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                setTestDataError(null);
                return { data: parsed as Record<string, unknown>, error: null };
            }
            const error = 'Test data must be a JSON object.';
            setTestDataError(error);
            return { data: {}, error };
        } catch {
            const error = 'Invalid JSON in test data.';
            setTestDataError(error);
            return { data: {}, error };
        }
    }, [testDataText, testDataMode, buildDataFromRows]);

    useEffect(() => {
        if (testDataMode === 'json') {
            try {
                const fromRows = buildDataFromRows();
                setTestDataText(JSON.stringify(fromRows, null, 2));
            } catch {
                // ignore sync errors
            }
        }
    }, [testDataMode, buildDataFromRows]);

    const evaluateCondition = useCallback((node: Node, data: Record<string, unknown>): boolean | null => {
        const config = node.data?.config || {};
        const expression = config.condition as string | undefined;
        if (expression) {
            try {
                // Evaluate with fields map to mirror backend context
                // eslint-disable-next-line no-new-func
                const fn = new Function('fields', `return Boolean(${expression});`);
                return Boolean(fn(data));
            } catch {
                return null;
            }
        }

        const field = config.field as string | undefined;
        const op = (config.operator as string | undefined) || '';
        const value = config.value as unknown;
        if (!field || !op) return null;

        const actual = data[field];
        switch (op) {
            case 'equals':
                return String(actual ?? '') === String(value ?? '');
            case 'notequals':
                return String(actual ?? '') !== String(value ?? '');
            case 'contains':
                return String(actual ?? '').includes(String(value ?? ''));
            case 'greaterthan':
                return Number(actual) > Number(value);
            case 'lessthan':
                return Number(actual) < Number(value);
            default:
                return null;
        }
    }, []);

    const buildExecutionPath = useCallback((nodeId: string, steps: TestStep[], visited: Set<string>, data: Record<string, unknown>) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        steps.push({
            nodeId: node.id,
            nodeType: node.type || 'unknown',
            label: node.data?.label || node.type || 'Node',
            status: 'pending',
        });

        // Find connected nodes
        const outgoingEdges = edges.filter(e => e.source === nodeId);
        if (node.type === 'condition') {
            const result = evaluateCondition(node, data);
            outgoingEdges.forEach(edge => {
                const handle = edge.sourceHandle || '';
                if (handle === 'true' && result !== true) return;
                if (handle === 'false' && result !== false) return;
                buildExecutionPath(edge.target, steps, visited, data);
            });
        } else {
            outgoingEdges.forEach(edge => {
                buildExecutionPath(edge.target, steps, visited, data);
            });
        }
    }, [nodes, edges, evaluateCondition]);

    const resetTest = useCallback(() => {
        const steps: TestStep[] = [];
        const dataResult = parseTestData();

        // Build execution path from trigger
        const triggerNode = nodes.find(n => n.type === 'trigger');
        if (triggerNode) {
            buildExecutionPath(triggerNode.id, steps, new Set(), dataResult.data);
        }

        setTestResult({
            overall: 'idle',
            steps,
            errors: [],
            warnings: [],
        });
    }, [nodes, buildExecutionPath, parseTestData]);


    // Reset test when opening
    useEffect(() => {
        if (isOpen) {
            resetTest();
        }
    }, [isOpen, resetTest]);

    const simulateNodeExecution = async (
        step: TestStep,
        autoApproveValue: boolean,
        data: Record<string, unknown>
    ): Promise<{ passed: boolean; message: string; warning?: string; duration: number }> => {
        const startTime = Date.now();
        const node = nodes.find(n => n.id === step.nodeId);

        switch (step.nodeType) {
            case 'trigger':
                return {
                    passed: true,
                    message: 'Trigger activated',
                    duration: Date.now() - startTime,
                };

            case 'condition':
                const conditionResult = node ? evaluateCondition(node, data) : null;
                if (conditionResult === null) {
                    return {
                        passed: false,
                        message: 'Condition could not be evaluated (check expression or test data)',
                        warning: 'Condition node should have a valid expression or field/operator/value',
                        duration: Date.now() - startTime,
                    };
                }
                return {
                    passed: true,
                    message: `Condition evaluated to ${conditionResult}`,
                    duration: Date.now() - startTime,
                };

            case 'approval':
                const approvalConfig = node?.data?.config;
                const steps = Array.isArray(approvalConfig?.steps) ? approvalConfig.steps : [];
                const missingApprover = steps.length > 0
                    ? steps.some((s: any) => !s?.approverId)
                    : !approvalConfig?.approverId;
                if (missingApprover) {
                    return {
                        passed: false,
                        message: 'No approver configured',
                        warning: 'Approval node requires an approver',
                        duration: Date.now() - startTime,
                    };
                }
                if (autoApproveValue) {
                    return {
                        passed: true,
                        message: steps.length > 0
                            ? `Auto-approved (${steps.length} step(s) configured)`
                            : `Auto-approved (would be assigned to ${approvalConfig.approverId})`,
                        duration: Date.now() - startTime,
                    };
                }
                return {
                    passed: true,
                    message: steps.length > 0
                        ? `Approval tasks created for ${steps.length} step(s)`
                        : `Approval task created for ${approvalConfig.approverId}`,
                    warning: 'Actual approval would require human interaction',
                    duration: Date.now() - startTime,
                };

            case 'action':
                const actionConfig = node?.data?.config;
                const actionType = actionConfig?.actionType || 'unknown';
                return {
                    passed: true,
                    message: `Action executed: ${actionType}`,
                    duration: Date.now() - startTime,
                };

            case 'end':
                return {
                    passed: true,
                    message: 'Workflow completed',
                    duration: Date.now() - startTime,
                };

            default:
                return {
                    passed: true,
                    message: `Node processed`,
                    duration: Date.now() - startTime,
                };
        }
    };

    const runTest = async () => {
        setIsRunning(true);
        const startTime = new Date();
        const parsedTestData = parseTestData();
        if (parsedTestData.error) {
            setIsRunning(false);
            setTestResult(prev => ({
                ...prev,
                overall: 'failed',
                endTime: new Date(),
                errors: ['Invalid test data JSON.'],
            }));
            return;
        }

        setTestResult(prev => ({
            ...prev,
            overall: 'running',
            startTime,
            errors: [],
            warnings: [],
        }));

        const errors: string[] = [];
        const warnings: string[] = [];
        let currentSteps = [...testResult.steps];

        if (workflowId) {
            try {
                const backendResult = await workflowsApi.testWorkflow(workflowId, {
                    testData: parsedTestData.data,
                    simulateApproval: autoApprove ? 'Approved' : 'Pending',
                });

                const backendSteps: TestStep[] = (backendResult?.simulatedSteps || [])
                    .sort((a: any, b: any) => (a.stepOrder || 0) - (b.stepOrder || 0))
                    .map((step: any) => {
                        const statusValue = (step.status || '').toString();
                        const normalizedStatus = statusValue.toLowerCase() === 'validationfailed' ? 'failed' : 'passed';
                        const outputText = step.simulatedOutput !== undefined && step.simulatedOutput !== null
                            ? `Simulated output: ${formatOutput(step.simulatedOutput)}`
                            : `Status: ${statusValue || 'Simulated'}`;

                        return {
                            nodeId: step.nodeId || '',
                            nodeType: (step.nodeType || 'unknown').toString().toLowerCase(),
                            label: step.nodeLabel || step.nodeId || 'Node',
                            status: normalizedStatus as TestStep['status'],
                            message: outputText,
                        };
                    });

                const backendErrors: string[] = (backendResult?.validationErrors || []).map(
                    (e) => typeof e === 'string' ? e : ((e.message as string) || JSON.stringify(e))
                );
                const backendWarnings: string[] = backendResult?.warnings || [];

                const testStartedAt = backendResult?.testStartedAt ? new Date(backendResult.testStartedAt) : startTime;
                const testCompletedAt = backendResult?.testCompletedAt ? new Date(backendResult.testCompletedAt) : new Date();

                setTestResult({
                    overall: backendResult?.success ? 'passed' : 'failed',
                    steps: backendSteps,
                    startTime: testStartedAt,
                    endTime: testCompletedAt,
                    errors: backendErrors,
                    warnings: backendWarnings,
                });

                setIsRunning(false);
                return;
            } catch (error) {
                errors.push('Backend test failed. Please save the workflow and try again.');
                setTestResult(prev => ({
                    ...prev,
                    overall: 'failed',
                    endTime: new Date(),
                    errors,
                    warnings,
                }));
                setIsRunning(false);
                return;
            }
        }

        for (let i = 0; i < currentSteps.length; i++) {
            const step = currentSteps[i];

            // Update step to running
            currentSteps = currentSteps.map((s, idx) =>
                idx === i ? { ...s, status: 'running' as const } : s
            );
            setTestResult(prev => ({ ...prev, steps: currentSteps }));

            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

            // Simulate node execution
            const result = await simulateNodeExecution(step, autoApprove, parsedTestData.data);

            currentSteps = currentSteps.map((s, idx) =>
                idx === i ? {
                    ...s,
                    status: result.passed ? 'passed' as const : 'failed' as const,
                    message: result.message,
                    duration: result.duration,
                } : s
            );

            if (!result.passed) {
                errors.push(`${step.label}: ${result.message}`);
            }
            if (result.warning) {
                warnings.push(`${step.label}: ${result.warning}`);
            }

            setTestResult(prev => ({ ...prev, steps: currentSteps }));

            // Stop if a step fails (unless it's a condition that evaluates to false)
            if (!result.passed && step.nodeType !== 'condition') {
                break;
            }
        }

        const endTime = new Date();
        setTestResult(prev => ({
            ...prev,
            overall: errors.length === 0 ? 'passed' : 'failed',
            endTime,
            errors,
            warnings,
        }));
        setIsRunning(false);
    };

    const formatOutput = (output: any) => {
        try {
            const text = typeof output === 'string' ? output : JSON.stringify(output);
            return text.length > 120 ? `${text.substring(0, 120)}...` : text;
        } catch {
            return 'Unable to display output';
        }
    };

    const getStatusIcon = (status: TestStep['status']) => {
        switch (status) {
            case 'passed':
                return <CheckCircle className="text-green-400" size={18} />;
            case 'failed':
                return <XCircle className="text-red-400" size={18} />;
            case 'running':
                return <Clock className="text-yellow-400 animate-spin" size={18} />;
            case 'skipped':
                return <ArrowRight className="text-gray-400" size={18} />;
            default:
                return <div className="w-4 h-4 rounded-full border-2 border-gray-500" />;
        }
    };

    const getNodeTypeColor = (type: string) => {
        switch (type) {
            case 'trigger': return 'text-green-400';
            case 'condition': return 'text-yellow-400';
            case 'approval': return 'text-purple-400';
            case 'action': return 'text-blue-400';
            case 'end': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-fcc-charcoal border border-fcc-border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-fcc-border">
                    <div>
                        <h2 className="text-lg font-bold text-white">Workflow Test Runner</h2>
                        <p className="text-sm text-gray-400">Test: {workflowName}</p>
                        {!workflowId && (
                            <p className="text-xs text-yellow-400 mt-1">
                                Warning: Save workflow first for full backend testing. Unsaved tests show path visualization only.
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Test Options */}
                <div className="p-4 border-b border-fcc-border bg-fcc-midnight">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                checked={autoApprove}
                                onChange={(e) => setAutoApprove(e.target.checked)}
                                className="rounded border-fcc-border bg-fcc-charcoal"
                            />
                            Auto-approve approval steps
                        </label>
                    </div>
                    <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <button
                                onClick={() => setTestDataMode('simple')}
                                className={`px-3 py-1 text-xs font-bold rounded ${testDataMode === 'simple' ? 'bg-fcc-gold text-fcc-charcoal' : 'bg-fcc-charcoal text-white border border-fcc-border'}`}
                            >
                                Simple
                            </button>
                            <button
                                onClick={() => setTestDataMode('json')}
                                className={`px-3 py-1 text-xs font-bold rounded ${testDataMode === 'json' ? 'bg-fcc-gold text-fcc-charcoal' : 'bg-fcc-charcoal text-white border border-fcc-border'}`}
                            >
                                JSON
                            </button>
                        </div>
                        {testDataMode === 'simple' ? (
                            <div className="space-y-2">
                                {testDataRows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2">
                                        <input
                                            value={row.key}
                                            onChange={(e) => setTestDataRows(rows => rows.map((r, i) => i === idx ? { ...r, key: e.target.value } : r))}
                                            placeholder="field name"
                                            className="col-span-5 bg-fcc-charcoal border border-fcc-border px-2 py-1 text-white rounded text-xs"
                                        />
                                        <select
                                            value={row.type}
                                            onChange={(e) => setTestDataRows(rows => rows.map((r, i) => i === idx ? { ...r, type: e.target.value as TestDataRow['type'] } : r))}
                                            className="col-span-3 bg-fcc-charcoal border border-fcc-border px-2 py-1 text-white rounded text-xs"
                                        >
                                            <option value="string">string</option>
                                            <option value="number">number</option>
                                            <option value="boolean">boolean</option>
                                        </select>
                                        <input
                                            value={row.value}
                                            onChange={(e) => setTestDataRows(rows => rows.map((r, i) => i === idx ? { ...r, value: e.target.value } : r))}
                                            placeholder="value"
                                            className="col-span-3 bg-fcc-charcoal border border-fcc-border px-2 py-1 text-white rounded text-xs"
                                        />
                                        <button
                                            onClick={() => setTestDataRows(rows => rows.filter((_, i) => i !== idx))}
                                            className="col-span-1 text-red-400 text-xs"
                                        >
                                            X
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setTestDataRows(rows => [...rows, { key: '', type: 'string', value: '' }])}
                                    className="text-xs text-fcc-gold"
                                >
                                    + Add field
                                </button>
                            </div>
                        ) : (
                            <>
                                <label className="block text-xs font-bold text-white uppercase mb-2">
                                    Test Data (JSON)
                                </label>
                                <textarea
                                    value={testDataText}
                                    onChange={(e) => setTestDataText(e.target.value)}
                                    rows={6}
                                    className="w-full bg-fcc-charcoal border border-fcc-border px-3 py-2 text-white rounded focus:border-fcc-gold outline-none font-mono text-xs"
                                    placeholder='{"amount": 1200, "status": "New"}'
                                />
                                {testDataError && (
                                    <p className="text-xs text-red-400 mt-1">{testDataError}</p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Test Steps */}
                <div className="p-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
                    <div className="space-y-2">
                        {testResult.steps.map((step, index) => (
                            <div
                                key={step.nodeId}
                                className={`flex items-center gap-3 p-3 rounded-lg border ${step.status === 'running'
                                    ? 'border-yellow-500/50 bg-yellow-500/10'
                                    : step.status === 'passed'
                                        ? 'border-green-500/30 bg-green-500/5'
                                        : step.status === 'failed'
                                            ? 'border-red-500/30 bg-red-500/5'
                                            : 'border-fcc-border bg-fcc-midnight'
                                    }`}
                            >
                                <span className="text-gray-500 text-sm w-6">{index + 1}</span>
                                {getStatusIcon(step.status)}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${getNodeTypeColor(step.nodeType)}`}>
                                            [{step.nodeType}]
                                        </span>
                                        <span className="text-white">{step.label}</span>
                                    </div>
                                    {step.message && (
                                        <p className="text-xs text-gray-400 mt-1">{step.message}</p>
                                    )}
                                </div>
                                {step.duration !== undefined && (
                                    <span className="text-xs text-gray-500">{step.duration}ms</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {testResult.steps.length === 0 && (
                        <div className="text-center text-gray-400 py-8">
                            No workflow nodes found. Add a trigger node to start.
                        </div>
                    )}
                </div>

                {/* Results Summary */}
                {testResult.overall !== 'idle' && testResult.overall !== 'running' && (
                    <div className={`p-4 border-t ${testResult.overall === 'passed'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            {testResult.overall === 'passed' ? (
                                <CheckCircle className="text-green-400" size={20} />
                            ) : (
                                <XCircle className="text-red-400" size={20} />
                            )}
                            <span className={`font-medium ${testResult.overall === 'passed' ? 'text-green-400' : 'text-red-400'
                                }`}>
                                Test {testResult.overall === 'passed' ? 'Passed' : 'Failed'}
                            </span>
                            {testResult.startTime && testResult.endTime && (
                                <span className="text-xs text-gray-400 ml-auto">
                                    Duration: {testResult.endTime.getTime() - testResult.startTime.getTime()}ms
                                </span>
                            )}
                        </div>

                        {testResult.errors.length > 0 && (
                            <div className="mt-2">
                                <p className="text-sm text-red-400 font-medium">Errors:</p>
                                <ul className="text-xs text-red-300 list-disc list-inside">
                                    {testResult.errors.map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {testResult.warnings.length > 0 && (
                            <div className="mt-2">
                                <p className="text-sm text-yellow-400 font-medium flex items-center gap-1">
                                    <AlertTriangle size={14} /> Warnings:
                                </p>
                                <ul className="text-xs text-yellow-300 list-disc list-inside">
                                    {testResult.warnings.map((warning, i) => (
                                        <li key={i}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-fcc-border">
                    <button
                        onClick={resetTest}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <RotateCcw size={18} />
                        Reset
                    </button>
                    <button
                        onClick={runTest}
                        disabled={isRunning || testResult.steps.length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <Play size={18} />
                        {isRunning ? 'Running...' : 'Run Test'}
                    </button>
                </div>
            </div>
        </div>
    );
};
