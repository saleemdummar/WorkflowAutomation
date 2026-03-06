import { useEffect, useRef, useCallback } from 'react';
import { submissionsApi } from '../lib/api';

interface DraftSaveOptions {
    formId: string;
    formData: any;
    initialDraftId?: string | null;
    onSave?: (draftId: string) => void;
    onError?: (error: any) => void;
    interval?: number;
    enabled?: boolean;
}

export const useAutoSaveDraft = ({
    formId,
    formData,
    initialDraftId = null,
    onSave,
    onError,
    interval = 30000,
    enabled = true
}: DraftSaveOptions) => {
    const draftIdRef = useRef<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSaveRef = useRef<string>('');

    useEffect(() => {
        if (initialDraftId) {
            draftIdRef.current = initialDraftId;
        }
    }, [initialDraftId]);

    const saveDraft = useCallback(async () => {
        if (!enabled || !formId) return;

        const currentData = JSON.stringify(formData);
        if (currentData === lastSaveRef.current) return;
        if (!formData || Object.keys(formData).length === 0) return;

        try {
            const result = await submissionsApi.saveDraft(formId, {
                formId,
                submissionData: currentData,
                draftId: draftIdRef.current
            });

            draftIdRef.current = result.id;
            lastSaveRef.current = currentData;
            onSave?.(result.id);
        } catch (error) {
            console.error('Error saving draft:', error);
            onError?.(error);
        }
    }, [formId, formData, enabled, onSave, onError]);
    useEffect(() => {
        if (!enabled) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            return;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            saveDraft();
        }, interval);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [formData, enabled, interval, saveDraft]);
    const saveNow = useCallback(async () => {
        await saveDraft();
    }, [saveDraft]);
    const clearDraft = useCallback(() => {
        draftIdRef.current = null;
        lastSaveRef.current = '';
    }, []);

    return {
        draftId: draftIdRef.current,
        saveNow,
        clearDraft
    };
};
