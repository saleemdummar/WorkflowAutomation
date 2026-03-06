'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Check, X, Mail, Workflow, FileText, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { notificationsApi } from '@/lib/api';
import { signalRService } from '@/services/signalRService';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import type { Notification } from '@/types/entities';

export const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const { info, success } = useToast();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();

    useEffect(() => {
        loadNotifications();
        const handleNotification = (data: any) => {
            const newNotification: Notification = {
                id: crypto.randomUUID(),
                type: 'FormSubmitted',
                title: data.title,
                message: data.message,
                isRead: false,
                createdAt: data.timestamp || new Date().toISOString()
            };
            setNotifications(prev => [newNotification, ...prev]);
            info(`${data.title}: ${data.message}`);
        };

        const handleApprovalTask = (data: any) => {
            const newNotification: Notification = {
                id: data.taskId || crypto.randomUUID(),
                type: 'ApprovalNeeded',
                title: 'New Approval Task',
                message: `${data.formName}: ${data.action}`,
                isRead: false,
                createdAt: data.timestamp || new Date().toISOString(),
                relatedEntityId: data.taskId,
                relatedEntityType: 'ApprovalTask'
            };
            setNotifications(prev => [newNotification, ...prev]);
            info(`New Approval Task: ${newNotification.message}`);
        };

        const handleWorkflowStatus = (data: any) => {
            const newNotification: Notification = {
                id: data.instanceId || crypto.randomUUID(),
                type: data.status === 'Completed' ? 'WorkflowCompleted' : 'WorkflowStarted',
                title: 'Workflow Update',
                message: data.message,
                isRead: false,
                createdAt: data.timestamp || new Date().toISOString(),
                relatedEntityId: data.instanceId,
                relatedEntityType: 'WorkflowInstance'
            };
            setNotifications(prev => [newNotification, ...prev]);
            info(`Workflow Update: ${data.message}`);
        };

        const handleFormSubmissionUpdate = (data: any) => {
            const newNotification: Notification = {
                id: data.submissionId || crypto.randomUUID(),
                type: 'FormSubmitted',
                title: 'Form Submission Update',
                message: data.message,
                isRead: false,
                createdAt: data.timestamp || new Date().toISOString(),
                relatedEntityId: data.submissionId,
                relatedEntityType: 'FormSubmission'
            };
            setNotifications(prev => [newNotification, ...prev]);
            success(`Form Update: ${data.message}`);
        };

        const handleSystemNotification = (data: any) => {
            const newNotification: Notification = {
                id: crypto.randomUUID(),
                type: 'FormSubmitted',
                title: data.title,
                message: data.message,
                isRead: false,
                createdAt: data.timestamp || new Date().toISOString()
            };
            setNotifications(prev => [newNotification, ...prev]);
            info(`${data.title}: ${data.message}`);
        };

        signalRService.on('ReceiveNotification', handleNotification);
        signalRService.on('ReceiveApprovalTask', handleApprovalTask);
        signalRService.on('ReceiveWorkflowStatusUpdate', handleWorkflowStatus);
        signalRService.on('ReceiveFormSubmissionUpdate', handleFormSubmissionUpdate);
        signalRService.on('ReceiveSystemNotification', handleSystemNotification);

        return () => {
            signalRService.off('ReceiveNotification', handleNotification);
            signalRService.off('ReceiveApprovalTask', handleApprovalTask);
            signalRService.off('ReceiveWorkflowStatusUpdate', handleWorkflowStatus);
            signalRService.off('ReceiveFormSubmissionUpdate', handleFormSubmissionUpdate);
            signalRService.off('ReceiveSystemNotification', handleSystemNotification);
        };
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await notificationsApi.getMyNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to load notifications:', error);
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
            setLoading(true);
            await notificationsApi.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearAll = async () => {
        if (await confirmAction({ message: 'Are you sure you want to clear all notifications?' })) {
            try {
                setLoading(true);
                await notificationsApi.clearAll();
                setNotifications([]);
                setShowDropdown(false);
            } catch (error) {
                console.error('Failed to clear notifications:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'WorkflowStarted':
            case 'WorkflowCompleted':
            case 'WorkflowFailed':
                return <Workflow size={18} className="text-blue-400" />;
            case 'ApprovalNeeded':
            case 'ApprovalDecision':
                return <CheckCircle size={18} className="text-green-400" />;
            case 'FormSubmitted':
                return <FileText size={18} className="text-purple-400" />;
            default:
                return <Mail size={18} className="text-gray-400" />;
        }
    };

    const getRelatedLink = (notification: Notification) => {
        if (!notification.relatedEntityId || !notification.relatedEntityType) return null;

        switch (notification.relatedEntityType) {
            case 'Workflow':
                return `/workflows/edit/${notification.relatedEntityId}`;
            case 'WorkflowExecution':
                return `/workflows/executions/${notification.relatedEntityId}`;
            case 'ApprovalTask':
                return `/approvals/${notification.relatedEntityId}`;
            case 'FormSubmission':
                return `/submissions/${notification.relatedEntityId}`;
            default:
                return null;
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const recentNotifications = notifications.slice(0, 10);

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-fcc-midnight"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
            {showDropdown && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-96 bg-fcc-midnight border border-fcc-border rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col">
                        <div className="p-4 border-b border-fcc-border">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold text-white">Notifications</h3>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            disabled={loading}
                                            className="text-xs text-fcc-gold hover:text-yellow-500 transition-colors disabled:opacity-50"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                    <button
                                        onClick={handleClearAll}
                                        disabled={loading}
                                        className="text-xs text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                    >
                                        Clear all
                                    </button>
                                </div>
                            </div>
                            <Link
                                href="/notifications/preferences"
                                className="text-xs text-gray-400 hover:text-white transition-colors"
                                onClick={() => setShowDropdown(false)}
                            >
                                Notification Preferences →
                            </Link>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {recentNotifications.length === 0 ? (
                                <div className="text-center py-12">
                                    <Bell className="mx-auto text-gray-500 mb-3" size={48} />
                                    <p className="text-gray-400">No notifications</p>
                                </div>
                            ) : (
                                <div>
                                    {recentNotifications.map((notification) => {
                                        const link = getRelatedLink(notification);
                                        const NotificationContent = (
                                            <div
                                                className={`p-4 border-b border-fcc-border hover:bg-fcc-charcoal/50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-blue-500/5' : ''
                                                    }`}
                                                onClick={() => {
                                                    handleMarkAsRead(notification.id);
                                                    setShowDropdown(false);
                                                }}
                                            >
                                                <div className="flex gap-3">
                                                    <div className="shrink-0 mt-1">
                                                        {getNotificationIcon(notification.type || '')}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <h4 className={`text-sm font-bold ${!notification.isRead ? 'text-white' : 'text-gray-300'}`}>
                                                                {notification.title}
                                                            </h4>
                                                            {!notification.isRead && (
                                                                <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1"></div>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-gray-500">
                                                                {formatTime(notification.createdAt)}
                                                            </span>
                                                            {!notification.isRead && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleMarkAsRead(notification.id);
                                                                    }}
                                                                    className="text-xs text-fcc-gold hover:text-yellow-500 transition-colors"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );

                                        return link ? (
                                            <Link key={notification.id} href={link}>
                                                {NotificationContent}
                                            </Link>
                                        ) : (
                                            <div key={notification.id}>{NotificationContent}</div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {notifications.length > 10 && (
                            <div className="p-3 border-t border-fcc-border text-center">
                                <Link
                                    href="/notifications"
                                    className="text-sm text-fcc-gold hover:text-yellow-500 transition-colors"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    View all notifications →
                                </Link>
                            </div>
                        )}
                    </div>
                </>
            )}
            <ConfirmDialog />
        </div>
    );
};
