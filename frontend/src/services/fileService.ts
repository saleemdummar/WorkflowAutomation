import axios from 'axios';
import { apiClient } from '../lib/api';

export interface FileUploadResult {
    isValid: boolean;
    fileId?: string;
    fileName?: string;
    fileSize: number;
    fileType?: string;
    errors: string[];
}

export interface FileUploadOptions {
    formId?: string;
    fieldId?: string;
    /** Called with progress percentage (0-100) for each file */
    onProgress?: (fileName: string, percent: number) => void;
    /** Maximum number of retry attempts on failure (default: 2) */
    maxRetries?: number;
}

const DEFAULT_MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Delay helper for retry backoff.
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class FileService {
    /**
     * Upload a single file with optional retry logic.
     */
    static async uploadFile(file: File, options?: FileUploadOptions): Promise<FileUploadResult> {
        const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                if (options?.formId) {
                    formData.append('formId', options.formId);
                }

                if (options?.fieldId) {
                    formData.append('fieldId', options.fieldId);
                }

                const response = await apiClient.post<FileUploadResult>('/files/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        if (options?.onProgress && progressEvent.total) {
                            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            options.onProgress(file.name, percent);
                        }
                    },
                });

                return response.data;
            } catch (error) {
                // Don't retry on client errors (4xx) — only server/network errors
                if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
                    return error.response.data as FileUploadResult;
                }

                // Last attempt — return error
                if (attempt === maxRetries) {
                    if (axios.isAxiosError(error) && error.response?.data) {
                        return error.response.data as FileUploadResult;
                    }
                    return {
                        isValid: false,
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        errors: [error instanceof Error ? error.message : 'File upload failed'],
                    };
                }

                // Wait with exponential backoff before retrying
                await delay(RETRY_DELAY_MS * Math.pow(2, attempt));
            }
        }

        // Unreachable, but TypeScript needs it
        throw new Error('Upload failed after all retries');
    }

    /**
     * Upload multiple files in parallel (was previously sequential).
     * Limits concurrency to avoid overwhelming the server.
     */
    static async uploadFiles(
        files: File[],
        options?: FileUploadOptions,
        maxConcurrency = 3,
    ): Promise<FileUploadResult[]> {
        if (files.length === 0) return [];

        // For small batches, use simple Promise.all
        if (files.length <= maxConcurrency) {
            return Promise.all(files.map(file => this.uploadFile(file, options)));
        }

        // For larger batches, use chunked concurrency
        const results: FileUploadResult[] = [];
        for (let i = 0; i < files.length; i += maxConcurrency) {
            const chunk = files.slice(i, i + maxConcurrency);
            const chunkResults = await Promise.all(
                chunk.map(file => this.uploadFile(file, options)),
            );
            results.push(...chunkResults);
        }
        return results;
    }

    /**
     * Download a file by ID.
     */
    static async downloadFile(fileId: string): Promise<Blob> {
        const response = await apiClient.get(`/files/${fileId}`, {
            responseType: 'blob',
        });

        return response.data;
    }
}

export default FileService;
