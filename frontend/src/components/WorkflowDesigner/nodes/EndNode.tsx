'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { StopCircle } from 'lucide-react';

export const EndNode: React.FC<NodeProps> = ({ data, selected }) => {
    return (
        <div
            className={`bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-lg p-4 min-w-[180px] border-2 ${selected ? 'border-fcc-gold' : 'border-transparent'
                }`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-fcc-gold !w-3 !h-3 !border-2 !border-white"
            />

            <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-2 rounded">
                    <StopCircle size={18} className="text-white" />
                </div>
                <div className="text-white font-bold">{data.label || 'End'}</div>
            </div>

            <div className="text-white/80 text-sm">
                {data.config?.message || 'Workflow terminates here'}
            </div>
        </div>
    );
};
