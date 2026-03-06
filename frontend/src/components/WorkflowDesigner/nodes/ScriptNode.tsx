'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Code } from 'lucide-react';

export const ScriptNode: React.FC<NodeProps> = ({ data, selected }) => {
    const script = data.config?.script || '';
    const preview = script.length > 40 ? `${script.substring(0, 40)}...` : script;

    return (
        <div
            className={`bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-lg p-4 min-w-[200px] border-2 ${selected ? 'border-fcc-gold' : 'border-transparent'
                }`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-fcc-gold !w-3 !h-3 !border-2 !border-white"
            />

            <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-2 rounded">
                    <Code size={18} className="text-white" />
                </div>
                <div className="text-white font-bold">{data.label || 'Script'}</div>
            </div>

            <div className="text-white/80 text-sm">
                {preview ? (
                    <code className="text-xs bg-white/10 px-2 py-1 rounded block truncate">
                        {preview}
                    </code>
                ) : (
                    <span className="text-white/60 italic">No script configured</span>
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
