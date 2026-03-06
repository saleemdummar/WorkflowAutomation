'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Send, Mail, Webhook } from 'lucide-react';

export const ActionNode: React.FC<NodeProps> = ({ data, selected }) => {
    const getIcon = () => {
        switch (data.config?.actionType) {
            case 'send_email':
                return <Mail size={18} className="text-white" />;
            case 'webhook':
                return <Webhook size={18} className="text-white" />;
            default:
                return <Send size={18} className="text-white" />;
        }
    };

    const getActionLabel = () => {
        switch (data.config?.actionType) {
            case 'send_email':
                return 'Send Email';
            case 'update_field':
                return 'Update Field';
            case 'update_status':
                return 'Update Status';
            case 'webhook':
                return 'Call Webhook';
            default:
                return 'Action';
        }
    };

    return (
        <div
            className={`bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 min-w-[200px] border-2 ${selected ? 'border-fcc-gold' : 'border-transparent'
                }`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-fcc-gold !w-3 !h-3 !border-2 !border-white"
            />

            <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-2 rounded">
                    {getIcon()}
                </div>
                <div className="text-white font-bold">{data.label || 'Action'}</div>
            </div>

            <div className="text-white/80 text-sm">
                <div className="font-medium">{getActionLabel()}</div>
                {data.config?.actionType === 'send_email' && data.config?.toEmail && (
                    <div className="text-xs mt-1 opacity-75 truncate max-w-[180px]">
                        To: {data.config.toEmail}
                    </div>
                )}
                {data.config?.subject && (
                    <div className="text-xs mt-1 opacity-75 truncate max-w-[180px]">
                        {data.config.subject}
                    </div>
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
