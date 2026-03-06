/**
 * Shared status utilities for consistent status display across the application.
 * Eliminates duplicated getStatusColor() and status-checking logic.
 */

// ---------- Submission Status ----------

export type SubmissionStatusCategory = 'pending' | 'approved' | 'rejected' | 'unknown';

const PENDING_STATUSES = new Set([
    'pending', 'submitted', 'inreview', 'in_review',
    'inprogress', 'in_progress', 'processing', 'draft',
]);

const APPROVED_STATUSES = new Set(['approved', 'completed']);

const REJECTED_STATUSES = new Set([
    'rejected', 'returned', 'cancelled', 'canceled',
]);

/**
 * Categorize a submission status string into a broad category.
 */
export function categorizeSubmissionStatus(status: string): SubmissionStatusCategory {
    const normalized = (status || '').toLowerCase().trim();
    if (PENDING_STATUSES.has(normalized)) return 'pending';
    if (APPROVED_STATUSES.has(normalized)) return 'approved';
    if (REJECTED_STATUSES.has(normalized)) return 'rejected';
    return 'unknown';
}

/**
 * Get Tailwind CSS classes for a submission status badge.
 * Replaces the duplicated getStatusColor() functions.
 */
export function getStatusColorClasses(status: string): string {
    switch (categorizeSubmissionStatus(status)) {
        case 'approved':
            return 'text-green-400 border-green-700 bg-green-900/30';
        case 'rejected':
            return 'text-red-400 border-red-700 bg-red-900/30';
        case 'pending':
            return 'text-yellow-400 border-yellow-700 bg-yellow-900/30';
        default:
            return 'text-blue-400 border-blue-700 bg-blue-900/30';
    }
}

/**
 * Get a dot-style color class for inline status indicators.
 */
export function getStatusDotColor(status: string): string {
    switch (categorizeSubmissionStatus(status)) {
        case 'approved':
            return 'bg-green-400';
        case 'rejected':
            return 'bg-red-400';
        case 'pending':
            return 'bg-yellow-400';
        default:
            return 'bg-blue-400';
    }
}

// ---------- Workflow Status ----------

export function getWorkflowStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
        case 'running':
        case 'active':
            return 'text-blue-400 border-blue-700 bg-blue-900/30';
        case 'completed':
            return 'text-green-400 border-green-700 bg-green-900/30';
        case 'failed':
        case 'error':
            return 'text-red-400 border-red-700 bg-red-900/30';
        case 'paused':
        case 'suspended':
            return 'text-yellow-400 border-yellow-700 bg-yellow-900/30';
        case 'cancelled':
        case 'canceled':
            return 'text-gray-400 border-gray-700 bg-gray-900/30';
        default:
            return 'text-gray-400 border-gray-600 bg-gray-900/30';
    }
}

// ---------- Approval Priority ----------

export function getPriorityColor(priority: string): string {
    switch (priority?.toLowerCase()) {
        case 'high':
        case 'urgent':
            return 'text-red-400 border-red-700 bg-red-900/30';
        case 'medium':
        case 'normal':
            return 'text-yellow-400 border-yellow-700 bg-yellow-900/30';
        case 'low':
            return 'text-green-400 border-green-700 bg-green-900/30';
        default:
            return 'text-gray-400 border-gray-600 bg-gray-900/30';
    }
}

// ---------- Format Helpers ----------

/**
 * Format a date string for display. Returns "N/A" for falsy values.
 */
export function formatDate(dateString: string | undefined | null, options?: Intl.DateTimeFormatOptions): string {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString(undefined, options ?? {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return 'Invalid date';
    }
}

/**
 * Format a date string with time.
 */
export function formatDateTime(dateString: string | undefined | null): string {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return 'Invalid date';
    }
}

/**
 * Format a relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(dateString: string | undefined | null): string {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateString);
    } catch {
        return 'Invalid date';
    }
}
