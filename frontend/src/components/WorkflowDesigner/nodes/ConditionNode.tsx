'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';

export const ConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
    const field = data.config?.field;
    const op = data.config?.operator;
    const value = data.config?.value;

    const operatorLabel = (operator?: string) => {
        switch (operator) {
            case 'equals': return '==';
            case 'notequals': return '!=';
            case 'greaterthan': return '>';
            case 'lessthan': return '<';
            case 'contains': return 'contains';
            default: return operator || '';
        }
    };

    const simpleSummary = field && op
        ? `${field} ${operatorLabel(op)} ${value ?? ''}`.trim()
        : '';

    return (
        <div
            className={`bg-linear-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-4 min-w-50 border-2 ${selected ? 'border-fcc-gold' : 'border-transparent'
                }`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="bg-fcc-gold! w-3! h-3! border-2! border-white!"
            />

            <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-2 rounded">
                    <GitBranch size={18} className="text-white" />
                </div>
                <div className="text-white font-bold">{data.label || 'Condition'}</div>
            </div>

            <div className="text-white/80 text-sm">
                {data.config?.condition ? (
                    <div className="font-mono text-xs bg-black/20 p-2 rounded max-w-45 overflow-hidden text-ellipsis">
                        {data.config.condition}
                    </div>
                ) : simpleSummary ? (
                    <div className="font-mono text-xs bg-black/20 p-2 rounded max-w-45 overflow-hidden text-ellipsis">
                        {simpleSummary}
                    </div>
                ) : (
                    <div className="opacity-75">No condition set</div>
                )}
            </div>
            <Handle
                type="source"
                position={Position.Right}
                id="true"
                style={{ top: '40%' }}
                className="bg-green-400! w-3! h-3! border-2! border-white!"
            />
            <Handle
                type="source"
                position={Position.Right}
                id="false"
                style={{ top: '60%' }}
                className="bg-red-400! w-3! h-3! border-2! border-white!"
            />

            <div className="absolute right-4 top-[35%] text-xs text-white font-medium">
                T
            </div>
            <div className="absolute right-4 top-[55%] text-xs text-white font-medium">
                F
            </div>
        </div>
    );
};
