'use client';

import React, { useEffect, useState } from 'react';
import { MainNavigation } from '@/components/MainNavigation';
import { notificationsApi, type NotificationPreferences } from '@/lib/api';
import { Save, Mail, Bell, MessageSquare } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { useToast } from '@/contexts/ToastContext';

function NotificationPreferencesPage() {
    const toast = useToast();
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        emailOnWorkflowStart: true,
        emailOnWorkflowComplete: true,
        emailOnWorkflowFail: true,
        emailOnApprovalNeeded: true,
        emailOnApprovalDecision: true,
        emailOnFormSubmission: false,
        inAppNotifications: true,
        emailDigestFrequency: 'Immediate',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            setLoading(true);
            const data = await notificationsApi.getPreferences();
            setPreferences(data);
        } catch (error) {
            console.error('Failed to load preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await notificationsApi.updatePreferences(preferences);
            toast.success('Notification preferences saved successfully!');
        } catch (error) {
            console.error('Failed to save preferences:', error);
            toast.error('Failed to save preferences. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (key: keyof NotificationPreferences) => {
        setPreferences({ ...preferences, [key]: !preferences[key] });
    };

    const handleDigestChange = (frequency: 'Immediate' | 'Daily' | 'Weekly' | 'Never') => {
        setPreferences({ ...preferences, emailDigestFrequency: frequency });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-fcc-charcoal">
                <MainNavigation />
                <div className="container mx-auto px-6 py-8">
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fcc-gold mx-auto"></div>
                        <p className="text-gray-400 mt-4">Loading preferences...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Notification Preferences</h1>
                    <p className="text-gray-400">Manage how you receive notifications</p>
                </div>

                <div className="max-w-3xl">
                    <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Mail className="text-fcc-gold" size={24} />
                            <h2 className="text-2xl font-bold text-white">Email Notifications</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-fcc-border">
                                <div>
                                    <h3 className="text-white font-medium">Workflow Started</h3>
                                    <p className="text-sm text-gray-400">Get notified when a workflow execution begins</p>
                                </div>
                                <button
                                    onClick={() => handleToggle('emailOnWorkflowStart')}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${preferences.emailOnWorkflowStart ? 'bg-fcc-gold' : 'bg-gray-600'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.emailOnWorkflowStart ? 'translate-x-7' : 'translate-x-1'
                                            }`}
                                    ></div>
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-fcc-border">
                                <div>
                                    <h3 className="text-white font-medium">Workflow Completed</h3>
                                    <p className="text-sm text-gray-400">Get notified when a workflow completes successfully</p>
                                </div>
                                <button
                                    onClick={() => handleToggle('emailOnWorkflowComplete')}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${preferences.emailOnWorkflowComplete ? 'bg-fcc-gold' : 'bg-gray-600'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.emailOnWorkflowComplete ? 'translate-x-7' : 'translate-x-1'
                                            }`}
                                    ></div>
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-fcc-border">
                                <div>
                                    <h3 className="text-white font-medium">Workflow Failed</h3>
                                    <p className="text-sm text-gray-400">Get notified when a workflow execution fails</p>
                                </div>
                                <button
                                    onClick={() => handleToggle('emailOnWorkflowFail')}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${preferences.emailOnWorkflowFail ? 'bg-fcc-gold' : 'bg-gray-600'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.emailOnWorkflowFail ? 'translate-x-7' : 'translate-x-1'
                                            }`}
                                    ></div>
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-fcc-border">
                                <div>
                                    <h3 className="text-white font-medium">Approval Needed</h3>
                                    <p className="text-sm text-gray-400">Get notified when you need to approve something</p>
                                </div>
                                <button
                                    onClick={() => handleToggle('emailOnApprovalNeeded')}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${preferences.emailOnApprovalNeeded ? 'bg-fcc-gold' : 'bg-gray-600'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.emailOnApprovalNeeded ? 'translate-x-7' : 'translate-x-1'
                                            }`}
                                    ></div>
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-fcc-border">
                                <div>
                                    <h3 className="text-white font-medium">Approval Decision</h3>
                                    <p className="text-sm text-gray-400">Get notified when your approval request is actioned</p>
                                </div>
                                <button
                                    onClick={() => handleToggle('emailOnApprovalDecision')}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${preferences.emailOnApprovalDecision ? 'bg-fcc-gold' : 'bg-gray-600'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.emailOnApprovalDecision ? 'translate-x-7' : 'translate-x-1'
                                            }`}
                                    ></div>
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <h3 className="text-white font-medium">Form Submission</h3>
                                    <p className="text-sm text-gray-400">Get notified when forms you own receive submissions</p>
                                </div>
                                <button
                                    onClick={() => handleToggle('emailOnFormSubmission')}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${preferences.emailOnFormSubmission ? 'bg-fcc-gold' : 'bg-gray-600'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.emailOnFormSubmission ? 'translate-x-7' : 'translate-x-1'
                                            }`}
                                    ></div>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <MessageSquare className="text-fcc-gold" size={24} />
                            <h2 className="text-2xl font-bold text-white">Email Digest</h2>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-3">
                                How often would you like to receive email summaries?
                            </label>
                            <div className="space-y-2">
                                {(['Immediate', 'Daily', 'Weekly', 'Never'] as const).map((freq) => (
                                    <label key={freq} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="digest"
                                            checked={preferences.emailDigestFrequency === freq}
                                            onChange={() => handleDigestChange(freq)}
                                            className="w-4 h-4 text-fcc-gold"
                                        />
                                        <span className="text-white">{freq}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="bg-fcc-midnight rounded-lg p-6 border border-fcc-border mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Bell className="text-fcc-gold" size={24} />
                            <h2 className="text-2xl font-bold text-white">In-App Notifications</h2>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-medium">Enable In-App Notifications</h3>
                                <p className="text-sm text-gray-400">Show notifications in the notification bell</p>
                            </div>
                            <button
                                onClick={() => handleToggle('inAppNotifications')}
                                className={`relative w-12 h-6 rounded-full transition-colors ${preferences.inAppNotifications ? 'bg-fcc-gold' : 'bg-gray-600'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.inAppNotifications ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                ></div>
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-fcc-gold hover:bg-yellow-500 text-fcc-charcoal px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
                        >
                            <Save size={20} />
                            {saving ? 'Saving...' : 'Save Preferences'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function NotificationPreferencesPageWrapper() {
    return (
        <AuthGuard>
            <NotificationPreferencesPage />
        </AuthGuard>
    );
}
