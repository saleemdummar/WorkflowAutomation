'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Clock } from 'lucide-react';

export const WaitNode: React.FC<NodeProps> = ({ data, selected }) => {
    const getWaitLabel = () => {
        const hours = data.config?.waitHours || 0;
        const minutes = data.config?.waitMinutes || 0;
        if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        return 'Not configured';
    };

    return (
        <div
            className={`bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-lg p-4 min-w-[180px] border-2 ${selected ? 'border-fcc-gold' : 'border-transparent'
                }`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-fcc-gold !w-3 !h-3 !border-2 !border-white"
            />

            <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-2 rounded">
                    <Clock size={18} className="text-white" />
                </div>
                <div className="text-white font-bold">{data.label || 'Wait'}</div>
            </div>

            <div className="text-white/80 text-sm">
                <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>Delay: {getWaitLabel()}</span>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!bg-fcc-gold !w-3 !h-3 !border-2 !border-white"
            />
        </div>
    );
};
