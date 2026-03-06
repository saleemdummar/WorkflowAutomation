'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { queryKeys } from './queryKeys';

// ── Queries ──

export function useNotifications() {
    return useQuery({
        queryKey: queryKeys.notifications.list,
        queryFn: () => notificationsApi.getMyNotifications(),
    });
}

export function useNotificationPreferences() {
    return useQuery({
        queryKey: queryKeys.notifications.preferences,
        queryFn: () => notificationsApi.getPreferences(),
    });
}

// ── Mutations ──

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: notificationsApi.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: notificationsApi.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });
}

export function useDeleteNotification() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: notificationsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });
}

export function useClearAllNotifications() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: notificationsApi.clearAll,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });
}

export function useUpdateNotificationPreferences() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: notificationsApi.updatePreferences,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences });
        },
    });
}
