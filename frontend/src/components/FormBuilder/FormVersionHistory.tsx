'use client';

import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, X } from 'lucide-react';
import { FormVersion } from '../../types/entities';
import { formsApi } from '../../lib/api';

interface FormVersionHistoryProps {
    formId: string;
    isOpen: boolean;
    onClose: () => void;
    onRevert: (version: FormVersion) => void;
}

export const FormVersionHistory: React.FC<FormVersionHistoryProps> = ({
    formId,
    isOpen,
    onClose,
    onRevert
}) => {
    const [versions, setVersions] = useState<FormVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && formId) {
            loadVersions();
        }
    }, [isOpen, formId]);

    const loadVersions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await formsApi.getVersions(formId);
            setVersions(response);
        } catch (error: any) {
            setError(error?.response?.data?.message || 'Failed to load version history. Please try again.');
            setVersions([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <Clock size={20} />
                        <span>Form Version History</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Loading versions...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-800 font-medium">Error</p>
                                <p className="text-red-600 text-sm mt-1">{error}</p>
                                <button
                                    onClick={loadVersions}
                                    className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Clock size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No version history available</p>
                            <p className="text-sm">Versions will appear here as you save changes</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {versions.map((version, index) => (
                                <div
                                    key={version.id}
                                    className={`border rounded-lg p-4 transition-all ${index === 0
                                        ? 'border-blue-200 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <span className={`px-2 py-1 text-xs font-medium rounded ${index === 0
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    v{version.versionNumber}
                                                </span>
                                                {index === 0 && (
                                                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                                        Current
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-sm text-gray-600 mb-2">
                                                <span className="font-medium">{version.createdBy}</span>
                                                {' • '}
                                                {formatDate(version.createdAt)}
                                            </div>

                                            <p className="text-gray-700 mb-3">{version.changeDescription || 'No description'}</p>
                                        </div>

                                        <div className="ml-4">
                                            {index > 0 && (
                                                <button
                                                    onClick={() => onRevert(version)}
                                                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                                >
                                                    <RotateCcw size={16} />
                                                    <span>Revert</span>
                                                </button>
                                            )}
                                            {index === 0 && (
                                                <span className="text-xs text-gray-400 italic">Current version</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};