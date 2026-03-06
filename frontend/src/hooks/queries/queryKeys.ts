/**
 * Centralized query key factory for React Query.
 * Use these keys to ensure consistent cache invalidation across the app.
 */
export const queryKeys = {
    // Forms
    forms: {
        all: ['forms'] as const,
        list: (categoryId?: string) => ['forms', 'list', categoryId] as const,
        detail: (id: string) => ['forms', 'detail', id] as const,
        versions: (formId: string) => ['forms', 'versions', formId] as const,
        version: (formId: string, versionId: string) => ['forms', 'versions', formId, versionId] as const,
        fields: (formId: string) => ['forms', 'fields', formId] as const,
        lifecycle: (formId: string) => ['forms', 'lifecycle', formId] as const,
        archived: ['forms', 'archived'] as const,
        expired: ['forms', 'expired'] as const,
        search: (query: string) => ['forms', 'search', query] as const,
        permissions: (formId: string) => ['forms', 'permissions', formId] as const,
        crossFieldValidation: (formId: string) => ['forms', 'crossFieldValidation', formId] as const,
    },

    // Workflows
    workflows: {
        all: ['workflows'] as const,
        list: ['workflows', 'list'] as const,
        detail: (id: string) => ['workflows', 'detail', id] as const,
        executions: ['workflows', 'executions'] as const,
        executionDetail: (id: string) => ['workflows', 'executions', id] as const,
        analytics: ['workflows', 'analytics'] as const,
        versions: (workflowId: string) => ['workflows', 'versions', workflowId] as const,
    },

    // Submissions
    submissions: {
        all: ['submissions'] as const,
        list: ['submissions', 'list'] as const,
        detail: (id: string) => ['submissions', 'detail', id] as const,
        byForm: (formId: string) => ['submissions', 'byForm', formId] as const,
        mine: ['submissions', 'mine'] as const,
        drafts: {
            all: ['submissions', 'drafts'] as const,
            byForm: (formId: string) => ['submissions', 'drafts', formId] as const,
            detail: (formId: string, draftId: string) => ['submissions', 'drafts', formId, draftId] as const,
        },
    },

    // Approvals
    approvals: {
        all: ['approvals'] as const,
        list: ['approvals', 'list'] as const,
        myTasks: ['approvals', 'myTasks'] as const,
        detail: (id: string) => ['approvals', 'detail', id] as const,
        history: (id: string) => ['approvals', 'history', id] as const,
    },

    // Notifications
    notifications: {
        all: ['notifications'] as const,
        list: ['notifications', 'list'] as const,
        preferences: ['notifications', 'preferences'] as const,
    },

    // Admin
    admin: {
        users: {
            all: ['admin', 'users'] as const,
            list: (params?: { first?: number; max?: number; search?: string }) =>
                ['admin', 'users', 'list', params] as const,
            detail: (id: string) => ['admin', 'users', id] as const,
            roles: (id: string) => ['admin', 'users', id, 'roles'] as const,
        },
        roles: ['admin', 'roles'] as const,
        categories: {
            all: ['admin', 'categories'] as const,
            detail: (id: string) => ['admin', 'categories', id] as const,
            root: ['admin', 'categories', 'root'] as const,
            sub: (parentId: string) => ['admin', 'categories', 'sub', parentId] as const,
        },
        templates: {
            all: ['admin', 'templates'] as const,
            detail: (id: string) => ['admin', 'templates', id] as const,
            public: ['admin', 'templates', 'public'] as const,
            byCategory: (category: string) => ['admin', 'templates', 'byCategory', category] as const,
        },
        settings: {
            all: ['admin', 'settings'] as const,
            byKey: (key: string) => ['admin', 'settings', key] as const,
            byCategory: (category: string) => ['admin', 'settings', 'category', category] as const,
            metrics: ['admin', 'settings', 'metrics'] as const,
        },
        escalation: {
            all: ['admin', 'escalation'] as const,
            detail: (id: string) => ['admin', 'escalation', id] as const,
            byWorkflow: (workflowId: string) => ['admin', 'escalation', 'workflow', workflowId] as const,
        },
        auditLogs: {
            all: ['admin', 'auditLogs'] as const,
            detail: (id: string) => ['admin', 'auditLogs', id] as const,
            entityTypes: ['admin', 'auditLogs', 'entityTypes'] as const,
            actions: ['admin', 'auditLogs', 'actions'] as const,
        },
        performance: ['admin', 'performance'] as const,
    },

    // User Profile
    userProfile: {
        me: ['userProfile', 'me'] as const,
        search: (query: string) => ['userProfile', 'search', query] as const,
    },
} as const;
