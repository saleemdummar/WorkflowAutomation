import { apiClient } from './client';
import type {
    FormCategory,
    FormTemplate,
    SystemSetting,
    EscalationRule,
    FormPermission,
    PerformanceMetrics,
    AuditLog,
    UserProfile,
    AdminUser,
    Form,
} from '../../types/entities';
import type {
    CrossFieldValidationRule,
    ValidationResult,
    ExpressionResult,
    AuditLogPage,
    SystemMetrics,
} from './types';

// ---------- Categories API ----------

export const categoriesApi = {
    getAll: async (): Promise<FormCategory[]> => {
        const response = await apiClient.get<FormCategory[]>('FormCategories');
        return response.data;
    },
    getById: async (id: string): Promise<FormCategory> => {
        const response = await apiClient.get<FormCategory>(`FormCategories/${id}`);
        return response.data;
    },
    getRoot: async (): Promise<FormCategory[]> => {
        const response = await apiClient.get<FormCategory[]>('FormCategories/root');
        return response.data;
    },
    getSubCategories: async (parentId: string): Promise<FormCategory[]> => {
        const response = await apiClient.get<FormCategory[]>(`FormCategories/${parentId}/subcategories`);
        return response.data;
    },
    create: async (data: { categoryName: string; parentCategoryId?: string; description?: string; displayOrder: number }): Promise<FormCategory> => {
        const response = await apiClient.post<FormCategory>('FormCategories', data);
        return response.data;
    },
    update: async (id: string, data: { categoryName: string; parentCategoryId?: string; description?: string; displayOrder: number }): Promise<FormCategory> => {
        const response = await apiClient.put<FormCategory>(`FormCategories/${id}`, data);
        return response.data;
    },
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`FormCategories/${id}`);
    },
    reorder: async (data: { categoryId: string; newDisplayOrder: number }[]): Promise<void> => {
        await apiClient.post('FormCategories/reorder', data);
    },
};

// ---------- Templates API ----------

export const templatesApi = {
    getAll: async (): Promise<FormTemplate[]> => {
        const response = await apiClient.get<FormTemplate[]>('FormTemplates');
        return response.data;
    },
    getById: async (id: string): Promise<FormTemplate> => {
        const response = await apiClient.get<FormTemplate>(`FormTemplates/${id}`);
        return response.data;
    },
    getPublic: async (): Promise<FormTemplate[]> => {
        const response = await apiClient.get<FormTemplate[]>('FormTemplates/public');
        return response.data;
    },
    getByCategory: async (category: string): Promise<FormTemplate[]> => {
        const response = await apiClient.get<FormTemplate[]>(`FormTemplates/category/${category}`);
        return response.data;
    },
    create: async (data: { name: string; category: string; isPublic: boolean; formDefinition: string; formLayout?: string }): Promise<FormTemplate> => {
        const response = await apiClient.post<FormTemplate>('FormTemplates', data);
        return response.data;
    },
    update: async (id: string, data: { name: string; category: string; isPublic: boolean; formDefinition: string; formLayout?: string }): Promise<FormTemplate> => {
        const response = await apiClient.put<FormTemplate>(`FormTemplates/${id}`, data);
        return response.data;
    },
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`FormTemplates/${id}`);
    },
    createFormFromTemplate: async (id: string, data: { formName: string; description: string }): Promise<Form> => {
        const response = await apiClient.post<Form>(`FormTemplates/${id}/create-form`, data);
        return response.data;
    },
};

// ---------- System Settings API ----------

export const systemSettingsApi = {
    getAll: async (): Promise<SystemSetting[]> => {
        const response = await apiClient.get<SystemSetting[]>('SystemSettings');
        return response.data;
    },
    getByKey: async (key: string): Promise<SystemSetting> => {
        const response = await apiClient.get<SystemSetting>(`SystemSettings/${key}`);
        return response.data;
    },
    getByCategory: async (category: string): Promise<SystemSetting[]> => {
        const response = await apiClient.get<SystemSetting[]>(`SystemSettings/category/${category}`);
        return response.data;
    },
    create: async (data: { settingKey: string; settingValue: string; settingType: string; category: string; isEditable: boolean }): Promise<SystemSetting> => {
        const response = await apiClient.post<SystemSetting>('SystemSettings', data);
        return response.data;
    },
    update: async (key: string, data: { settingValue: string }): Promise<SystemSetting> => {
        const response = await apiClient.put<SystemSetting>(`SystemSettings/${key}`, data);
        return response.data;
    },
    delete: async (key: string): Promise<void> => {
        await apiClient.delete(`SystemSettings/${key}`);
    },
    getMetrics: async (): Promise<SystemMetrics> => {
        const response = await apiClient.get<SystemMetrics>('SystemSettings/metrics');
        return response.data;
    },
    seedDefaults: async (): Promise<void> => {
        await apiClient.post('SystemSettings/seed-defaults');
    },
};

// ---------- Escalation API ----------

export const escalationApi = {
    getAll: async (): Promise<EscalationRule[]> => {
        const response = await apiClient.get<EscalationRule[]>('approval-escalation');
        return response.data;
    },
    getById: async (id: string): Promise<EscalationRule> => {
        const response = await apiClient.get<EscalationRule>(`approval-escalation/${id}`);
        return response.data;
    },
    getByWorkflow: async (workflowId: string): Promise<EscalationRule[]> => {
        const response = await apiClient.get<EscalationRule[]>(`approval-escalation/workflow/${workflowId}`);
        return response.data;
    },
    create: async (data: { workflowId?: string; escalationHours: number; escalateToUserId?: string; escalateToRoleId?: string; escalateToGroupId?: string; escalateToManager?: boolean; maxEscalationLevels?: number; escalationMessageTemplate?: string; reassignOnEscalation?: boolean; sendReminder: boolean; sendEmailNotification?: boolean; sendInAppNotification?: boolean; autoApprove: boolean; autoReject: boolean; isActive: boolean }): Promise<EscalationRule> => {
        const response = await apiClient.post<EscalationRule>('approval-escalation', data);
        return response.data;
    },
    update: async (id: string, data: { escalationHours: number; escalateToUserId?: string; escalateToRoleId?: string; escalateToGroupId?: string; escalateToManager?: boolean; maxEscalationLevels?: number; escalationMessageTemplate?: string; reassignOnEscalation?: boolean; sendReminder: boolean; sendEmailNotification?: boolean; sendInAppNotification?: boolean; autoApprove: boolean; autoReject: boolean; isActive: boolean }): Promise<EscalationRule> => {
        const response = await apiClient.put<EscalationRule>(`approval-escalation/${id}`, data);
        return response.data;
    },
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`approval-escalation/${id}`);
    },
    testRule: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.post<{ success: boolean; message: string }>(`approval-escalation/${id}/test`);
        return response.data;
    },
};

// ---------- Form Permissions API ----------

export const formPermissionsApi = {
    getPermissions: async (formId: string): Promise<FormPermission[]> => {
        const response = await apiClient.get<FormPermission[]>(`forms/${formId}/permissions`);
        return response.data;
    },
    addPermission: async (formId: string, data: { userId?: string; roleName?: string; permissionLevel?: string }): Promise<FormPermission> => {
        const response = await apiClient.post<FormPermission>(`forms/${formId}/permissions`, data);
        return response.data;
    },
    updatePermission: async (formId: string, permissionId: string, data: { permissionLevel?: string }): Promise<FormPermission> => {
        const response = await apiClient.put<FormPermission>(`forms/${formId}/permissions/${permissionId}`, data);
        return response.data;
    },
    removePermission: async (formId: string, permissionId: string): Promise<void> => {
        await apiClient.delete(`forms/${formId}/permissions/${permissionId}`);
    },
};

// ---------- Cross-Field Validation API ----------

export const crossFieldValidationApi = {
    getByForm: async (formId: string): Promise<CrossFieldValidationRule[]> => {
        const response = await apiClient.get<CrossFieldValidationRule[]>(`crossfieldvalidation/form/${formId}`);
        return response.data;
    },
    getById: async (ruleId: string): Promise<CrossFieldValidationRule> => {
        const response = await apiClient.get<CrossFieldValidationRule>(`crossfieldvalidation/${ruleId}`);
        return response.data;
    },
    create: async (data: { formId: string; ruleName: string; validationType: string; ruleConfiguration: string; errorMessage: string; executionOrder: number }): Promise<CrossFieldValidationRule> => {
        const response = await apiClient.post<CrossFieldValidationRule>('crossfieldvalidation', data);
        return response.data;
    },
    update: async (ruleId: string, data: { ruleName: string; validationType: string; ruleConfiguration: string; errorMessage: string; executionOrder: number }): Promise<CrossFieldValidationRule> => {
        const response = await apiClient.put<CrossFieldValidationRule>(`crossfieldvalidation/${ruleId}`, data);
        return response.data;
    },
    delete: async (ruleId: string): Promise<void> => {
        await apiClient.delete(`crossfieldvalidation/${ruleId}`);
    },
    validate: async (formId: string, fieldValues: Record<string, unknown>): Promise<ValidationResult> => {
        const response = await apiClient.post<ValidationResult>(`crossfieldvalidation/validate/form/${formId}`, fieldValues);
        return response.data;
    },
};

// ---------- Expression API ----------

export const expressionApi = {
    evaluate: async (expression: string, variables: Record<string, unknown>): Promise<ExpressionResult> => {
        const response = await apiClient.post<ExpressionResult>('expression/evaluate', { expression, variables });
        return response.data;
    },
};

// ---------- Performance API ----------

export const performanceApi = {
    getMetrics: async (): Promise<PerformanceMetrics> => {
        const response = await apiClient.get<PerformanceMetrics>('Performance/metrics');
        return response.data;
    },
};

// ---------- Audit Logs API ----------

export const auditLogsApi = {
    getLogs: async (params?: { page?: number; pageSize?: number; entityType?: string; action?: string; userId?: string; fromDate?: string; toDate?: string; search?: string }): Promise<AuditLogPage> => {
        const response = await apiClient.get<AuditLogPage>('AuditLogs', { params });
        return response.data;
    },
    getById: async (id: string): Promise<AuditLog> => {
        const response = await apiClient.get<AuditLog>(`AuditLogs/${id}`);
        return response.data;
    },
    getEntityTypes: async (): Promise<string[]> => {
        const response = await apiClient.get<string[]>('AuditLogs/entity-types');
        return response.data;
    },
    getActions: async (): Promise<string[]> => {
        const response = await apiClient.get<string[]>('AuditLogs/actions');
        return response.data;
    },
};

// ---------- User Profile API ----------

export const userProfileApi = {
    getMe: async (): Promise<UserProfile> => {
        const response = await apiClient.get<UserProfile>('user-profile/me');
        return response.data;
    },
    updateMe: async (data: { department?: string; jobTitle?: string }): Promise<UserProfile> => {
        const response = await apiClient.put<UserProfile>('user-profile/me', data);
        return response.data;
    },
    search: async (query: string): Promise<UserProfile[]> => {
        const response = await apiClient.get<UserProfile[]>(`user-profile/search?q=${encodeURIComponent(query)}`);
        return response.data;
    },
};

// ---------- Admin: Users API ----------

export const usersAdminApi = {
    getAll: async (params?: { first?: number; max?: number; search?: string }): Promise<AdminUser[]> => {
        const response = await apiClient.get<AdminUser[]>('admin/users', { params });
        return response.data;
    },
    getById: async (id: string): Promise<AdminUser> => {
        const response = await apiClient.get<AdminUser>(`admin/users/${id}`);
        return response.data;
    },
    create: async (data: { username: string; email: string; firstName: string; lastName: string; password: string; roles?: string[] }): Promise<AdminUser> => {
        const response = await apiClient.post<AdminUser>('admin/users', data);
        return response.data;
    },
    update: async (id: string, data: { firstName?: string; lastName?: string; email?: string; enabled?: boolean }): Promise<AdminUser> => {
        const response = await apiClient.put<AdminUser>(`admin/users/${id}`, data);
        return response.data;
    },
    enable: async (id: string): Promise<void> => {
        await apiClient.post(`admin/users/${id}/enable`);
    },
    disable: async (id: string): Promise<void> => {
        await apiClient.post(`admin/users/${id}/disable`);
    },
    getRoles: async (id: string): Promise<string[]> => {
        const response = await apiClient.get<string[]>(`admin/users/${id}/roles`);
        return response.data;
    },
    assignRole: async (id: string, roleName: string): Promise<void> => {
        await apiClient.post(`admin/users/${id}/roles`, { roleName });
    },
    removeRole: async (id: string, roleName: string): Promise<void> => {
        await apiClient.delete(`admin/users/${id}/roles/${roleName}`);
    },
    resetPassword: async (id: string, password: string, temporary: boolean): Promise<void> => {
        await apiClient.post(`admin/users/${id}/reset-password`, { password, temporary });
    },
};

// ---------- Admin: Roles API ----------

interface RoleDto {
    id: string;
    name: string;
    description?: string;
    composite: boolean;
    clientRole: boolean;
}

export const rolesAdminApi = {
    getAll: async (): Promise<RoleDto[]> => {
        const response = await apiClient.get<RoleDto[]>('admin/roles');
        return response.data;
    },
};
