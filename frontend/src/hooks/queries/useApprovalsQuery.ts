'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalsApi } from '@/lib/api';
import { queryKeys } from './queryKeys';

// ── Queries ──

export function useApprovals(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.approvals.list,
        queryFn: () => approvalsApi.getAll(),
        enabled,
    });
}

export function useMyApprovalTasks(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.approvals.myTasks,
        queryFn: () => approvalsApi.getMyTasks(),
        enabled,
    });
}

export function useApprovalTask(id: string) {
    return useQuery({
        queryKey: queryKeys.approvals.detail(id),
        queryFn: () => approvalsApi.getTaskById(id),
        enabled: !!id,
    });
}

export function useApprovalHistory(id: string) {
    return useQuery({
        queryKey: queryKeys.approvals.history(id),
        queryFn: () => approvalsApi.getHistory(id),
        enabled: !!id,
    });
}

// ── Mutations ──

export function useApproveTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { approved: boolean; comments?: string } }) =>
            approvalsApi.approveTask(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
        },
    });
}

export function useTakeApprovalAction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { action: 'approve' | 'reject' | 'return'; comments?: string } }) =>
            approvalsApi.takeAction(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
        },
    });
}
