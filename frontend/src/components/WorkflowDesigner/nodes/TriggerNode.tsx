'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap } from 'lucide-react';

export const TriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
    return (
        <div
            className={`bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 min-w-[200px] border-2 ${selected ? 'border-fcc-gold' : 'border-transparent'
                }`}
        >
            <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-2 rounded">
                    <Zap size={18} className="text-white" />
                </div>
                <div className="text-white font-bold">{data.label || 'Trigger'}</div>
            </div>

            <div className="text-white/80 text-sm">
                {data.config?.triggerType === 'form_submission' && (
                    <div>Form Submission</div>
                )}
                {data.config?.triggerType === 'field_change' && (
                    <div>Field Change</div>
                )}
                {data.config?.triggerType === 'schedule' && (
                    <div>Scheduled</div>
                )}
                {data.config?.formId && (
                    <div className="text-xs mt-1 opacity-75">Form: {data.config.formId}</div>
                )}
            </div>
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-fcc-gold !w-3 !h-3 !border-2 !border-white"
            />
        </div>
    );
};
