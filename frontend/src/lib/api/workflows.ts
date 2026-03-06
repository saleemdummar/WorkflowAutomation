import { apiClient } from './client';
import type { WorkflowAnalytics, WorkflowTestResult, WorkflowExportData, WorkflowVersion, VersionComparison, WorkflowExecutionDetail } from './types';
import type { Workflow, WorkflowExecution } from '../../types/entities';

export const workflowsApi = {
    getAll: async (): Promise<Workflow[]> => {
        const response = await apiClient.get<Workflow[]>('workflows');
        return response.data;
    },
    getById: async (id: string): Promise<Workflow> => {
        const response = await apiClient.get<Workflow>(`workflows/${id}`);
        return response.data;
    },
    create: async (data: {
        name: string;
        description?: string;
        definition: string;
        isActive?: boolean;
        isPublished?: boolean;
        formId?: string;
        changeDescription?: string;
    }): Promise<Workflow> => {
        const response = await apiClient.post<Workflow>('workflows', data);
        return response.data;
    },
    update: async (id: string, data: {
        name: string;
        description?: string;
        definition: string;
        isActive?: boolean;
        isPublished?: boolean;
        formId?: string;
        changeDescription?: string;
    }): Promise<Workflow> => {
        const response = await apiClient.put<Workflow>(`workflows/${id}`, data);
        return response.data;
    },
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`workflows/${id}`);
    },
    clone: async (id: string): Promise<Workflow> => {
        const response = await apiClient.post<Workflow>(`workflows/${id}/clone`);
        return response.data;
    },
    getExecutions: async (): Promise<WorkflowExecution[]> => {
        const response = await apiClient.get<WorkflowExecution[]>('workflows/executions');
        return response.data;
    },
    getExecutionDetail: async (id: string): Promise<WorkflowExecutionDetail> => {
        const response = await apiClient.get<WorkflowExecutionDetail>(`workflows/executions/${id}`);
        return response.data;
    },
    retryExecution: async (id: string): Promise<void> => {
        await apiClient.post(`workflows/executions/${id}/retry`);
    },
    cancelExecution: async (id: string): Promise<void> => {
        await apiClient.post(`workflows/executions/${id}/cancel`);
    },
    getAnalytics: async (): Promise<WorkflowAnalytics[]> => {
        const response = await apiClient.get<WorkflowAnalytics[]>('workflows/analytics');
        return response.data;
    },
    testWorkflow: async (id: string, data?: { testData?: Record<string, unknown>; simulateApproval?: string }): Promise<WorkflowTestResult> => {
        const response = await apiClient.post<WorkflowTestResult>(`workflows/${id}/test`, data || {});
        return response.data;
    },
    exportWorkflow: async (id: string): Promise<WorkflowExportData> => {
        const response = await apiClient.get<WorkflowExportData>(`workflows/${id}/export`);
        return response.data;
    },
    importWorkflow: async (data: { name: string; description?: string; definition: string }): Promise<Workflow> => {
        const response = await apiClient.post<Workflow>('workflows/import', data);
        return response.data;
    },
};

export const workflowVersionsApi = {
    getVersions: async (workflowId: string): Promise<WorkflowVersion[]> => {
        const response = await apiClient.get<WorkflowVersion[]>(`workflows/${workflowId}/versions`);
        return response.data;
    },
    rollback: async (workflowId: string, versionNumber: number): Promise<Workflow> => {
        const response = await apiClient.post<Workflow>(`workflows/${workflowId}/versions/${versionNumber}/rollback`);
        return response.data;
    },
    compare: async (workflowId: string, version1: number, version2: number): Promise<VersionComparison> => {
        const response = await apiClient.get<VersionComparison>(`workflows/${workflowId}/versions/compare/${version1}/${version2}`);
        return response.data;
    },
};
