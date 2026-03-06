'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionsApi } from '@/lib/api';
import { queryKeys } from './queryKeys';

// ── Queries ──

export function useSubmissions() {
    return useQuery({
        queryKey: queryKeys.submissions.list,
        queryFn: () => submissionsApi.getAll(),
    });
}

export function useSubmission(id: string) {
    return useQuery({
        queryKey: queryKeys.submissions.detail(id),
        queryFn: () => submissionsApi.getById(id),
        enabled: !!id,
    });
}

export function useSubmissionsByForm(formId: string) {
    return useQuery({
        queryKey: queryKeys.submissions.byForm(formId),
        queryFn: () => submissionsApi.getByForm(formId),
        enabled: !!formId,
    });
}

export function useMySubmissions() {
    return useQuery({
        queryKey: queryKeys.submissions.mine,
        queryFn: () => submissionsApi.getMySubmissions(),
    });
}

export function useAllDrafts() {
    return useQuery({
        queryKey: queryKeys.submissions.drafts.all,
        queryFn: () => submissionsApi.getAllDrafts(),
    });
}

export function useDraftsByForm(formId: string) {
    return useQuery({
        queryKey: queryKeys.submissions.drafts.byForm(formId),
        queryFn: () => submissionsApi.getDrafts(formId),
        enabled: !!formId,
    });
}

export function useDraft(formId: string, draftId: string) {
    return useQuery({
        queryKey: queryKeys.submissions.drafts.detail(formId, draftId),
        queryFn: () => submissionsApi.getDraft(formId, draftId),
        enabled: !!formId && !!draftId,
    });
}

// ── Mutations ──

export function useSubmitForm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ formId, data }: { formId: string; data: Parameters<typeof submissionsApi.submit>[1] }) =>
            submissionsApi.submit(formId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all });
        },
    });
}

export function useSaveDraft() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ formId, data }: { formId: string; data: Parameters<typeof submissionsApi.saveDraft>[1] }) =>
            submissionsApi.saveDraft(formId, data),
        onSuccess: (_data, { formId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.submissions.drafts.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.submissions.drafts.byForm(formId) });
        },
    });
}

export function useDeleteDraft() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ formId, draftId }: { formId: string; draftId: string }) =>
            submissionsApi.deleteDraft(formId, draftId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.submissions.drafts.all });
        },
    });
}

export function useSubmitDraft() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ formId, draftId }: { formId: string; draftId: string }) =>
            submissionsApi.submitDraft(formId, draftId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.submissions.drafts.all });
        },
    });
}
