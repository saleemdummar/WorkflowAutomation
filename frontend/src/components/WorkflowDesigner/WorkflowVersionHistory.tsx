'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RotateCcw, X, GitCompare, ChevronDown, ChevronUp } from 'lucide-react';
import { workflowVersionsApi, type VersionComparison } from '../../lib/api';

interface WorkflowVersion {
    id: string;
    workflowId: string;
    versionNumber: number;
    definition: string;
    changeDescription?: string;
    createdBy: string;
    createdAt: string;
}



interface WorkflowVersionHistoryProps {
    workflowId: string;
    isOpen: boolean;
    onClose: () => void;
    onRevert: (version: WorkflowVersion) => void;
}

export const WorkflowVersionHistory: React.FC<WorkflowVersionHistoryProps> = ({
    workflowId,
    isOpen,
    onClose,
    onRevert
}) => {
    const [versions, setVersions] = useState<WorkflowVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [comparing, setComparing] = useState(false);
    const [compareResult, setCompareResult] = useState<VersionComparison | null>(null);
    const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
    const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

    const loadVersions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await workflowVersionsApi.getVersions(workflowId);
            setVersions(response);
        } catch (error: any) {
            setError(error?.response?.data?.message || 'Failed to load version history. Please try again.');
            setVersions([]);
        } finally {
            setLoading(false);
        }
    }, [workflowId]);

    useEffect(() => {
        if (isOpen && workflowId) {
            loadVersions();
        }
    }, [isOpen, workflowId, loadVersions]);

    const handleCompare = async () => {
        if (selectedVersions.length !== 2) return;

        setComparing(true);
        setError(null);
        try {
            const [v1, v2] = selectedVersions.sort((a, b) => a - b);
            const result = await workflowVersionsApi.compare(workflowId, v1, v2);
            setCompareResult(result);
        } catch (error: any) {
            setError(error?.response?.data?.message || 'Failed to compare versions.');
        } finally {
            setComparing(false);
        }
    };

    const toggleVersionSelect = (versionNumber: number) => {
        setSelectedVersions(prev => {
            if (prev.includes(versionNumber)) {
                return prev.filter(v => v !== versionNumber);
            }
            if (prev.length >= 2) {
                return [prev[1], versionNumber];
            }
            return [...prev, versionNumber];
        });
        setCompareResult(null);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const parseDefinition = (definition: string) => {
        try {
            return JSON.parse(definition);
        } catch {
            return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-fcc-midnight border border-fcc-border rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-fcc-border">
                    <h2 className="text-xl font-bold text-fcc-gold flex items-center space-x-2">
                        <Clock size={20} />
                        <span>Workflow Version History</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-fcc-charcoal rounded-full transition-colors text-gray-400 hover:text-gray-200"
                    >
                        <X size={20} />
                    </button>
                </div>
                {versions.length >= 2 && (
                    <div className="px-6 py-3 bg-fcc-charcoal/50 border-b border-fcc-border flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                            {selectedVersions.length === 0 && "Select two versions to compare"}
                            {selectedVersions.length === 1 && "Select one more version to compare"}
                            {selectedVersions.length === 2 && `Comparing v${selectedVersions[0]} and v${selectedVersions[1]}`}
                        </div>
                        <button
                            onClick={handleCompare}
                            disabled={selectedVersions.length !== 2 || comparing}
                            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium bg-fcc-gold text-fcc-midnight rounded-md hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <GitCompare size={16} />
                            <span>{comparing ? 'Comparing...' : 'Compare'}</span>
                        </button>
                    </div>
                )}

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold"></div>
                            <span className="ml-2 text-gray-400">Loading versions...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                                <p className="text-red-400 font-medium">Error</p>
                                <p className="text-red-300 text-sm mt-1">{error}</p>
                                <button
                                    onClick={loadVersions}
                                    className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Clock size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No version history available</p>
                            <p className="text-sm">Versions will appear here as you save changes</p>
                        </div>
                    ) : (
                        <>
                            {compareResult && (
                                <div className="mb-6 p-4 bg-fcc-charcoal border border-fcc-border rounded-lg">
                                    <h3 className="text-lg font-semibold text-fcc-gold mb-4 flex items-center">
                                        <GitCompare size={18} className="mr-2" />
                                        Changes between v{compareResult.version1} and v{compareResult.version2}
                                    </h3>
                                    {((compareResult.changes?.length ?? 0) === 0 &&
                                        (compareResult.addedNodes?.length ?? 0) === 0 &&
                                        (compareResult.removedNodes?.length ?? 0) === 0 &&
                                        (compareResult.addedEdges?.length ?? 0) === 0 &&
                                        (compareResult.removedEdges?.length ?? 0) === 0) ? (
                                        <p className="text-gray-400 text-sm">No changes detected between these versions.</p>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {compareResult.changes?.map((change, idx) => (
                                                <div key={idx} className="p-3 bg-fcc-midnight rounded border border-fcc-border">
                                                    <div className="text-sm font-medium text-gray-300 mb-2">{change.path}</div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="p-2 bg-red-900/30 border border-red-800 rounded">
                                                            <span className="text-red-400">Old:</span>
                                                            <pre className="text-red-300 mt-1 whitespace-pre-wrap break-words">{String(change.oldValue ?? '(empty)')}</pre>
                                                        </div>
                                                        <div className="p-2 bg-green-900/30 border border-green-800 rounded">
                                                            <span className="text-green-400">New:</span>
                                                            <pre className="text-green-300 mt-1 whitespace-pre-wrap break-words">{String(change.newValue ?? '(empty)')}</pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {!compareResult.changes && (
                                                <div className="text-xs text-gray-400">
                                                    Added Nodes: {compareResult.addedNodes?.join(', ') || 'None'}<br />
                                                    Removed Nodes: {compareResult.removedNodes?.join(', ') || 'None'}<br />
                                                    Added Edges: {compareResult.addedEdges?.join(', ') || 'None'}<br />
                                                    Removed Edges: {compareResult.removedEdges?.join(', ') || 'None'}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="space-y-4">
                                {versions.map((version, index) => {
                                    const parsedDef = parseDefinition(version.definition);
                                    const isExpanded = expandedVersion === version.id;
                                    const isSelected = selectedVersions.includes(version.versionNumber);

                                    return (
                                        <div
                                            key={version.id}
                                            className={`border rounded-lg p-4 transition-all ${index === 0
                                                ? 'border-fcc-gold/50 bg-fcc-gold/10'
                                                : isSelected
                                                    ? 'border-blue-500 bg-blue-900/20'
                                                    : 'border-fcc-border hover:border-gray-500'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleVersionSelect(version.versionNumber)}
                                                            className="h-4 w-4 rounded border-fcc-border bg-fcc-charcoal text-fcc-gold focus:ring-fcc-gold"
                                                        />
                                                        <span className={`px-2 py-1 text-xs font-medium rounded ${index === 0
                                                            ? 'bg-fcc-gold/30 text-fcc-gold'
                                                            : 'bg-gray-700 text-gray-300'
                                                            }`}>
                                                            v{version.versionNumber}
                                                        </span>
                                                        {index === 0 && (
                                                            <span className="px-2 py-1 text-xs font-medium bg-green-900/50 text-green-400 rounded border border-green-700">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="text-sm text-gray-400 mb-2">
                                                        <span className="font-medium text-gray-300">{version.createdBy}</span>
                                                        {' • '}
                                                        {formatDate(version.createdAt)}
                                                    </div>

                                                    <p className="text-gray-300 mb-3">{version.changeDescription || 'No description'}</p>
                                                    <button
                                                        onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                                                        className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-300"
                                                    >
                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        <span>{isExpanded ? 'Hide' : 'Show'} definition</span>
                                                    </button>

                                                    {isExpanded && parsedDef && (
                                                        <div className="mt-3 p-3 bg-fcc-charcoal rounded border border-fcc-border overflow-x-auto">
                                                            <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                                                                {JSON.stringify(parsedDef, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="ml-4 flex flex-col space-y-2">
                                                    {index > 0 && (
                                                        <button
                                                            onClick={() => onRevert(version)}
                                                            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-fcc-gold bg-fcc-gold/20 hover:bg-fcc-gold/30 rounded-md transition-colors border border-fcc-gold/50"
                                                        >
                                                            <RotateCcw size={16} />
                                                            <span>Revert</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end p-6 border-t border-fcc-border bg-fcc-charcoal">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-300 bg-fcc-midnight border border-fcc-border hover:bg-fcc-charcoal rounded-md transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkflowVersionHistory;
