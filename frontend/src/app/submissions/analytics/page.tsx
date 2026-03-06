'use client';

import React, { useEffect, useState } from 'react';
import { submissionsApi, formsApi } from '../../../lib/api';
import { AuthGuard } from '../../../components/AuthGuard';
import { ChevronLeft, BarChart3, FileText, CheckCircle, Clock, XCircle, Edit } from 'lucide-react';
import Link from 'next/link';

interface SubmissionStat {
    formId: string;
    formName: string;
    totalSubmissions: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    draftCount: number;
}

function SubmissionAnalyticsPage() {
    const [stats, setStats] = useState<SubmissionStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalSubmissions, setTotalSubmissions] = useState(0);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const forms = await formsApi.getAll();
                const statsPromises = forms.slice(0, 20).map(async (form: any) => {
                    try {
                        const submissions = await submissionsApi.getByForm(form.id);
                        const subs = Array.isArray(submissions) ? submissions : [];
                        return {
                            formId: form.id,
                            formName: form.name,
                            totalSubmissions: subs.length,
                            pendingCount: subs.filter((s: any) => s.status === 'Pending' || s.status === 'InReview').length,
                            approvedCount: subs.filter((s: any) => s.status === 'Approved' || s.status === 'Completed').length,
                            rejectedCount: subs.filter((s: any) => s.status === 'Rejected').length,
                            draftCount: subs.filter((s: any) => s.status === 'Draft' || s.isDraft).length,
                        };
                    } catch {
                        return { formId: form.id, formName: form.name, totalSubmissions: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0, draftCount: 0 };
                    }
                });
                const formStats = await Promise.all(statsPromises);
                const sorted = formStats.sort((a, b) => b.totalSubmissions - a.totalSubmissions);
                setStats(sorted);
                setTotalSubmissions(sorted.reduce((sum, s) => sum + s.totalSubmissions, 0));
            } catch (err) {
                console.error('Failed to load submission analytics:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="min-h-screen bg-fcc-charcoal text-white">
            <header className="bg-fcc-midnight border-b border-fcc-border px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-fcc-charcoal rounded border border-transparent hover:border-fcc-border">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter">Submission Analytics</h1>
                        <p className="text-sm text-gray-400">{totalSubmissions} total submissions across all forms</p>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-fcc-midnight rounded-lg p-4 border border-fcc-border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Total</span>
                            <FileText size={18} className="text-fcc-gold" />
                        </div>
                        <p className="text-2xl font-bold">{totalSubmissions}</p>
                    </div>
                    <div className="bg-fcc-midnight rounded-lg p-4 border border-fcc-border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Pending</span>
                            <Clock size={18} className="text-yellow-500" />
                        </div>
                        <p className="text-2xl font-bold text-yellow-400">{stats.reduce((s, st) => s + st.pendingCount, 0)}</p>
                    </div>
                    <div className="bg-fcc-midnight rounded-lg p-4 border border-fcc-border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Approved</span>
                            <CheckCircle size={18} className="text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-green-400">{stats.reduce((s, st) => s + st.approvedCount, 0)}</p>
                    </div>
                    <div className="bg-fcc-midnight rounded-lg p-4 border border-fcc-border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Rejected</span>
                            <XCircle size={18} className="text-red-500" />
                        </div>
                        <p className="text-2xl font-bold text-red-400">{stats.reduce((s, st) => s + st.rejectedCount, 0)}</p>
                    </div>
                </div>

                {/* Per-Form Breakdown */}
                <div className="bg-fcc-midnight border border-fcc-border rounded-lg">
                    <div className="p-4 border-b border-fcc-border">
                        <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 size={20} className="text-fcc-gold" /> Per-Form Breakdown</h2>
                    </div>
                    {loading ? (
                        <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold mx-auto" /></div>
                    ) : stats.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">No submission data available</div>
                    ) : (
                        <div className="divide-y divide-fcc-border">
                            {stats.filter(s => s.totalSubmissions > 0).map(stat => {
                                const maxCount = Math.max(...stats.map(s => s.totalSubmissions), 1);
                                return (
                                    <div key={stat.formId} className="p-4 hover:bg-fcc-charcoal/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-white">{stat.formName}</span>
                                                <span className="text-xs text-gray-400">({stat.totalSubmissions} total)</span>
                                            </div>
                                            <Link href={`/submissions?formId=${stat.formId}`} className="text-xs text-fcc-gold hover:underline">View All →</Link>
                                        </div>
                                        <div className="flex gap-1 h-4 rounded overflow-hidden bg-fcc-charcoal">
                                            {stat.approvedCount > 0 && <div className="bg-green-500" style={{ width: `${(stat.approvedCount / maxCount) * 100}%` }} title={`${stat.approvedCount} approved`} />}
                                            {stat.pendingCount > 0 && <div className="bg-yellow-500" style={{ width: `${(stat.pendingCount / maxCount) * 100}%` }} title={`${stat.pendingCount} pending`} />}
                                            {stat.rejectedCount > 0 && <div className="bg-red-500" style={{ width: `${(stat.rejectedCount / maxCount) * 100}%` }} title={`${stat.rejectedCount} rejected`} />}
                                            {stat.draftCount > 0 && <div className="bg-gray-500" style={{ width: `${(stat.draftCount / maxCount) * 100}%` }} title={`${stat.draftCount} drafts`} />}
                                        </div>
                                        <div className="flex gap-4 mt-1 text-xs text-gray-400">
                                            {stat.approvedCount > 0 && <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded" />{stat.approvedCount} approved</span>}
                                            {stat.pendingCount > 0 && <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded" />{stat.pendingCount} pending</span>}
                                            {stat.rejectedCount > 0 && <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded" />{stat.rejectedCount} rejected</span>}
                                            {stat.draftCount > 0 && <span className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-500 rounded" />{stat.draftCount} drafts</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function SubmissionAnalyticsPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin']}>
            <SubmissionAnalyticsPage />
        </AuthGuard>
    );
}
