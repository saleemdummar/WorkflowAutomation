'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsApi, workflowVersionsApi } from '@/lib/api';
import { queryKeys } from './queryKeys';

// ── Queries ──

export function useWorkflowsList() {
    return useQuery({
        queryKey: queryKeys.workflows.list,
        queryFn: () => workflowsApi.getAll(),
    });
}

export function useWorkflow(id: string) {
    return useQuery({
        queryKey: queryKeys.workflows.detail(id),
        queryFn: () => workflowsApi.getById(id),
        enabled: !!id,
    });
}

export function useWorkflowExecutions() {
    return useQuery({
        queryKey: queryKeys.workflows.executions,
        queryFn: () => workflowsApi.getExecutions(),
    });
}

export function useWorkflowExecutionDetail(id: string) {
    return useQuery({
        queryKey: queryKeys.workflows.executionDetail(id),
        queryFn: () => workflowsApi.getExecutionDetail(id),
        enabled: !!id,
    });
}

export function useWorkflowAnalytics() {
    return useQuery({
        queryKey: queryKeys.workflows.analytics,
        queryFn: () => workflowsApi.getAnalytics(),
    });
}

export function useWorkflowVersions(workflowId: string) {
    return useQuery({
        queryKey: queryKeys.workflows.versions(workflowId),
        queryFn: () => workflowVersionsApi.getVersions(workflowId),
        enabled: !!workflowId,
    });
}

// ── Mutations ──

export function useCreateWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: workflowsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
        },
    });
}

export function useUpdateWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof workflowsApi.update>[1] }) =>
            workflowsApi.update(id, data),
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.workflows.detail(id) });
        },
    });
}

export function useDeleteWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: workflowsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
        },
    });
}

export function useCloneWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: workflowsApi.clone,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
        },
    });
}

export function useTestWorkflow() {
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data?: { testData?: Record<string, unknown>; simulateApproval?: string } }) =>
            workflowsApi.testWorkflow(id, data),
    });
}

export function useRetryExecution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: workflowsApi.retryExecution,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.workflows.executions });
        },
    });
}

export function useCancelExecution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: workflowsApi.cancelExecution,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.workflows.executions });
        },
    });
}

export function useImportWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: workflowsApi.importWorkflow,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
        },
    });
}
