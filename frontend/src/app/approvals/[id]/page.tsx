'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainNavigation } from '@/components/MainNavigation';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { approvalsApi } from '@/lib/api';
import { ApprovalTask } from '@/types/entities';
import { CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';

function ApprovalDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { success, error: showError } = useToast();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();
    const [task, setTask] = useState<ApprovalTask | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [comments, setComments] = useState('');
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [history, setHistory] = useState<Array<{ decision: string; decidedBy: string; decidedAt: string; comments?: string }>>([]);

    const loadTask = useCallback(async () => {
        try {
            setLoading(true);
            const data = await approvalsApi.getTaskById(params.id as string);
            setTask(data);
        } catch (err) {
            console.error('Failed to load approval task:', err);
            showError('Failed to load approval task');
        } finally {
            setLoading(false);
        }
    }, [params.id, showError]);

    const loadHistory = useCallback(async () => {
        try {
            const data = await approvalsApi.getHistory(params.id as string);
            setHistory(data || []);
        } catch (err) {
            console.error('Failed to load approval history:', err);
        }
    }, [params.id]);

    useEffect(() => {
        if (params.id) {
            loadTask();
            loadHistory();
        }
    }, [params.id, loadTask, loadHistory]);

    const handleApprove = async () => {
        if (!task) return;

        if (!comments && await confirmAction({ message: 'Are you sure you want to approve without comments?' })) {
            await submitApproval('approve');
        } else if (comments) {
            await submitApproval('approve');
        }
    };

    const handleReject = async () => {
        if (!task) return;

        if (!comments) {
            showError('Please provide comments for rejection');
            setShowCommentBox(true);
            return;
        }

        if (await confirmAction({ message: 'Are you sure you want to reject this request?', variant: 'danger' })) {
            await submitApproval('reject');
        }
    };

    const handleReturn = async () => {
        if (!task) return;

        if (!comments) {
            showError('Please provide comments when returning for revision');
            setShowCommentBox(true);
            return;
        }

        if (await confirmAction({ message: 'Are you sure you want to return this request for revision?', variant: 'warning' })) {
            await submitApproval('return');
        }
    };

    const submitApproval = async (action: 'approve' | 'reject' | 'return') => {
        if (!task) return;

        try {
            setActionLoading(true);
            await approvalsApi.takeAction(task.id, {
                action,
                comments,
            });

            const messages = {
                approve: 'Request approved successfully',
                reject: 'Request rejected successfully',
                return: 'Request returned for revision successfully'
            };
            success(messages[action]);
            router.push('/approvals');
        } catch (err) {
            console.error('Failed to submit approval:', err);
            showError('Failed to submit approval. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pending':
                return <Clock className="text-yellow-500" size={24} />;
            case 'Approved':
                return <CheckCircle className="text-green-500" size={24} />;
            case 'Rejected':
                return <XCircle className="text-red-500" size={24} />;
            case 'Returned':
                return <AlertCircle className="text-orange-500" size={24} />;
            case 'Escalated':
                return <AlertCircle className="text-purple-500" size={24} />;
            default:
                return <AlertCircle className="text-gray-500" size={24} />;
        }
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = 'px-4 py-2 rounded-lg text-sm font-bold';
        switch (status) {
            case 'Pending':
                return `${baseClasses} bg-yellow-500/20 text-yellow-400`;
            case 'Approved':
                return `${baseClasses} bg-green-500/20 text-green-400`;
            case 'Rejected':
                return `${baseClasses} bg-red-500/20 text-red-400`;
            case 'Returned':
                return `${baseClasses} bg-orange-500/20 text-orange-400`;
            case 'Escalated':
                return `${baseClasses} bg-purple-500/20 text-purple-400`;
            default:
                return `${baseClasses} bg-gray-500/20 text-gray-400`;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isOverdue = (deadline: string) => {
        return new Date(deadline) < new Date();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-fcc-charcoal">
                <MainNavigation />
                <div className="container mx-auto px-6 py-8">
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold mx-auto"></div>
                        <p className="text-gray-400 mt-4">Loading approval task...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="min-h-screen bg-fcc-charcoal">
                <MainNavigation />
                <div className="container mx-auto px-6 py-8">
                    <div className="text-center py-12">
                        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">Task Not Found</h3>
                        <p className="text-gray-400 mb-6">The requested approval task could not be found.</p>
                        <Link
                            href="/approvals"
                            className="inline-flex items-center gap-2 bg-fcc-gold hover:bg-yellow-500 text-fcc-charcoal px-6 py-3 rounded-lg font-bold transition-colors"
                        >
                            <ArrowLeft size={20} />
                            Back to Inbox
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const isPending = task.status === 'Pending';

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />
            <div className="container mx-auto px-6 py-8">
                <div className="mb-6">
                    <Link
                        href="/approvals"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Back to Inbox
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">{task.formName || task.taskName || 'Approval Task'}</h1>
                            {task.description && <p className="text-gray-400">{task.description}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                            {getStatusIcon(task.status)}
                            <span className={getStatusBadge(task.status)}>{task.status}</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                            <h2 className="text-xl font-bold text-white mb-4">Task Information</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-gray-500 text-sm">Form</span>
                                    <p className="text-white font-medium">{task.formName || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 text-sm">Priority</span>
                                    <p className="text-white font-medium capitalize">{task.priority || 'Normal'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 text-sm">Created Date</span>
                                    <p className="text-white font-medium">{formatDate(task.createdDate || task.assignedDate || '')}</p>
                                </div>
                                {(task.dueDate || task.deadline) && (
                                    <div>
                                        <span className="text-gray-500 text-sm">Due Date</span>
                                        <p
                                            className={`font-medium ${(task.isOverdue || (task.dueDate && isOverdue(task.dueDate))) && isPending ? 'text-red-400' : 'text-white'
                                                }`}
                                        >
                                            {formatDate(task.dueDate || task.deadline || '')}
                                            {((task.isOverdue || (task.dueDate && isOverdue(task.dueDate))) && isPending) && (
                                                <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                                                    OVERDUE
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                )}
                                {task.submittedAt && (
                                    <div>
                                        <span className="text-gray-500 text-sm">Submitted At</span>
                                        <p className="text-white font-medium">{formatDate(task.submittedAt)}</p>
                                    </div>
                                )}
                                {(task.completedDate || task.completedAt) && (
                                    <>
                                        <div>
                                            <span className="text-gray-500 text-sm">Completed Date</span>
                                            <p className="text-white font-medium">{formatDate(task.completedDate || task.completedAt || '')}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-sm">Approved By</span>
                                            <p className="text-white font-medium">{task.approverName || 'N/A'}</p>
                                        </div>
                                    </>
                                )}
                                {task.comments && (
                                    <div className="col-span-2">
                                        <span className="text-gray-500 text-sm">Comments</span>
                                        <p className="text-white font-medium">{task.comments}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {task.submissionData && task.submissionData.length > 0 && (
                            <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                                <h2 className="text-xl font-bold text-white mb-4">Submission Data</h2>
                                <div className="space-y-3">
                                    {task.submissionData.map((data, index) => (
                                        <div key={index} className="flex justify-between items-start border-b border-fcc-border pb-3 last:border-0">
                                            <span className="text-gray-400">{data.fieldLabel || data.fieldName}</span>
                                            <span className="text-white font-medium max-w-[60%] text-right">{data.value || '-'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {task.formData && !task.submissionData && (
                            <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                                <h2 className="text-xl font-bold text-white mb-4">Form Data</h2>
                                <pre className="bg-fcc-charcoal p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
                                    {JSON.stringify(JSON.parse(task.formData), null, 2)}
                                </pre>
                            </div>
                        )}
                        {history.length > 0 && (
                            <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                                <h2 className="text-xl font-bold text-white mb-4">Approval History</h2>
                                <div className="space-y-4">
                                    {history.map((entry, index: number) => (
                                        <div key={index} className="flex gap-4 pb-4 border-b border-fcc-border last:border-0">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-white">{entry.decidedBy}</span>
                                                    {entry.decision === 'Approved' ? (
                                                        <CheckCircle className="text-green-500" size={16} />
                                                    ) : (
                                                        <XCircle className="text-red-500" size={16} />
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-400">{formatDate(entry.decidedAt)}</p>
                                                {entry.comments && (
                                                    <p className="mt-2 text-gray-300">{entry.comments}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-6">
                        {isPending && (
                            <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                                <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Comments {!showCommentBox && '(Optional)'}
                                    </label>
                                    <textarea
                                        value={comments}
                                        onChange={(e) => setComments(e.target.value)}
                                        placeholder="Add your comments here..."
                                        rows={4}
                                        className="w-full bg-fcc-charcoal border border-fcc-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-fcc-gold"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <button
                                        onClick={handleApprove}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
                                    >
                                        <CheckCircle size={20} />
                                        {actionLoading ? 'Processing...' : 'Approve'}
                                    </button>
                                    <button
                                        onClick={handleReturn}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
                                    >
                                        <AlertCircle size={20} />
                                        {actionLoading ? 'Processing...' : 'Return for Revision'}
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
                                    >
                                        <XCircle size={20} />
                                        {actionLoading ? 'Processing...' : 'Reject'}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border">
                            <h2 className="text-xl font-bold text-white mb-4">Related</h2>
                            <div className="space-y-2">
                                {task.formId && (
                                    <Link
                                        href={`/forms/${task.formId}`}
                                        className="block text-fcc-gold hover:underline"
                                    >
                                        View Form
                                    </Link>
                                )}
                                {task.workflowId && (
                                    <Link
                                        href={`/workflows/${task.workflowId}`}
                                        className="block text-fcc-gold hover:underline"
                                    >
                                        View Workflow
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ConfirmDialog />
        </div>
    );
}

export default function ApprovalDetailPageWrapper() {
    return (
        <AuthGuard>
            <ApprovalDetailPage />
        </AuthGuard>
    );
}
