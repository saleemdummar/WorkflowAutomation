'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi, formPermissionsApi, crossFieldValidationApi } from '@/lib/api';
import { queryKeys } from './queryKeys';

// ── Queries ──

export function useForms(categoryId?: string) {
    return useQuery({
        queryKey: queryKeys.forms.list(categoryId),
        queryFn: () => formsApi.getAll(categoryId),
    });
}

export function useForm(id: string) {
    return useQuery({
        queryKey: queryKeys.forms.detail(id),
        queryFn: () => formsApi.getById(id),
        enabled: !!id,
    });
}

export function useFormVersions(formId: string) {
    return useQuery({
        queryKey: queryKeys.forms.versions(formId),
        queryFn: () => formsApi.getVersions(formId),
        enabled: !!formId,
    });
}

export function useFormFields(formId: string) {
    return useQuery({
        queryKey: queryKeys.forms.fields(formId),
        queryFn: () => formsApi.getFields(formId),
        enabled: !!formId,
    });
}

export function useFormLifecycle(formId: string) {
    return useQuery({
        queryKey: queryKeys.forms.lifecycle(formId),
        queryFn: () => formsApi.getLifecycleStatus(formId),
        enabled: !!formId,
    });
}

export function useArchivedForms() {
    return useQuery({
        queryKey: queryKeys.forms.archived,
        queryFn: () => formsApi.getArchived(),
    });
}

export function useExpiredForms() {
    return useQuery({
        queryKey: queryKeys.forms.expired,
        queryFn: () => formsApi.getExpired(),
    });
}

export function useFormSearch(query: string) {
    return useQuery({
        queryKey: queryKeys.forms.search(query),
        queryFn: () => formsApi.search(query),
        enabled: query.length > 0,
    });
}

export function useFormPermissions(formId: string) {
    return useQuery({
        queryKey: queryKeys.forms.permissions(formId),
        queryFn: () => formPermissionsApi.getPermissions(formId),
        enabled: !!formId,
    });
}

export function useCrossFieldValidation(formId: string) {
    return useQuery({
        queryKey: queryKeys.forms.crossFieldValidation(formId),
        queryFn: () => crossFieldValidationApi.getByForm(formId),
        enabled: !!formId,
    });
}

// ── Form Permissions Mutations ──

export function useAddFormPermission() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ formId, data }: { formId: string; data: Parameters<typeof formPermissionsApi.addPermission>[1] }) =>
            formPermissionsApi.addPermission(formId, data),
        onSuccess: (_data, { formId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.permissions(formId) });
        },
    });
}

export function useUpdateFormPermission() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ formId, permissionId, data }: { formId: string; permissionId: string; data: Parameters<typeof formPermissionsApi.updatePermission>[2] }) =>
            formPermissionsApi.updatePermission(formId, permissionId, data),
        onSuccess: (_data, { formId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.permissions(formId) });
        },
    });
}

export function useRemoveFormPermission() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ formId, permissionId }: { formId: string; permissionId: string }) =>
            formPermissionsApi.removePermission(formId, permissionId),
        onSuccess: (_data, { formId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.permissions(formId) });
        },
    });
}

// ── Mutations ──

export function useCreateForm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: formsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.archived });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.expired });
        },
    });
}

export function useUpdateForm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof formsApi.update>[1] }) =>
            formsApi.update(id, data),
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.detail(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.fields(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.lifecycle(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.versions(id) });
        },
    });
}

export function useDeleteForm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: formsApi.delete,
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.detail(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.lifecycle(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.archived });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.expired });
        },
    });
}

export function usePublishForm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: formsApi.publish,
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.detail(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.lifecycle(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.expired });
        },
    });
}

export function useUnpublishForm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: formsApi.unpublish,
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.detail(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.lifecycle(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.expired });
        },
    });
}

export function useArchiveForm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ formId, data }: { formId: string; data?: { archiveReason?: string } }) =>
            formsApi.archive(formId, data),
        onSuccess: (_data, { formId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.detail(formId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.lifecycle(formId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.archived });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.expired });
        },
    });
}

export function useRestoreForm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ formId, data }: { formId: string; data?: { restoreReason?: string } }) =>
            formsApi.restore(formId, data),
        onSuccess: (_data, { formId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.detail(formId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.lifecycle(formId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.archived });
            queryClient.invalidateQueries({ queryKey: queryKeys.forms.expired });
        },
    });
}
