// Re-export API-specific types used across domain modules

export interface FormField {
    id: string;
    formId: string;
    fieldName: string;
    fieldLabel: string;
    fieldType: string;
    isRequired: boolean;
    displayOrder: number;
    options?: string;
    validationRules?: string;
    // Additional properties for direct component access
    name?: string;
    label?: string;
}

export interface VersionComparison {
    version1: number;
    version2: number;
    changes: Array<{
        path: string;
        type: 'added' | 'removed' | 'modified';
        oldValue?: unknown;
        newValue?: unknown;
    }>;
    addedNodes?: string[];
    removedNodes?: string[];
    addedEdges?: string[];
    removedEdges?: string[];
}

export interface FormExportData {
    form: import('../../types/entities').Form;
    versions?: import('../../types/entities').FormVersion[];
    permissions?: import('../../types/entities').FormPermission[];
}

export interface WorkflowStats {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    runningExecutions: number;
    averageDurationMs: number;
    successRate: number;
}

export interface WorkflowAnalytics {
    workflowId: string;
    workflowName: string;
    stats: WorkflowStats;
    executionTrend: Array<{ date: string; count: number; successCount: number; failedCount: number }>;
    topBottlenecks: Array<{ nodeName: string; averageDurationMs: number; executionCount: number }>;
}

export interface WorkflowTestResult {
    workflowId?: string;
    workflowName?: string;
    success: boolean;
    message?: string;
    testStartedAt?: string;
    testCompletedAt?: string;
    simulatedSteps?: Array<Record<string, unknown>>;
    validationErrors?: Array<string | Record<string, unknown>>;
    warnings?: string[];
}

export interface WorkflowExportData {
    workflow: import('../../types/entities').Workflow;
    versions?: Array<{ versionNumber: number; definition: string; createdAt: string }>;
}

export interface WorkflowVersion {
    id: string;
    workflowId: string;
    versionNumber: number;
    definition: string;
    changeDescription?: string;
    createdBy: string;
    createdAt: string;
}

export interface CrossFieldValidationRule {
    id: string;
    formId: string;
    formName?: string;
    ruleName: string;
    validationType: string;
    ruleConfiguration: string;
    errorMessage: string;
    isActive?: boolean;
    executionOrder: number;
    createdAt?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: Array<{ ruleName: string; errorMessage: string }>;
}

export interface ExpressionResult {
    success: boolean;
    result: unknown;
    error?: string;
}

export interface AuditLogPage {
    items: import('../../types/entities').AuditLog[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface SystemMetrics {
    totalForms: number;
    totalWorkflows: number;
    totalSubmissions: number;
    totalUsers: number;
    activeWorkflows: number;
}

export interface NotificationPreferences {
    emailOnWorkflowStart: boolean;
    emailOnWorkflowComplete: boolean;
    emailOnWorkflowFail: boolean;
    emailOnApprovalNeeded: boolean;
    emailOnApprovalDecision: boolean;
    emailOnFormSubmission: boolean;
    inAppNotifications: boolean;
    emailDigestFrequency: 'Immediate' | 'Daily' | 'Weekly' | 'Never';
}

export interface ExecutionStep {
    id: string;
    nodeId: string;
    nodeName?: string;
    nodeType?: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    output?: unknown;
    errorMessage?: string;
}

export interface ExecutionLog {
    id: string;
    timestamp: string;
    level: string;
    message: string;
    data?: string;
}

export interface WorkflowExecutionDetail {
    id: string;
    workflowId: string;
    workflowName: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    triggeredBy: string;
    formSubmissionId?: string;
    executionSteps: ExecutionStep[];
    logs: ExecutionLog[];
    context: Record<string, unknown>;
}
