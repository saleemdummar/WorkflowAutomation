export interface Form {
    id: string;
    name: string;
    description: string;
    definition: string;
    layout: string;
    version: number;
    status: string;
    isPublished: boolean;
    isActive?: boolean;
    isArchived?: boolean;
    archivedAt?: string;
    archiveReason?: string;
    expirationDate?: string;
    categoryId?: string;
    categoryName?: string;
    createdBy?: string;
    createdDate: string;
    lastModifiedAt?: string;
}

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    /** Primary definition field – prefer over workflowDefinition */
    definition: string;
    /** @deprecated Backend alias – use `definition` for new code */
    workflowDefinition?: string;
    version: number;
    isActive: boolean;
    isPublished?: boolean;
    /** Primary created timestamp */
    createdDate: string;
    /** @deprecated Backend alias – use `createdDate` for new code */
    createdAt?: string;
    updatedAt?: string;
    formId?: string;
}

export interface ApprovalTask {
    id: string;
    workflowInstanceId: string;
    assignedTo: string;
    status: string;
    dueDate?: string;
    createdDate: string;
    taskName?: string;
    description?: string;
    priority?: string;
    /** @deprecated Use `dueDate` */
    deadline?: string;
    workflowName?: string;
    /** @deprecated Use `createdDate` */
    assignedDate?: string;
    /** @deprecated Use `completedAt` */
    completedDate?: string;
    completedAt?: string;
    approverName?: string;
    formData?: string;
    approvalHistory?: Array<{ decision: string; decidedBy: string; decidedAt: string; comments?: string }>;
    formId?: string;
    formName?: string;
    workflowId?: string;
    submissionId?: string;
    submittedBy?: string;
    submittedAt?: string;
    isOverdue?: boolean;
    comments?: string;
    submissionData?: Array<{ fieldId: string; fieldName: string; fieldLabel: string; value: string }>;
}

export interface FormVersion {
    id: string;
    formId: string;
    versionNumber: number;
    formDefinitionJson: string;
    formLayoutJson: string;
    changeDescription: string;
    createdBy: string;
    createdAt: string;
}

// ---------- Additional entity types ----------

export interface Notification {
    id: string;
    userId?: string;
    title?: string;
    subject?: string;
    message: string;
    type?: string;
    notificationType?: string;
    isRead: boolean;
    createdAt: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
}

export interface FormCategory {
    id: string;
    categoryName: string;
    description?: string;
    parentCategoryId?: string;
    parentCategoryName?: string;
    displayOrder: number;
    formCount: number;
    formsCount?: number;
    createdDate?: string;
    subCategories?: FormCategory[];
}

export interface FormTemplate {
    id: string;
    name: string;
    category: string;
    isPublic: boolean;
    formDefinition: string;
    formLayout?: string;
    createdBy?: string;
    createdDate: string;
}

export interface SystemSetting {
    id: string;
    settingKey: string;
    settingValue: string;
    settingType: string;
    description?: string;
    category: string;
    isEditable: boolean;
    updatedBy?: string;
    updatedAt?: string;
}

export interface EscalationRule {
    id: string;
    workflowId: string;
    workflowName?: string;
    escalationHours: number;
    escalateToUserId?: string;
    escalateToRoleId?: string;
    escalateToGroupId?: string;
    escalateToManager: boolean;
    maxEscalationLevels: number;
    sendReminder: boolean;
    sendEmailNotification?: boolean;
    sendInAppNotification?: boolean;
    autoApprove: boolean;
    autoReject: boolean;
    isActive: boolean;
    escalationMessageTemplate?: string;
    reassignOnEscalation?: boolean;
    createdAt?: string;
}

export interface AuditLog {
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
    userAgent?: string;
    additionalInfo?: string;
    timestamp: string;
}

export interface FormPermission {
    id: string;
    formId: string;
    userId?: string;
    userName?: string;
    roleName?: string;
    permissionLevel: string;
    grantedBy?: string;
    grantedAt?: string;
}

export interface FormSubmission {
    id: string;
    formId: string;
    formName?: string;
    submittedBy: string;
    submitterName?: string;
    submissionData: string;
    status: string;
    submittedAt?: string;
    createdDate?: string;
    lastModifiedAt?: string;
}

export interface DraftSummary {
    id: string;
    formId: string;
    formName: string;
    draftSavedAt?: string;
    submissionData?: string;
}

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    workflowName: string;
    submissionId?: string;
    instanceStatus?: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    currentNodeId?: string;
    currentStep?: string;
    errorMessage?: string;
    triggeredBy: string;
    totalSteps: number;
    completedSteps: number;
    formSubmissionId?: string;
}

export interface WorkflowExecutionInfo {
    instanceId: string;
    workflowId: string;
    workflowName: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    currentNodeName?: string;
    errorMessage?: string;
}

export interface UserProfile {
    id: string;
    userId: string;
    displayName: string;
    email: string;
    department?: string;
    jobTitle?: string;
    roles: string[];
}

export interface AdminUser {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    enabled: boolean;
    realmRoles: string[];
    createdTimestamp: number;
}

export interface PerformanceMetrics {
    system: {
        uptime: number;
        memoryUsageMB: number;
        threadCount: number;
        cpuTimeMs: number;
    };
    database: {
        formCount: number;
        workflowCount: number;
        submissionCount: number;
        activeInstances: number;
        pendingApprovals: number;
        unreadNotifications: number;
        userCount: number;
    };
    activity: {
        submissionsLast24h: number;
        workflowRunsLast24h: number;
        avgWorkflowExecutionMs: number;
        workflowSuccessRate: number;
    };
}

export interface FormLifecycleStatus {
    formId: string;
    formName: string;
    isArchived: boolean;
    archivedAt?: string;
    archivedBy?: string;
    archivedByName?: string;
    archiveReason?: string;
    expirationDate?: string;
    expirationReason?: string;
    publishDate?: string;
    unpublishDate?: string;
    scheduleReason?: string;
    isPublished: boolean;
    isExpired: boolean;
}
