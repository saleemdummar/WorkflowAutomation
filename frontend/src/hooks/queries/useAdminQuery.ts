'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    usersAdminApi,
    rolesAdminApi,
    categoriesApi,
    templatesApi,
    systemSettingsApi,
    escalationApi,
    auditLogsApi,
    performanceApi,
    userProfileApi,
} from '@/lib/api';
import { queryKeys } from './queryKeys';

// ── Users ──

export function useAdminUsers(params?: { first?: number; max?: number; search?: string }) {
    return useQuery({
        queryKey: queryKeys.admin.users.list(params),
        queryFn: () => usersAdminApi.getAll(params),
    });
}

export function useAdminUser(id: string) {
    return useQuery({
        queryKey: queryKeys.admin.users.detail(id),
        queryFn: () => usersAdminApi.getById(id),
        enabled: !!id,
    });
}

export function useAdminUserRoles(userId: string) {
    return useQuery({
        queryKey: queryKeys.admin.users.roles(userId),
        queryFn: () => usersAdminApi.getRoles(userId),
        enabled: !!userId,
    });
}

export function useRoles() {
    return useQuery({
        queryKey: queryKeys.admin.roles,
        queryFn: () => rolesAdminApi.getAll(),
    });
}

// ── Categories ──

export function useCategories() {
    return useQuery({
        queryKey: queryKeys.admin.categories.all,
        queryFn: () => categoriesApi.getAll(),
    });
}

export function useCategory(id: string) {
    return useQuery({
        queryKey: queryKeys.admin.categories.detail(id),
        queryFn: () => categoriesApi.getById(id),
        enabled: !!id,
    });
}

export function useRootCategories() {
    return useQuery({
        queryKey: queryKeys.admin.categories.root,
        queryFn: () => categoriesApi.getRoot(),
    });
}

export function useSubCategories(parentId: string) {
    return useQuery({
        queryKey: queryKeys.admin.categories.sub(parentId),
        queryFn: () => categoriesApi.getSubCategories(parentId),
        enabled: !!parentId,
    });
}

// ── Templates ──

export function useTemplates() {
    return useQuery({
        queryKey: queryKeys.admin.templates.all,
        queryFn: () => templatesApi.getAll(),
    });
}

export function useTemplate(id: string) {
    return useQuery({
        queryKey: queryKeys.admin.templates.detail(id),
        queryFn: () => templatesApi.getById(id),
        enabled: !!id,
    });
}

export function usePublicTemplates() {
    return useQuery({
        queryKey: queryKeys.admin.templates.public,
        queryFn: () => templatesApi.getPublic(),
    });
}

// ── System Settings ──

export function useSystemSettings() {
    return useQuery({
        queryKey: queryKeys.admin.settings.all,
        queryFn: () => systemSettingsApi.getAll(),
    });
}

export function useSystemSettingByKey(key: string) {
    return useQuery({
        queryKey: queryKeys.admin.settings.byKey(key),
        queryFn: () => systemSettingsApi.getByKey(key),
        enabled: !!key,
    });
}

export function useSystemMetrics() {
    return useQuery({
        queryKey: queryKeys.admin.settings.metrics,
        queryFn: () => systemSettingsApi.getMetrics(),
    });
}

export function useUpdateSystemSetting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ key, data }: { key: string; data: Parameters<typeof systemSettingsApi.update>[1] }) =>
            systemSettingsApi.update(key, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings.all });
        },
    });
}

export function useCreateSystemSetting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: systemSettingsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings.all });
        },
    });
}

export function useDeleteSystemSetting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: systemSettingsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings.all });
        },
    });
}

export function useSeedSystemDefaults() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: systemSettingsApi.seedDefaults,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings.all });
        },
    });
}

// ── Escalation Rules ──

export function useEscalationRules() {
    return useQuery({
        queryKey: queryKeys.admin.escalation.all,
        queryFn: () => escalationApi.getAll(),
    });
}

export function useEscalationRule(id: string) {
    return useQuery({
        queryKey: queryKeys.admin.escalation.detail(id),
        queryFn: () => escalationApi.getById(id),
        enabled: !!id,
    });
}

export function useEscalationRulesByWorkflow(workflowId: string) {
    return useQuery({
        queryKey: queryKeys.admin.escalation.byWorkflow(workflowId),
        queryFn: () => escalationApi.getByWorkflow(workflowId),
        enabled: !!workflowId,
    });
}

// ── Audit Logs ──

export function useAuditLogs(params?: Parameters<typeof auditLogsApi.getLogs>[0]) {
    return useQuery({
        queryKey: [...queryKeys.admin.auditLogs.all, params] as const,
        queryFn: () => auditLogsApi.getLogs(params),
    });
}

export function useAuditLog(id: string) {
    return useQuery({
        queryKey: queryKeys.admin.auditLogs.detail(id),
        queryFn: () => auditLogsApi.getById(id),
        enabled: !!id,
    });
}

export function useAuditLogEntityTypes() {
    return useQuery({
        queryKey: queryKeys.admin.auditLogs.entityTypes,
        queryFn: () => auditLogsApi.getEntityTypes(),
    });
}

export function useAuditLogActions() {
    return useQuery({
        queryKey: queryKeys.admin.auditLogs.actions,
        queryFn: () => auditLogsApi.getActions(),
    });
}

// ── Performance ──

export function usePerformanceMetrics() {
    return useQuery({
        queryKey: queryKeys.admin.performance,
        queryFn: () => performanceApi.getMetrics(),
        staleTime: 30 * 1000, // Refresh performance metrics more often
    });
}

// ── User Profile ──

export function useMyProfile() {
    return useQuery({
        queryKey: queryKeys.userProfile.me,
        queryFn: () => userProfileApi.getMe(),
    });
}

export function useUserSearch(query: string) {
    return useQuery({
        queryKey: queryKeys.userProfile.search(query),
        queryFn: () => userProfileApi.search(query),
        enabled: query.length >= 2,
    });
}

// ── Admin Mutations ──

export function useCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersAdminApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof usersAdminApi.update>[1] }) =>
            usersAdminApi.update(id, data),
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.detail(id) });
        },
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: categoriesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories.all });
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof categoriesApi.update>[1] }) =>
            categoriesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories.all });
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: categoriesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories.all });
        },
    });
}

export function useCreateTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: templatesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.templates.all });
        },
    });
}

export function useDeleteTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: templatesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.templates.all });
        },
    });
}

export function useCreateEscalationRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: escalationApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.escalation.all });
        },
    });
}

export function useUpdateEscalationRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof escalationApi.update>[1] }) =>
            escalationApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.escalation.all });
        },
    });
}

export function useDeleteEscalationRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: escalationApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.escalation.all });
        },
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: userProfileApi.updateMe,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.userProfile.me });
        },
    });
}

export function useEnableUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersAdminApi.enable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
        },
    });
}

export function useDisableUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersAdminApi.disable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
        },
    });
}

export function useAssignRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
            usersAdminApi.assignRole(userId, roleName),
        onSuccess: (_data, { userId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.roles(userId) });
        },
    });
}

export function useRemoveRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
            usersAdminApi.removeRole(userId, roleName),
        onSuccess: (_data, { userId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.roles(userId) });
        },
    });
}

export function useResetPassword() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, password, temporary }: { userId: string; password: string; temporary: boolean }) =>
            usersAdminApi.resetPassword(userId, password, temporary),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
        },
    });
}
