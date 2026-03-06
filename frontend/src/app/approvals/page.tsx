'use client';

import React, { useState } from 'react';
import { MainNavigation } from '@/components/MainNavigation';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { useApprovals, useMyApprovalTasks } from '@/hooks/queries/useApprovalsQuery';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

function ApprovalsPage() {
    const [activeTab, setActiveTab] = useState<'pending' | 'returned' | 'completed' | 'all'>('pending');
    const { isAdmin, isSuperAdmin } = useAuth();
    const canViewAll = isAdmin || isSuperAdmin;
    const myTasksQuery = useMyApprovalTasks(!canViewAll);
    const allTasksQuery = useApprovals(canViewAll);
    const tasks = (canViewAll ? allTasksQuery.data : myTasksQuery.data) || [];
    const isLoading = canViewAll ? allTasksQuery.isLoading : myTasksQuery.isLoading;
    const error = canViewAll ? allTasksQuery.error : myTasksQuery.error;

    const getFilteredTasks = () => {
        switch (activeTab) {
            case 'pending':
                return tasks.filter((task) => task.status === 'Pending');
            case 'returned':
                return tasks.filter((task) => task.status === 'Returned');
            case 'completed':
                return tasks.filter((task) => task.status === 'Approved' || task.status === 'Rejected');
            default:
                return tasks;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pending':
                return <Clock className="text-yellow-500" size={20} />;
            case 'Approved':
                return <CheckCircle className="text-green-500" size={20} />;
            case 'Rejected':
                return <XCircle className="text-red-500" size={20} />;
            case 'Returned':
                return <AlertCircle className="text-orange-500" size={20} />;
            default:
                return <AlertCircle className="text-gray-500" size={20} />;
        }
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
        switch (status) {
            case 'Pending':
                return `${baseClasses} bg-yellow-500/20 text-yellow-400`;
            case 'Approved':
                return `${baseClasses} bg-green-500/20 text-green-400`;
            case 'Rejected':
                return `${baseClasses} bg-red-500/20 text-red-400`;
            case 'Returned':
                return `${baseClasses} bg-orange-500/20 text-orange-400`;
            default:
                return `${baseClasses} bg-gray-500/20 text-gray-400`;
        }
    };

    const getPriorityBadge = (priority: string) => {
        const baseClasses = 'px-2 py-1 rounded text-xs font-medium';
        switch (priority) {
            case 'High':
                return `${baseClasses} bg-red-500/20 text-red-400`;
            case 'Medium':
                return `${baseClasses} bg-yellow-500/20 text-yellow-400`;
            case 'Low':
                return `${baseClasses} bg-green-500/20 text-green-400`;
            default:
                return `${baseClasses} bg-gray-500/20 text-gray-400`;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isOverdue = (deadline: string) => {
        return new Date(deadline) < new Date();
    };

    const filteredTasks = getFilteredTasks();
    const pendingCount = tasks.filter((t) => t.status === 'Pending').length;
    const returnedCount = tasks.filter((t) => t.status === 'Returned').length;
    const completedCount = tasks.filter((t) => t.status === 'Approved' || t.status === 'Rejected').length;

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Approval Inbox</h1>
                    <p className="text-gray-400">Review and action pending approval requests</p>
                </div>
                <div className="flex gap-4 mb-6 border-b border-fcc-border">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'pending'
                            ? 'text-fcc-gold border-b-2 border-fcc-gold'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Pending
                        {pendingCount > 0 && (
                            <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('returned')}
                        className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'returned'
                            ? 'text-fcc-gold border-b-2 border-fcc-gold'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Returned
                        {returnedCount > 0 && (
                            <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                                {returnedCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'completed'
                            ? 'text-fcc-gold border-b-2 border-fcc-gold'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Completed
                        {completedCount > 0 && (
                            <span className="ml-2 bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                                {completedCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'all'
                            ? 'text-fcc-gold border-b-2 border-fcc-gold'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        All Tasks
                    </button>
                </div>
                {isLoading ? (
                    <CardSkeleton cards={3} />
                ) : error ? (
                    <div className="text-center py-12 bg-fcc-midnight rounded-lg">
                        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">Error Loading Tasks</h3>
                        <p className="text-gray-400">
                            {error.message || 'Failed to load approval tasks. Please try again.'}
                        </p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-12 bg-fcc-midnight rounded-lg">
                        <AlertCircle className="mx-auto text-gray-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">No Tasks Found</h3>
                        <p className="text-gray-400">
                            {activeTab === 'pending'
                                ? 'You have no pending approval requests at the moment.'
                                : activeTab === 'completed'
                                    ? 'No completed tasks to display.'
                                    : 'No approval tasks found.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredTasks.map((task) => (
                            <Link
                                key={task.id}
                                href={`/approvals/${task.id}`}
                                className="block bg-fcc-midnight rounded-lg p-6 hover:bg-fcc-midnight/80 transition-colors border border-fcc-border hover:border-fcc-gold"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            {getStatusIcon(task.status)}
                                            <h3 className="text-lg font-bold text-white">{task.formName || task.taskName}</h3>
                                            <span className={getStatusBadge(task.status)}>{task.status}</span>
                                            {task.priority && (
                                                <span className={getPriorityBadge(task.priority)}>{task.priority}</span>
                                            )}
                                            {(task.isOverdue || (task.deadline && isOverdue(task.deadline))) && task.status === 'Pending' && (
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                                                    OVERDUE
                                                </span>
                                            )}
                                        </div>

                                        {task.description && (
                                            <p className="text-gray-400 mb-4">{task.description}</p>
                                        )}

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500">Form:</span>
                                                <p className="text-white font-medium">{task.formName || task.workflowName || 'N/A'}</p>
                                            </div>
                                            {task.submittedBy && (
                                                <div>
                                                    <span className="text-gray-500">Submitted By:</span>
                                                    <p className="text-white font-medium">{task.submittedBy}</p>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-gray-500">Created:</span>
                                                <p className="text-white font-medium">{formatDate(task.createdDate || task.assignedDate || '')}</p>
                                            </div>
                                            {(task.dueDate || task.deadline) && (
                                                <div>
                                                    <span className="text-gray-500">Due Date:</span>
                                                    <p
                                                        className={`font-medium ${(task.isOverdue || isOverdue(task.dueDate || task.deadline || '')) && task.status === 'Pending'
                                                            ? 'text-red-400'
                                                            : 'text-white'
                                                            }`}
                                                    >
                                                        {formatDate(task.dueDate || task.deadline || '')}
                                                    </p>
                                                </div>
                                            )}
                                            {(task.completedDate || task.completedAt) && (
                                                <div>
                                                    <span className="text-gray-500">Completed:</span>
                                                    <p className="text-white font-medium">{formatDate(task.completedDate || task.completedAt || '')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight className="text-gray-500 ml-4" size={20} />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ApprovalsPageWrapper() {
    return (
        <AuthGuard>
            <ApprovalsPage />
        </AuthGuard>
    );
}
