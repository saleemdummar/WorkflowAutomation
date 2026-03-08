import { apiClient } from './client';
import type { FormField, FormExportData, VersionComparison } from './types';
import type { Form, FormVersion, FormLifecycleStatus } from '../../types/entities';

interface BackendFormFieldDto {
    id?: string;
    Id?: string;
    name?: string;
    Name?: string;
    label?: string;
    Label?: string;
    type?: string;
    Type?: string;
    required?: boolean;
    Required?: boolean;
    order?: number;
    Order?: number;
    options?: string;
    validationRules?: string;
    configJson?: string;
    ConfigJson?: string;
}

const mapFieldConfig = (field: BackendFormFieldDto) => {
    const configJson = field.configJson || field.ConfigJson;
    if (!configJson) {
        return {
            options: field.options || '',
            validationRules: field.validationRules || '',
        };
    }

    try {
        const config = JSON.parse(configJson) as { options?: unknown; validation?: unknown };
        return {
            options: config.options ? JSON.stringify(config.options) : field.options || '',
            validationRules: config.validation ? JSON.stringify(config.validation) : field.validationRules || '',
        };
    } catch {
        return {
            options: field.options || '',
            validationRules: field.validationRules || '',
        };
    }
};

export const formsApi = {
    getAll: async (categoryId?: string): Promise<Form[]> => {
        const url = categoryId ? `forms?categoryId=${categoryId}` : 'forms';
        const response = await apiClient.get<Form[]>(url);
        return response.data;
    },
    getById: async (id: string): Promise<Form> => {
        const response = await apiClient.get<Form>(`forms/${id}`);
        return response.data;
    },
    create: async (data: { name: string; description: string; definition: string; layout?: string; categoryId?: string; changeDescription?: string }): Promise<Form> => {
        const response = await apiClient.post<Form>('forms', data);
        return response.data;
    },
    update: async (id: string, data: { name: string; description: string; definition: string; layout?: string; categoryId?: string; changeDescription?: string }): Promise<Form> => {
        const response = await apiClient.put<Form>(`forms/${id}`, data);
        return response.data;
    },
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`forms/${id}`);
    },
    publish: async (id: string): Promise<void> => {
        await apiClient.patch(`forms/${id}/publish`);
    },
    unpublish: async (id: string): Promise<void> => {
        await apiClient.patch(`forms/${id}/unpublish`);
    },
    getVersions: async (formId: string): Promise<FormVersion[]> => {
        const response = await apiClient.get<FormVersion[]>(`forms/${formId}/FormVersions`);
        return response.data;
    },
    getVersion: async (formId: string, versionId: string): Promise<FormVersion> => {
        const response = await apiClient.get<FormVersion>(`forms/${formId}/FormVersions/${versionId}`);
        return response.data;
    },
    getLatestVersion: async (formId: string): Promise<FormVersion> => {
        const response = await apiClient.get<FormVersion>(`forms/${formId}/FormVersions/latest`);
        return response.data;
    },
    rollbackVersion: async (formId: string, versionNumber: number): Promise<Form> => {
        const response = await apiClient.post<Form>(`forms/${formId}/FormVersions/${versionNumber}/rollback`);
        return response.data;
    },
    compareVersions: async (formId: string, version1: number, version2: number): Promise<VersionComparison> => {
        const response = await apiClient.get<VersionComparison>(`forms/${formId}/FormVersions/compare/${version1}/${version2}`);
        return response.data;
    },
    previewVersion: async (formId: string, versionNumber: number): Promise<FormVersion> => {
        const response = await apiClient.get<FormVersion>(`forms/${formId}/FormVersions/preview/${versionNumber}`);
        return response.data;
    },
    exportForm: async (formId: string): Promise<FormExportData> => {
        const response = await apiClient.get<FormExportData>(`forms/${formId}/export`);
        return response.data;
    },
    syncFields: async (formId: string): Promise<void> => {
        await apiClient.post(`forms/${formId}/sync-fields`);
    },
    importForm: async (data: FormExportData): Promise<Form> => {
        const response = await apiClient.post<Form>('forms/import', data);
        return response.data;
    },
    search: async (query: string): Promise<Form[]> => {
        const response = await apiClient.get<Form[]>(`forms/search?query=${encodeURIComponent(query)}`);
        return response.data;
    },
    getFields: async (formId: string): Promise<FormField[]> => {
        const response = await apiClient.get<BackendFormFieldDto[]>(`forms/${formId}/fields`);
        return response.data.map((field) => {
            const mappedConfig = mapFieldConfig(field);
            return {
                id: field.id || field.Id || field.name || field.Name || '',
                formId: formId,
                fieldName: field.name || field.Name || '',
                fieldLabel: field.label || field.Label || '',
                fieldType: field.type || field.Type || 'text',
                isRequired: field.required ?? field.Required ?? false,
                displayOrder: field.order ?? field.Order ?? 0,
                options: mappedConfig.options,
                validationRules: mappedConfig.validationRules,
                name: field.name || field.Name || '',
                label: field.label || field.Label || ''
            };
        });
    },
    transferOwnership: async (formId: string, data: { newOwnerId: string }): Promise<void> => {
        await apiClient.post(`forms/${formId}/transfer-ownership`, data);
    },
    archive: async (formId: string, data?: { archiveReason?: string }): Promise<void> => {
        await apiClient.post(`forms/${formId}/archive`, data || {});
    },
    restore: async (formId: string, data?: { restoreReason?: string }): Promise<void> => {
        await apiClient.post(`forms/${formId}/restore`, data || {});
    },
    setExpiration: async (formId: string, data: { expirationDate?: string | null; expirationReason?: string }): Promise<void> => {
        await apiClient.post(`forms/${formId}/expiration`, data);
    },
    setSchedule: async (formId: string, data: { publishDate?: string | null; unpublishDate?: string | null; scheduleReason?: string }): Promise<void> => {
        await apiClient.post(`forms/${formId}/schedule`, data);
    },
    getLifecycleStatus: async (formId: string): Promise<FormLifecycleStatus> => {
        const response = await apiClient.get<FormLifecycleStatus>(`forms/${formId}/lifecycle-status`);
        return response.data;
    },
    getArchived: async (): Promise<Form[]> => {
        const response = await apiClient.get<Form[]>('forms/archived');
        return response.data;
    },
    getExpired: async (): Promise<Form[]> => {
        const response = await apiClient.get<Form[]>('forms/expired');
        return response.data;
    },
};
