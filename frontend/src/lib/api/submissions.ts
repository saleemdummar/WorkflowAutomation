import { apiClient } from './client';
import type { FormSubmission, DraftSummary } from '../../types/entities';

export const submissionsApi = {
    getAll: async (): Promise<FormSubmission[]> => {
        const response = await apiClient.get<FormSubmission[]>('submissions');
        return response.data;
    },
    submit: async (formId: string, data: { formId: string; submittedBy?: string; submissionData: string; draftId?: string | null }): Promise<FormSubmission> => {
        const response = await apiClient.post<FormSubmission>(`forms/${formId}/submissions`, data);
        return response.data;
    },
    getByForm: async (formId: string): Promise<FormSubmission[]> => {
        const response = await apiClient.get<FormSubmission[]>(`forms/${formId}/submissions`);
        return response.data;
    },
    getMySubmissions: async (): Promise<FormSubmission[]> => {
        const response = await apiClient.get<FormSubmission[]>('submissions/my-submissions');
        return response.data;
    },
    getById: async (id: string): Promise<FormSubmission> => {
        const response = await apiClient.get<FormSubmission>(`submissions/${id}`);
        return response.data;
    },
    getAllDrafts: async (): Promise<DraftSummary[]> => {
        const response = await apiClient.get<DraftSummary[]>('submissions/drafts');
        return response.data;
    },
    getDrafts: async (formId: string): Promise<DraftSummary[]> => {
        const response = await apiClient.get<DraftSummary[]>(`forms/${formId}/submissions/drafts`);
        return response.data;
    },
    getDraft: async (formId: string, draftId: string): Promise<FormSubmission> => {
        const response = await apiClient.get<FormSubmission>(`forms/${formId}/submissions/draft/${draftId}`);
        return response.data;
    },
    saveDraft: async (formId: string, data: { formId: string; submissionData: string; draftId?: string | null }): Promise<FormSubmission> => {
        const response = await apiClient.post<FormSubmission>(`forms/${formId}/submissions/draft`, data);
        return response.data;
    },
    deleteDraft: async (formId: string, draftId: string): Promise<void> => {
        await apiClient.delete(`forms/${formId}/submissions/draft/${draftId}`);
    },
    submitDraft: async (formId: string, draftId: string): Promise<FormSubmission> => {
        const response = await apiClient.post<FormSubmission>(`forms/${formId}/submissions/draft/${draftId}/submit`);
        return response.data;
    }
};
