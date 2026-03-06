import { apiClient } from './client';
import type { NotificationPreferences } from './types';
import type { Notification } from '../../types/entities';

interface NotificationPreferencesApiDto {
    realtimeEnabled?: boolean;
    emailEnabled?: boolean;
    digestEnabled?: boolean;
    inAppNotifications?: boolean;
    emailOnWorkflowStart?: boolean;
    emailOnWorkflowComplete?: boolean;
    emailOnWorkflowFail?: boolean;
    emailOnApprovalNeeded?: boolean;
    emailOnApprovalDecision?: boolean;
    emailOnFormSubmission?: boolean;
    emailDigestFrequency?: 'Immediate' | 'Daily' | 'Weekly' | 'Never';
}

const defaultNotificationPreferences: NotificationPreferences = {
    emailOnWorkflowStart: true,
    emailOnWorkflowComplete: true,
    emailOnWorkflowFail: true,
    emailOnApprovalNeeded: true,
    emailOnApprovalDecision: true,
    emailOnFormSubmission: false,
    inAppNotifications: true,
    emailDigestFrequency: 'Immediate',
};

function toNotificationPreferences(dto: NotificationPreferencesApiDto | null | undefined): NotificationPreferences {
    if (!dto) {
        return defaultNotificationPreferences;
    }

    const emailDefault = dto.emailEnabled ?? true;
    const inApp = dto.inAppNotifications ?? dto.realtimeEnabled ?? true;
    const digest = dto.emailDigestFrequency
        ?? (dto.digestEnabled === false ? 'Never' : 'Daily');

    return {
        emailOnWorkflowStart: dto.emailOnWorkflowStart ?? emailDefault,
        emailOnWorkflowComplete: dto.emailOnWorkflowComplete ?? emailDefault,
        emailOnWorkflowFail: dto.emailOnWorkflowFail ?? emailDefault,
        emailOnApprovalNeeded: dto.emailOnApprovalNeeded ?? emailDefault,
        emailOnApprovalDecision: dto.emailOnApprovalDecision ?? emailDefault,
        emailOnFormSubmission: dto.emailOnFormSubmission ?? false,
        inAppNotifications: inApp,
        emailDigestFrequency: digest,
    };
}

function toNotificationPreferencesApiDto(preferences: NotificationPreferences): NotificationPreferencesApiDto {
    const emailEnabled =
        preferences.emailOnWorkflowStart
        || preferences.emailOnWorkflowComplete
        || preferences.emailOnWorkflowFail
        || preferences.emailOnApprovalNeeded
        || preferences.emailOnApprovalDecision
        || preferences.emailOnFormSubmission;

    const digestEnabled = preferences.emailDigestFrequency !== 'Never';

    return {
        realtimeEnabled: preferences.inAppNotifications,
        emailEnabled,
        digestEnabled,
        inAppNotifications: preferences.inAppNotifications,
        emailOnWorkflowStart: preferences.emailOnWorkflowStart,
        emailOnWorkflowComplete: preferences.emailOnWorkflowComplete,
        emailOnWorkflowFail: preferences.emailOnWorkflowFail,
        emailOnApprovalNeeded: preferences.emailOnApprovalNeeded,
        emailOnApprovalDecision: preferences.emailOnApprovalDecision,
        emailOnFormSubmission: preferences.emailOnFormSubmission,
        emailDigestFrequency: preferences.emailDigestFrequency,
    };
}

export const notificationsApi = {
    getMyNotifications: async (): Promise<Notification[]> => {
        const response = await apiClient.get<Notification[]>('notifications/my-notifications');
        return response.data;
    },
    markAsRead: async (id: string): Promise<void> => {
        await apiClient.put(`notifications/${id}/read`);
    },
    markAllAsRead: async (): Promise<void> => {
        await apiClient.put('notifications/mark-all-read');
    },
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`notifications/${id}`);
    },
    clearAll: async (): Promise<void> => {
        await apiClient.delete('notifications/clear-all');
    },
    getPreferences: async (): Promise<NotificationPreferences> => {
        const response = await apiClient.get<NotificationPreferencesApiDto>('notifications/preferences');
        return toNotificationPreferences(response.data);
    },
    updatePreferences: async (preferences: NotificationPreferences): Promise<void> => {
        await apiClient.put('notifications/preferences', toNotificationPreferencesApiDto(preferences));
    },
};
