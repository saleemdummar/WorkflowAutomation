import { apiClient } from './client';
import type { ApprovalTask } from '../../types/entities';

export const approvalsApi = {
    getAll: async (): Promise<ApprovalTask[]> => {
        const response = await apiClient.get<ApprovalTask[]>('approvals');
        return response.data;
    },
    getMyTasks: async (): Promise<ApprovalTask[]> => {
        const response = await apiClient.get<ApprovalTask[]>('approvals/my-tasks');
        return response.data;
    },
    getTaskById: async (id: string): Promise<ApprovalTask> => {
        const response = await apiClient.get<ApprovalTask>(`approvals/${id}`);
        return response.data;
    },
    getHistory: async (id: string): Promise<Array<{ decision: string; decidedBy: string; decidedAt: string; comments?: string }>> => {
        const response = await apiClient.get(`approvals/${id}/history`);
        return response.data;
    },
    approveTask: async (id: string, data: { approved: boolean; comments?: string }): Promise<void> => {
        await apiClient.post(`approvals/${id}/approve`, data);
    },
    takeAction: async (id: string, data: { action: 'approve' | 'reject' | 'return'; comments?: string }): Promise<void> => {
        await apiClient.post(`approvals/${id}/action`, data);
    },
};
