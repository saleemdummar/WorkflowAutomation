'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuthGuard } from '../../../components/AuthGuard';
import { submissionsApi, formsApi } from '../../../lib/api';
import { getStatusColorClasses } from '../../../lib/statusUtils';
import FormRenderer from '../../../components/FormRenderer';
import { FormLayoutConfig } from '../../../types/form-builder';
import type { WorkflowExecutionInfo } from '../../../types/entities';

interface SubmissionDetail {
    id: string;
    formId: string;
    formName: string;
    submittedBy: string;
    submitterName?: string;
    submittedAt: string;
    status: string;
    submissionData: string;
    createdDate?: string;
    lastModifiedAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    workflowExecutions?: WorkflowExecutionInfo[];
}

function SubmissionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const submissionId = params.id as string;
    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [form, setForm] = useState<any>(null);
    const [formLayout, setFormLayout] = useState<FormLayoutConfig | undefined>(undefined);
    const [formTheme, setFormTheme] = useState<any>(undefined);

    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                const data = await submissionsApi.getById(submissionId);
                setSubmission(data as unknown as SubmissionDetail);

                if (data.submissionData) {
                    try {
                        setFormData(JSON.parse(data.submissionData));
                    } catch (e) {
                        console.error('Failed to parse submission data:', e);
                    }
                }

                // Fetch form details
                const formData = await formsApi.getById(data.formId);
                setForm(formData);

                if (formData.layout) {
                    try {
                        const layout = JSON.parse(formData.layout);
                        setFormLayout(layout.layout);
                        setFormTheme(layout.theme);
                    } catch (e) {
                        console.error('Failed to parse form layout:', e);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch submission:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSubmission();
    }, [submissionId]);

    const getStatusColor = getStatusColorClasses;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-fcc-charcoal flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold"></div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="min-h-screen bg-fcc-charcoal">
                <div className="max-w-4xl mx-auto py-12 px-4">
                    <div className="bg-red-900/30 border border-red-700 text-red-200 p-6">
                        <h2 className="text-xl font-bold mb-2">Error</h2>
                        <p>Submission not found</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <header className="bg-fcc-midnight border-b border-fcc-border">
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-12">
                        <button
                            onClick={() => router.push('/submissions')}
                            className="text-white hover:text-fcc-gold flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span className="font-bold">Back to Submissions</span>
                        </button>
                        <h1 className="text-xl font-bold text-white">Submission Details</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-12 px-4">
                <div className="bg-fcc-midnight border border-fcc-border p-8 shadow-2xl">
                    <div className="mb-8 pb-6 border-b border-fcc-border">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-3xl font-bold text-white">{submission.formName}</h2>
                            <div className={`px-4 py-2 border font-bold ${getStatusColor(submission.status)}`}>
                                {submission.status}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-400">Submitted:</span>
                                <p className="text-white">{new Date(submission.submittedAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <span className="text-gray-400">Submission ID:</span>
                                <p className="text-white font-mono text-xs">{submission.id}</p>
                            </div>
                        </div>
                        {submission.approvedAt && (
                            <div className="mt-4 p-4 bg-green-900/20 border border-green-700">
                                <p className="text-sm text-green-200">
                                    Approved on {new Date(submission.approvedAt).toLocaleString()}
                                    {submission.approvedBy && ` by ${submission.approvedBy}`}
                                </p>
                            </div>
                        )}
                        {submission.rejectionReason && (
                            <div className="mt-4 p-4 bg-red-900/20 border border-red-700">
                                <p className="text-sm font-bold text-red-200 mb-1">Rejection Reason:</p>
                                <p className="text-sm text-red-200">{submission.rejectionReason}</p>
                            </div>
                        )}
                    </div>

                    {form && (
                        <div>
                            <h3 className="text-xl font-bold text-white mb-4">Submitted Form</h3>
                            <FormRenderer
                                definition={form.definition}
                                initialData={formData}
                                layout={formLayout}
                                theme={formTheme}
                                mode="view"
                            />
                        </div>
                    )}

                    {submission.workflowExecutions && submission.workflowExecutions.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-fcc-border">
                            <h3 className="text-xl font-bold text-white mb-4">Workflow Execution</h3>
                            <div className="space-y-4">
                                {submission.workflowExecutions.map((exec) => {
                                    const statusColors: Record<string, string> = {
                                        running: 'text-blue-400 bg-blue-900/30 border-blue-700',
                                        completed: 'text-green-400 bg-green-900/30 border-green-700',
                                        failed: 'text-red-400 bg-red-900/30 border-red-700',
                                        cancelled: 'text-gray-400 bg-gray-900/30 border-gray-700',
                                        pending: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
                                        rejected: 'text-red-400 bg-red-900/30 border-red-700',
                                    };
                                    const colorClass = statusColors[exec.status.toLowerCase()] || 'text-gray-400 bg-gray-900/30 border-gray-700';
                                    return (
                                        <div key={exec.instanceId} className="bg-fcc-charcoal border border-fcc-border p-4 rounded-lg">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="text-white font-semibold">{exec.workflowName}</h4>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Started: {new Date(exec.startedAt).toLocaleString()}
                                                        {exec.completedAt && ` | Completed: ${new Date(exec.completedAt).toLocaleString()}`}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 text-xs font-bold border rounded ${colorClass}`}>
                                                    {exec.status}
                                                </span>
                                            </div>
                                            {exec.currentNodeName && (
                                                <p className="text-sm text-gray-300 mt-1">
                                                    Current step: <span className="text-fcc-gold">{exec.currentNodeName}</span>
                                                </p>
                                            )}
                                            {exec.errorMessage && (
                                                <p className="text-sm text-red-300 mt-2 p-2 bg-red-900/20 border border-red-800 rounded">
                                                    {exec.errorMessage}
                                                </p>
                                            )}
                                            <button
                                                onClick={() => router.push(`/workflows/executions/${exec.instanceId}`)}
                                                className="mt-3 text-sm text-fcc-gold hover:text-fcc-gold/80 underline"
                                            >
                                                View Execution Details
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function SubmissionDetailPageWrapper() {
    return (
        <AuthGuard>
            <SubmissionDetailPage />
        </AuthGuard>
    );
}
