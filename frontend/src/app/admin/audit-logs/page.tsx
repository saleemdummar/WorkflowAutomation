'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback } from 'react';
import { auditLogsApi } from '../../../lib/api';
import { AuthGuard } from '../../../components/AuthGuard';
import { ChevronLeft, ChevronRight, Search, Filter, Clock, User, FileText } from 'lucide-react';
import Link from 'next/link';

interface AuditLogEntry {
    id: string;
    action: string;
    entityType: string;
    entityId?: string;
    entityName: string;
    userId: string;
    userName: string;
    userEmail: string;
    oldValues?: string;
    newValues?: string;
    ipAddress?: string;
    additionalInfo?: string;
    timestamp: string;
}

const actionColors: Record<string, string> = {
    Create: 'bg-green-500/20 text-green-400',
    Update: 'bg-blue-500/20 text-blue-400',
    Delete: 'bg-red-500/20 text-red-400',
    Publish: 'bg-purple-500/20 text-purple-400',
    Unpublish: 'bg-yellow-500/20 text-yellow-400',
    Submit: 'bg-cyan-500/20 text-cyan-400',
    Approve: 'bg-green-500/20 text-green-400',
    Reject: 'bg-red-500/20 text-red-400',
    Login: 'bg-gray-500/20 text-gray-400',
    Export: 'bg-indigo-500/20 text-indigo-400',
    Import: 'bg-indigo-500/20 text-indigo-400',
    PermissionGranted: 'bg-green-500/20 text-green-400',
    PermissionRevoked: 'bg-red-500/20 text-red-400',
};

function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [entityTypes, setEntityTypes] = useState<string[]>([]);
    const [actions, setActions] = useState<string[]>([]);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    useEffect(() => {
        const loadFilters = async () => {
            try {
                const [types, acts] = await Promise.all([
                    auditLogsApi.getEntityTypes(),
                    auditLogsApi.getActions(),
                ]);
                setEntityTypes(types);
                setActions(acts);
            } catch { /* ignore */ }
        };
        loadFilters();
    }, []);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const result = await auditLogsApi.getLogs({
                page,
                pageSize: 25,
                entityType: entityTypeFilter || undefined,
                action: actionFilter || undefined,
                search: search || undefined,
            });
            setLogs(result.items);
            setTotalPages(result.totalPages);
            setTotalCount(result.totalCount);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, [page, entityTypeFilter, actionFilter, search]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    return (
        <div className="min-h-screen bg-fcc-charcoal text-white">
            <header className="bg-fcc-midnight border-b border-fcc-border px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-fcc-charcoal rounded border border-transparent hover:border-fcc-border">
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter">Audit Logs</h1>
                            <p className="text-sm text-gray-400">{totalCount} total entries</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Filters */}
                <div className="bg-fcc-midnight border border-fcc-border rounded-lg p-4 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-50 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-3 py-2 bg-fcc-charcoal border border-fcc-border text-white text-sm rounded focus:border-fcc-gold outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" />
                        <select
                            value={entityTypeFilter}
                            onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
                            className="bg-fcc-charcoal border border-fcc-border text-white text-sm rounded px-3 py-2 focus:border-fcc-gold outline-none"
                        >
                            <option value="">All Entity Types</option>
                            {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                            className="bg-fcc-charcoal border border-fcc-border text-white text-sm rounded px-3 py-2 focus:border-fcc-gold outline-none"
                        >
                            <option value="">All Actions</option>
                            {actions.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-fcc-midnight border border-fcc-border rounded-lg overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold mx-auto mb-4" />
                            Loading audit logs...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <FileText size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No audit logs found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-fcc-border">
                            {logs.map((log) => (
                                <div key={log.id} className="hover:bg-fcc-charcoal/50 transition-colors">
                                    <div
                                        className="p-4 cursor-pointer flex items-center gap-4"
                                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                    >
                                        <div className="shrink-0">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${actionColors[log.action] || 'bg-gray-500/20 text-gray-400'}`}>
                                                {log.action}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400 bg-fcc-charcoal px-2 py-0.5 rounded">{log.entityType}</span>
                                                <span className="text-sm text-white truncate font-medium">{log.entityName}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <User size={14} />
                                                <span>{log.userName}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {expandedLog === log.id && (
                                        <div className="px-4 pb-4 space-y-2 text-sm">
                                            <div className="grid grid-cols-2 gap-4 bg-fcc-charcoal rounded p-3">
                                                <div><span className="text-gray-400">User Email:</span> <span className="text-white">{log.userEmail}</span></div>
                                                <div><span className="text-gray-400">IP Address:</span> <span className="text-white">{log.ipAddress || 'N/A'}</span></div>
                                                {log.entityId && <div><span className="text-gray-400">Entity ID:</span> <span className="text-white font-mono text-xs">{log.entityId}</span></div>}
                                            </div>
                                            {log.oldValues && (
                                                <details className="bg-fcc-charcoal rounded p-3">
                                                    <summary className="text-gray-400 cursor-pointer hover:text-white">Old Values</summary>
                                                    <pre className="mt-2 text-xs text-gray-300 overflow-x-auto">{JSON.stringify(JSON.parse(log.oldValues), null, 2)}</pre>
                                                </details>
                                            )}
                                            {log.newValues && (
                                                <details className="bg-fcc-charcoal rounded p-3">
                                                    <summary className="text-gray-400 cursor-pointer hover:text-white">New Values</summary>
                                                    <pre className="mt-2 text-xs text-gray-300 overflow-x-auto">{JSON.stringify(JSON.parse(log.newValues), null, 2)}</pre>
                                                </details>
                                            )}
                                            {log.additionalInfo && (
                                                <details className="bg-fcc-charcoal rounded p-3">
                                                    <summary className="text-gray-400 cursor-pointer hover:text-white">Additional Info</summary>
                                                    <pre className="mt-2 text-xs text-gray-300 overflow-x-auto">{JSON.stringify(JSON.parse(log.additionalInfo), null, 2)}</pre>
                                                </details>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
                        <div className="flex items-center gap-2">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded bg-fcc-midnight border border-fcc-border hover:border-fcc-gold disabled:opacity-50">
                                <ChevronLeft size={16} />
                            </button>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded bg-fcc-midnight border border-fcc-border hover:border-fcc-gold disabled:opacity-50">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function AuditLogsPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin']}>
            <AuditLogsPage />
        </AuthGuard>
    );
}
