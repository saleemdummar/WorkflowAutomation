'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainNavigation } from '@/components/MainNavigation';
import { notificationsApi } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import type { Notification } from '@/types/entities';
import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    Settings,
    Workflow,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    ChevronRight
} from 'lucide-react';

function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const toast = useToast();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationsApi.getMyNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationsApi.markAsRead(id);
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await notificationsApi.delete(id);
            setNotifications(notifications.filter(n => n.id !== id));
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const handleClearAll = async () => {
        if (!(await confirmAction({ message: 'Are you sure you want to clear all notifications?' }))) return;
        try {
            await notificationsApi.clearAll();
            setNotifications([]);
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    };

    const getTypeIcon = (type: string | undefined) => {
        switch (type) {
            case 'WorkflowStarted':
                return <Workflow className="text-blue-400" size={20} />;
            case 'WorkflowCompleted':
                return <CheckCircle className="text-green-400" size={20} />;
            case 'WorkflowFailed':
                return <XCircle className="text-red-400" size={20} />;
            case 'ApprovalNeeded':
                return <Clock className="text-yellow-400" size={20} />;
            case 'ApprovalDecision':
                return <Check className="text-green-400" size={20} />;
            case 'FormSubmitted':
                return <FileText className="text-purple-400" size={20} />;
            default:
                return <Bell className="text-gray-400" size={20} />;
        }
    };

    const getTypeBadge = (type: string | undefined) => {
        const styles: Record<string, string> = {
            WorkflowStarted: 'bg-blue-500/20 text-blue-400',
            WorkflowCompleted: 'bg-green-500/20 text-green-400',
            WorkflowFailed: 'bg-red-500/20 text-red-400',
            ApprovalNeeded: 'bg-yellow-500/20 text-yellow-400',
            ApprovalDecision: 'bg-green-500/20 text-green-400',
            FormSubmitted: 'bg-purple-500/20 text-purple-400'
        };
        return styles[type || ''] || 'bg-gray-500/20 text-gray-400';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    const getEntityLink = (notification: Notification): string | null => {
        if (!notification.relatedEntityId) return null;
        switch (notification.relatedEntityType) {
            case 'ApprovalTask':
                return `/approvals/${notification.relatedEntityId}`;
            case 'WorkflowInstance':
                return `/workflows/executions/${notification.relatedEntityId}`;
            case 'FormSubmission':
                return `/submissions/${notification.relatedEntityId}`;
            default:
                return null;
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread' && n.isRead) return false;
        if (filter === 'read' && !n.isRead) return false;
        if (typeFilter !== 'all' && n.type !== typeFilter) return false;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const notificationTypes = [
        { value: 'all', label: 'All Types' },
        { value: 'ApprovalNeeded', label: 'Approvals' },
        { value: 'WorkflowStarted', label: 'Workflow Started' },
        { value: 'WorkflowCompleted', label: 'Workflow Completed' },
        { value: 'WorkflowFailed', label: 'Workflow Failed' },
        { value: 'FormSubmitted', label: 'Form Submissions' }
    ];

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />

            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                            <Bell className="text-fcc-gold" />
                            Notifications
                        </h1>
                        <p className="text-gray-400">
                            {unreadCount > 0
                                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                                : 'All caught up!'}
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 flex gap-3">
                        <Link
                            href="/notifications/preferences"
                            className="flex items-center gap-2 px-4 py-2 text-gray-400 border border-fcc-border hover:border-fcc-gold hover:text-white transition-colors"
                        >
                            <Settings size={18} />
                            Preferences
                        </Link>
                    </div>
                </div>

                {/* Filters and Actions */}
                <div className="bg-fcc-midnight border border-fcc-border p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="flex gap-4">
                            {/* Read Status Filter */}
                            <div className="flex gap-2">
                                {(['all', 'unread', 'read'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-4 py-2 text-sm font-medium border transition-colors ${filter === f
                                            ? 'bg-fcc-gold text-fcc-charcoal border-fcc-gold'
                                            : 'text-gray-400 border-fcc-border hover:border-gray-500'
                                            }`}
                                    >
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                        {f === 'unread' && unreadCount > 0 && (
                                            <span className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Type Filter */}
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="bg-fcc-charcoal border border-fcc-border text-gray-300 px-3 py-2 text-sm focus:border-fcc-gold focus:outline-none"
                            >
                                {notificationTypes.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleMarkAllAsRead}
                                disabled={unreadCount === 0}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 border border-fcc-border hover:border-green-500 hover:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCheck size={16} />
                                Mark All Read
                            </button>
                            <button
                                onClick={handleClearAll}
                                disabled={notifications.length === 0}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 border border-fcc-border hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={16} />
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notifications List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold"></div>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-12 bg-fcc-midnight border border-fcc-border">
                        <Bell className="mx-auto text-gray-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">No Notifications</h3>
                        <p className="text-gray-400">
                            {filter !== 'all' || typeFilter !== 'all'
                                ? "No notifications match your current filters."
                                : "You're all caught up! New notifications will appear here."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredNotifications.map(notification => {
                            const link = getEntityLink(notification);
                            const content = (
                                <div
                                    className={`bg-fcc-midnight border border-fcc-border p-4 hover:border-fcc-gold transition-colors ${!notification.isRead ? 'border-l-4 border-l-fcc-gold' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-full bg-fcc-charcoal">
                                            {getTypeIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className={`font-bold ${notification.isRead ? 'text-gray-300' : 'text-white'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    <p className="text-gray-400 text-sm mt-1">{notification.message}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`px-2 py-1 rounded text-xs ${getTypeBadge(notification.type || '')}`}>
                                                        {notification.type ? notification.type.replace(/([A-Z])/g, ' $1').trim() : 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span>{formatDate(notification.createdAt)}</span>
                                                {link && (
                                                    <span className="flex items-center gap-1 text-fcc-gold">
                                                        View Details <ChevronRight size={12} />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {!notification.isRead && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleMarkAsRead(notification.id);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-green-400 hover:bg-fcc-charcoal transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleDelete(notification.id);
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-fcc-charcoal transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );

                            return link ? (
                                <Link key={notification.id} href={link} onClick={() => handleMarkAsRead(notification.id)}>
                                    {content}
                                </Link>
                            ) : (
                                <div key={notification.id}>{content}</div>
                            );
                        })}
                    </div>
                )}
            </div>
            <ConfirmDialog />
        </div>
    );
}

export default function NotificationsPageWrapper() {
    return (
        <AuthGuard>
            <NotificationsPage />
        </AuthGuard>
    );
}
