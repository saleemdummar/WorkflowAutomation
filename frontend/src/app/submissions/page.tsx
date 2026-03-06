'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainNavigation } from '../../components/MainNavigation';
import { AuthGuard } from '../../components/AuthGuard';
import { useMySubmissions } from '../../hooks/queries/useSubmissionsQuery';
import { getStatusColorClasses, categorizeSubmissionStatus } from '../../lib/statusUtils';

function SubmissionsPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const { data: submissions = [], isLoading, error } = useMySubmissions();

    const filteredSubmissions = filter === 'all'
        ? submissions
        : submissions.filter(s => categorizeSubmissionStatus(s.status) === filter);

    const getStatusColor = getStatusColorClasses;

    return (
        <div className="min-h-screen bg-fcc-charcoal">
            <MainNavigation />

            <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="bg-fcc-midnight border border-fcc-border p-8 shadow-2xl">
                    <div className="mb-6 flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-white">Submission History</h2>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => router.push('/submissions/drafts')}
                                className="px-4 py-2 text-sm font-bold border border-fcc-border text-gray-300 hover:border-fcc-gold hover:text-fcc-gold transition-all"
                            >
                                View Drafts
                            </button>
                            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 text-sm font-bold border transition-all ${filter === f
                                        ? 'bg-fcc-gold text-fcc-charcoal border-fcc-gold'
                                        : 'text-white border-fcc-border hover:border-fcc-gold'
                                        }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fcc-gold mx-auto"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-10 bg-fcc-charcoal border border-red-500">
                            <p className="text-red-400">Failed to load submissions: {error.message}</p>
                        </div>
                    ) : filteredSubmissions.length === 0 ? (
                        <div className="text-center py-10 bg-fcc-charcoal border border-fcc-border">
                            <p className="text-gray-400">No submissions found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredSubmissions.map((submission) => (
                                <div
                                    key={submission.id}
                                    className="bg-fcc-charcoal border border-fcc-border p-6 hover:border-white transition-all"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-2">
                                                {submission.formName || 'Unnamed Form'}
                                            </h3>
                                            <p className="text-sm text-gray-400">
                                                Submitted: {new Date(submission.submittedAt || submission.createdDate || '').toLocaleString()}
                                            </p>
                                        </div>
                                        <div className={`px-4 py-2 border font-bold text-sm ${getStatusColor(submission.status)}`}>
                                            {submission.status}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => router.push(`/submissions/${submission.id}`)}
                                            className="px-4 py-2 border border-fcc-gold text-fcc-gold text-sm font-bold hover:bg-fcc-gold hover:text-fcc-charcoal transition-all"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function SubmissionsPageWrapper() {
    return (
        <AuthGuard>
            <SubmissionsPage />
        </AuthGuard>
    );
}
