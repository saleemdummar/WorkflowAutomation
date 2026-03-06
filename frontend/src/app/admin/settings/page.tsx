'use client';

import React, { useEffect, useState } from 'react';
import { MainNavigation } from '../../../components/MainNavigation';
import { AuthGuard } from '../../../components/AuthGuard';
import { systemSettingsApi } from '../../../lib/api';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import type { SystemSetting } from '../../../types/entities';
import type { SystemMetrics } from '../../../lib/api/types';

interface PerformanceMetrics extends SystemMetrics {
    activeWorkflowInstances?: number;
    pendingApprovals?: number;
    todaySubmissions?: number;
    todayApprovals?: number;
    averageWorkflowExecutionTime?: number;
    systemUptime?: number;
    lastUpdated?: string;
}

export default function SystemSettingsPage() {
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [newSetting, setNewSetting] = useState({ settingKey: '', settingValue: '', settingType: 'string', category: 'General', isEditable: true });
    const [showNewForm, setShowNewForm] = useState(false);
    const toast = useToast();
    const [confirmAction, ConfirmDialog] = useConfirmDialog();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [settingsData, metricsData] = await Promise.all([
                systemSettingsApi.getAll(),
                systemSettingsApi.getMetrics().catch(() => null),
            ]);
            setSettings(settingsData);
            setMetrics(metricsData as PerformanceMetrics | null);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSetting = async (key: string) => {
        try {
            await systemSettingsApi.update(key, { settingValue: editValue });
            setEditingKey(null);
            await loadData();
        } catch (error) {
            console.error('Failed to update setting:', error);
            toast.error('Failed to update setting');
        }
    };

    const handleCreateSetting = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await systemSettingsApi.create(newSetting);
            setShowNewForm(false);
            setNewSetting({ settingKey: '', settingValue: '', settingType: 'string', category: 'General', isEditable: true });
            await loadData();
        } catch (error) {
            console.error('Failed to create setting:', error);
            toast.error('Failed to create setting');
        }
    };

    const handleDeleteSetting = async (key: string) => {
        if (!(await confirmAction({ message: `Delete setting "${key}"?` }))) return;
        try {
            await systemSettingsApi.delete(key);
            await loadData();
        } catch (error) {
            console.error('Failed to delete setting:', error);
            toast.error('Failed to delete setting');
        }
    };

    const handleSeedDefaults = async () => {
        try {
            await systemSettingsApi.seedDefaults();
            await loadData();
        } catch (error) {
            console.error('Failed to seed defaults:', error);
            toast.error('Failed to seed defaults');
        }
    };

    const categories = [...new Set(settings.map(s => s.category))];

    return (
        <AuthGuard requiredRoles={['super-admin', 'admin']}>
            <div className="min-h-screen bg-fcc-charcoal">
                <MainNavigation />
                <main className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
                    <div className="bg-fcc-midnight border border-fcc-border p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h1 className="text-3xl font-black text-white">System Settings</h1>
                            <div className="flex gap-3">
                                <button onClick={handleSeedDefaults}
                                    className="px-4 py-2 border border-fcc-border text-gray-300 text-sm font-bold hover:border-fcc-gold hover:text-fcc-gold transition-colors">
                                    Seed Defaults
                                </button>
                                <button onClick={() => setShowNewForm(!showNewForm)}
                                    className="px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold text-sm hover:bg-yellow-400 transition-colors">
                                    {showNewForm ? 'Cancel' : '+ New Setting'}
                                </button>
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        {metrics && (
                            <div className="mb-8">
                                <h2 className="text-xl font-bold text-white mb-4">Performance Metrics</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Forms', value: metrics.totalForms },
                                        { label: 'Total Workflows', value: metrics.totalWorkflows },
                                        { label: 'Total Submissions', value: metrics.totalSubmissions },
                                        { label: 'Active Instances', value: metrics.activeWorkflowInstances },
                                        { label: 'Pending Approvals', value: metrics.pendingApprovals },
                                        { label: 'Today Submissions', value: metrics.todaySubmissions },
                                        { label: 'Today Approvals', value: metrics.todayApprovals },
                                        { label: 'Avg Exec Time (s)', value: metrics.averageWorkflowExecutionTime },
                                    ].map((m) => (
                                        <div key={m.label} className="bg-fcc-charcoal border border-fcc-border p-4">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider">{m.label}</p>
                                            <p className="text-2xl font-black text-fcc-gold mt-1">{m.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* New Setting Form */}
                        {showNewForm && (
                            <form onSubmit={handleCreateSetting} className="mb-8 p-4 bg-fcc-charcoal border border-fcc-border space-y-4">
                                <h3 className="text-lg font-bold text-white">Create New Setting</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="Setting Key" value={newSetting.settingKey}
                                        onChange={(e) => setNewSetting({ ...newSetting, settingKey: e.target.value })}
                                        className="bg-fcc-midnight border border-fcc-border text-white px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-fcc-gold" required />
                                    <input type="text" placeholder="Setting Value" value={newSetting.settingValue}
                                        onChange={(e) => setNewSetting({ ...newSetting, settingValue: e.target.value })}
                                        className="bg-fcc-midnight border border-fcc-border text-white px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-fcc-gold" required />
                                    <select value={newSetting.settingType}
                                        onChange={(e) => setNewSetting({ ...newSetting, settingType: e.target.value })}
                                        className="bg-fcc-midnight border border-fcc-border text-white px-3 py-2 focus:outline-none focus:border-fcc-gold">
                                        <option value="string">String</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="json">JSON</option>
                                    </select>
                                    <input type="text" placeholder="Category" value={newSetting.category}
                                        onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                                        className="bg-fcc-midnight border border-fcc-border text-white px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-fcc-gold" />
                                </div>
                                <button type="submit" className="px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold hover:bg-yellow-400 transition-colors">
                                    Create
                                </button>
                            </form>
                        )}

                        {/* Settings by Category */}
                        {loading ? (
                            <div className="text-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold mx-auto"></div>
                            </div>
                        ) : settings.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                No settings configured. Click &quot;Seed Defaults&quot; to create initial settings.
                            </div>
                        ) : (
                            categories.map((category) => (
                                <div key={category} className="mb-8">
                                    <h2 className="text-xl font-bold text-white mb-4 border-b border-fcc-border pb-2">{category}</h2>
                                    <div className="space-y-2">
                                        {settings.filter(s => s.category === category).map((setting) => (
                                            <div key={setting.settingKey} className="flex items-center justify-between p-3 bg-fcc-charcoal border border-fcc-border">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white text-sm">{setting.settingKey}</span>
                                                        <span className="text-xs text-gray-500 px-1 border border-fcc-border">{setting.settingType}</span>
                                                    </div>
                                                    {setting.description && <p className="text-xs text-gray-400 mt-1">{setting.description}</p>}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {editingKey === setting.settingKey ? (
                                                        <>
                                                            <input type="text" value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="bg-fcc-midnight border border-fcc-gold text-white px-2 py-1 text-sm w-48 focus:outline-none" />
                                                            <button onClick={() => handleUpdateSetting(setting.settingKey)}
                                                                className="text-xs text-green-400 font-bold hover:text-green-300">Save</button>
                                                            <button onClick={() => setEditingKey(null)}
                                                                className="text-xs text-gray-400 font-bold hover:text-white">Cancel</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="text-sm text-fcc-gold font-mono">{setting.settingValue}</span>
                                                            {setting.isEditable && (
                                                                <button onClick={() => { setEditingKey(setting.settingKey); setEditValue(setting.settingValue); }}
                                                                    className="text-xs text-fcc-gold font-bold hover:text-yellow-300">Edit</button>
                                                            )}
                                                            <button onClick={() => handleDeleteSetting(setting.settingKey)}
                                                                className="text-xs text-red-500 font-bold hover:text-red-300">Delete</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
                <ConfirmDialog />
            </div>
        </AuthGuard>
    );
}
