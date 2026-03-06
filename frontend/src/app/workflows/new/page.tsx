'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainNavigation } from '../../../components/MainNavigation';
import { WorkflowDesigner } from '../../../components/WorkflowDesigner/WorkflowDesigner';
import { useToast } from '../../../contexts/ToastContext';
import { ChevronLeft } from 'lucide-react';
import { AuthGuard } from '../../../components/AuthGuard';
import { useForms, useCreateWorkflow } from '@/hooks/queries';

function NewWorkflowPage() {
    const router = useRouter();
    const toast = useToast();
    const [selectedFormId, setSelectedFormId] = useState<string>('');

    const { data: forms = [] } = useForms();
    const createWorkflowMutation = useCreateWorkflow();

    const saving = createWorkflowMutation.isPending;

    const handleSave = async (workflowData: Record<string, unknown>) => {
        try {
            const workflowPayload = {
                name: String(workflowData.Name || ''),
                description: String(workflowData.Description || ''),
                definition: String(workflowData.Definition || '{}'),
                isActive: Boolean(workflowData.IsActive),
                isPublished: Boolean(workflowData.IsPublished),
                formId: selectedFormId || undefined,
                changeDescription: String(workflowData.ChangeDescription || 'Workflow created')
            };
            const result = await createWorkflowMutation.mutateAsync(workflowPayload);
            router.push(`/workflows/edit/${result.id}`);
        } catch (error) {
            console.error('Failed to save workflow:', error);
            toast.error('Failed to save workflow');
        }
    };

    return (
        <div className="min-h-screen bg-fcc-midnight">
            <MainNavigation />

            <div className="border-b border-fcc-border bg-fcc-charcoal">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <button
                        onClick={() => router.push('/workflows')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                    >
                        <ChevronLeft size={20} />
                        Back to Workflows
                    </button>
                    <h1 className="text-2xl font-bold text-white mb-4">Create New Workflow</h1>

                    <div className="mb-4">
                        <label htmlFor="form-select" className="block text-sm font-medium text-gray-300 mb-2">
                            Associate with Form (Optional)
                        </label>
                        <select
                            id="form-select"
                            value={selectedFormId}
                            onChange={(e) => setSelectedFormId(e.target.value)}
                            className="w-full max-w-md bg-fcc-midnight border border-fcc-border px-3 py-2 text-white rounded focus:border-fcc-gold outline-none"
                        >
                            <option value="">No form association</option>
                            {forms.map((form) => (
                                <option key={form.id} value={form.id}>
                                    {form.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-sm text-gray-400 mt-1">
                            Optionally associate this workflow with a form. The workflow can still be triggered independently.
                        </p>
                    </div>
                </div>
            </div>

            <WorkflowDesigner onSave={handleSave} saving={saving} />
        </div>
    );
}

export default function NewWorkflowPageWrapper() {
    return (
        <AuthGuard requiredRoles={['super-admin', 'admin', 'workflow-designer']}>
            <NewWorkflowPage />
        </AuthGuard>
    );
}
