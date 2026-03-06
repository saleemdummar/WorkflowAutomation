'use client';

import React, { useState } from 'react';
import { Save, Upload, CheckCircle, AlertTriangle, Play, Clock } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface WorkflowToolbarProps {
    workflowName: string;
    workflowDescription: string;
    onNameChange: (name: string) => void;
    onDescriptionChange: (description: string) => void;
    onSave: () => Promise<void>;
    onPublish: () => Promise<void>;
    onValidate: () => string[];
    onTest?: () => void;
    onVersionHistory?: () => void;
    saving?: boolean;
    isPublished?: boolean;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
    workflowName,
    workflowDescription,
    onNameChange,
    onDescriptionChange,
    onSave,
    onPublish,
    onValidate,
    onTest,
    onVersionHistory,
    saving = false,
    isPublished = false,
}) => {
    const [showValidation, setShowValidation] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);
    const { error } = useToast();

    const handleValidate = () => {
        const errors = onValidate();
        setValidationErrors(errors);
        setShowValidation(true);

        if (errors.length === 0) {
            setTimeout(() => setShowValidation(false), 3000);
        }
    };

    const handlePublish = async () => {
        const errors = onValidate();
        if (errors.length > 0) {
            setValidationErrors(errors);
            setShowValidation(true);
            error('Please fix validation errors before publishing');
            return;
        }

        setShowPublishConfirm(true);
    };

    const confirmPublish = async () => {
        setShowPublishConfirm(false);
        await onPublish();
    };

    return (
        <div className="absolute top-0 left-0 right-0 bg-fcc-charcoal border-b border-fcc-border p-2 sm:p-4 z-10">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="Workflow Name"
                    className="w-full sm:flex-1 bg-fcc-midnight border border-fcc-border text-white text-lg font-bold px-3 sm:px-4 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                />
                <input
                    type="text"
                    value={workflowDescription}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full sm:flex-1 bg-fcc-midnight border border-fcc-border text-white px-3 sm:px-4 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleValidate}
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <AlertTriangle size={18} />
                        Validate
                    </button>

                    {onTest && (
                        <button
                            onClick={onTest}
                            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Play size={18} />
                            Test
                        </button>
                    )}

                    {onVersionHistory && (
                        <button
                            onClick={onVersionHistory}
                            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Clock size={18} />
                            History
                        </button>
                    )}

                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-fcc-gold hover:bg-yellow-500 text-fcc-charcoal px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>

                    {!isPublished && (
                        <button
                            onClick={handlePublish}
                            disabled={saving}
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            <Upload size={18} />
                            Publish
                        </button>
                    )}

                    {isPublished && (
                        <span className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-lg font-medium">
                            <CheckCircle size={18} />
                            Published
                        </span>
                    )}
                </div>
            </div>
            {showValidation && (
                <div className={`mt-4 p-4 rounded-lg ${validationErrors.length === 0
                    ? 'bg-green-500/20 border border-green-500/50'
                    : 'bg-red-500/20 border border-red-500/50'
                    }`}>
                    {validationErrors.length === 0 ? (
                        <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle size={18} />
                            <span className="font-medium">Workflow is valid!</span>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-2 text-red-400 mb-2">
                                <AlertTriangle size={18} />
                                <span className="font-medium">Validation Errors:</span>
                            </div>
                            <ul className="list-disc list-inside text-red-400 text-sm space-y-1">
                                {validationErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Publish confirmation modal (replaces native confirm — fixes WF-15) */}
            {showPublishConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-fcc-charcoal border border-fcc-border rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-white mb-2">Publish Workflow</h3>
                        <p className="text-gray-400 mb-6">Are you sure you want to publish this workflow? It will become active and process form submissions.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowPublishConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-300 bg-fcc-midnight border border-fcc-border rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmPublish}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
