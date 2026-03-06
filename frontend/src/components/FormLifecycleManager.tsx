'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formsApi } from '../lib/api';
import { FormLifecycleStatus } from '../types/entities';
import { useToast } from '../contexts/ToastContext';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

interface Props {
    formId: string;
    onStatusChange?: () => void;
}

export default function FormLifecycleManager({ formId, onStatusChange }: Props) {
    const [confirmAction, ConfirmDialog] = useConfirmDialog();
    const [status, setStatus] = useState<FormLifecycleStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [archiveReason, setArchiveReason] = useState('');
    const [restoreReason, setRestoreReason] = useState('');

    const [expirationDate, setExpirationDate] = useState('');
    const [expirationReason, setExpirationReason] = useState('');

    const [publishDate, setPublishDate] = useState('');
    const [unpublishDate, setUnpublishDate] = useState('');
    const [scheduleReason, setScheduleReason] = useState('');

    const loadStatus = useCallback(async () => {
        try {
            setLoading(true);
            const status = await formsApi.getLifecycleStatus(formId);
            setStatus(status);
            setError(null);
        } catch (err: unknown) {
            const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load form lifecycle status';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [formId]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    const handleArchive = async () => {
        if (!(await confirmAction({ message: 'Are you sure you want to archive this form? It will no longer be accessible to users.' }))) return;

        try {
            setLoading(true);
            await formsApi.archive(formId, { archiveReason });
            setError(null);
            setArchiveReason('');
            await loadStatus();
            if (onStatusChange) onStatusChange();
        } catch (err: unknown) {
            const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to archive form';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        try {
            setLoading(true);
            await formsApi.restore(formId, { restoreReason });
            setError(null);
            setRestoreReason('');
            await loadStatus();
            if (onStatusChange) onStatusChange();
        } catch (err: unknown) {
            const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to restore form';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSetExpiration = async () => {
        try {
            setLoading(true);
            await formsApi.setExpiration(formId, {
                expirationDate: expirationDate || null,
                expirationReason,
            });
            setError(null);
            setExpirationDate('');
            setExpirationReason('');
            await loadStatus();
            if (onStatusChange) onStatusChange();
        } catch (err: unknown) {
            const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to set expiration';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSchedulePublishing = async () => {
        try {
            setLoading(true);
            await formsApi.setSchedule(formId, {
                publishDate: publishDate || null,
                unpublishDate: unpublishDate || null,
                scheduleReason,
            });
            setError(null);
            setPublishDate('');
            setUnpublishDate('');
            setScheduleReason('');
            await loadStatus();
            if (onStatusChange) onStatusChange();
        } catch (err: unknown) {
            const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to schedule publishing';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !status) {
        return <div className="p-4 text-center text-gray-400">Loading form lifecycle status...</div>;
    }

    return (
        <div className="space-y-6 p-6 bg-fcc-midnight border border-fcc-border">
            <h2 className="text-2xl font-bold text-white">Form Lifecycle Management</h2>

            {error && (
                <div className="p-4 bg-red-900/30 border border-red-700">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {status && (
                <div className="space-y-6">
                    <div className="bg-fcc-charcoal p-4 border border-fcc-border">
                        <h3 className="font-semibold text-white mb-2">Current Status</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-gray-400">Published:</span>
                                <span className={`ml-2 font-medium ${status.isPublished ? 'text-green-400' : 'text-gray-500'}`}>
                                    {status.isPublished ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-400">Archived:</span>
                                <span className={`ml-2 font-medium ${status.isArchived ? 'text-orange-400' : 'text-gray-500'}`}>
                                    {status.isArchived ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-400">Expired:</span>
                                <span className={`ml-2 font-medium ${status.isExpired ? 'text-red-400' : 'text-gray-500'}`}>
                                    {status.isExpired ? 'Yes' : 'No'}
                                </span>
                            </div>
                        </div>

                        {status.isArchived && status.archivedAt && (
                            <div className="mt-3 p-2 bg-orange-900/20 border border-orange-800 text-sm">
                                <p className="text-orange-300">
                                    <strong>Archived on:</strong> {new Date(status.archivedAt).toLocaleString()}
                                </p>
                                {status.archiveReason && (
                                    <p className="text-orange-400 mt-1"><strong>Reason:</strong> {status.archiveReason}</p>
                                )}
                            </div>
                        )}

                        {status.expirationDate && (
                            <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-800 text-sm">
                                <p className="text-yellow-300">
                                    <strong>Expires on:</strong> {new Date(status.expirationDate).toLocaleString()}
                                </p>
                                {status.expirationReason && (
                                    <p className="text-yellow-400 mt-1"><strong>Reason:</strong> {status.expirationReason}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-fcc-border pt-4">
                        <h3 className="font-semibold text-white mb-3">Archive Management</h3>
                        {!status.isArchived ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Archive Reason (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={archiveReason}
                                        onChange={(e) => setArchiveReason(e.target.value)}
                                        className="w-full border border-fcc-border bg-fcc-charcoal text-white px-3 py-2 focus:outline-none focus:border-fcc-gold"
                                        placeholder="e.g., Form replaced by new version"
                                    />
                                </div>
                                <button
                                    onClick={handleArchive}
                                    disabled={loading}
                                    className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                                >
                                    {loading ? 'Archiving...' : 'Archive Form'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Restore Reason (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={restoreReason}
                                        onChange={(e) => setRestoreReason(e.target.value)}
                                        className="w-full border border-fcc-border bg-fcc-charcoal text-white px-3 py-2 focus:outline-none focus:border-fcc-gold"
                                        placeholder="e.g., Form needed again"
                                    />
                                </div>
                                <button
                                    onClick={handleRestore}
                                    disabled={loading}
                                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {loading ? 'Restoring...' : 'Restore Form'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-fcc-border pt-4">
                        <h3 className="font-semibold text-white mb-3">Expiration Management</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Expiration Date (Leave blank to remove)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={expirationDate}
                                    onChange={(e) => setExpirationDate(e.target.value)}
                                    className="w-full border border-fcc-border bg-fcc-charcoal text-white px-3 py-2 focus:outline-none focus:border-fcc-gold"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Reason (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={expirationReason}
                                    onChange={(e) => setExpirationReason(e.target.value)}
                                    className="w-full border border-fcc-border bg-fcc-charcoal text-white px-3 py-2 focus:outline-none focus:border-fcc-gold"
                                    placeholder="e.g., Campaign end date"
                                />
                            </div>
                            <button
                                onClick={handleSetExpiration}
                                disabled={loading}
                                className="px-4 py-2 bg-fcc-gold text-fcc-charcoal font-bold hover:bg-yellow-400 disabled:opacity-50"
                            >
                                {loading ? 'Setting...' : 'Set Expiration'}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-fcc-border pt-4">
                        <h3 className="font-semibold text-white mb-3">Publishing Schedule</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Publish Date (Optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={publishDate}
                                        onChange={(e) => setPublishDate(e.target.value)}
                                        className="w-full border border-fcc-border bg-fcc-charcoal text-white px-3 py-2 focus:outline-none focus:border-fcc-gold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Unpublish Date (Optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={unpublishDate}
                                        onChange={(e) => setUnpublishDate(e.target.value)}
                                        className="w-full border border-fcc-border bg-fcc-charcoal text-white px-3 py-2 focus:outline-none focus:border-fcc-gold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Schedule Reason (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={scheduleReason}
                                    onChange={(e) => setScheduleReason(e.target.value)}
                                    className="w-full border border-fcc-border bg-fcc-charcoal text-white px-3 py-2 focus:outline-none focus:border-fcc-gold"
                                    placeholder="e.g., Limited time campaign"
                                />
                            </div>
                            <button
                                onClick={handleSchedulePublishing}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Scheduling...' : 'Schedule Publishing'}
                            </button>
                        </div>

                        {(status.publishDate || status.unpublishDate) && (
                            <div className="mt-3 p-2 bg-indigo-900/20 border border-indigo-800 text-sm">
                                {status.publishDate && (
                                    <p className="text-indigo-300">
                                        <strong>Scheduled to publish:</strong> {new Date(status.publishDate).toLocaleString()}
                                    </p>
                                )}
                                {status.unpublishDate && (
                                    <p className="text-indigo-300 mt-1">
                                        <strong>Scheduled to unpublish:</strong> {new Date(status.unpublishDate).toLocaleString()}
                                    </p>
                                )}
                                {status.scheduleReason && (
                                    <p className="text-indigo-400 mt-1"><strong>Reason:</strong> {status.scheduleReason}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <ConfirmDialog />
        </div>
    );
}
