'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CheckSquare, Clock } from 'lucide-react';

export const ApprovalNode: React.FC<NodeProps> = ({ data, selected }) => {
    const getApproverLabel = () => {
        const steps = Array.isArray(data.config?.steps) ? data.config.steps : [];
        if (steps.length > 0) return 'Multi-step Approval';
        if (!data.config?.approverType) return 'Not configured';

        switch (data.config.approverType) {
            case 'user':
                return 'User Approval';
            case 'role':
                return 'Role Approval';
            case 'group':
                return 'Group Approval';
            default:
                return 'Approval';
        }
    };

    const getApprovalTypeLabel = () => {
        switch (data.config?.approvalType) {
            case 'any':
                return 'Any One';
            case 'all':
                return 'All';
            case 'majority':
                return 'Majority';
            default:
                return '';
        }
    };

    const steps = Array.isArray(data.config?.steps) ? data.config.steps : [];
    const routingMode = data.config?.routingMode || 'sequential';

    return (
        <div
            className={`bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 min-w-[200px] border-2 ${selected ? 'border-fcc-gold' : 'border-transparent'
                }`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-fcc-gold !w-3 !h-3 !border-2 !border-white"
            />

            <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-2 rounded">
                    <CheckSquare size={18} className="text-white" />
                </div>
                <div className="text-white font-bold">{data.label || 'Approval'}</div>
            </div>

            <div className="text-white/80 text-sm space-y-1">
                <div className="font-medium">{getApproverLabel()}</div>
                {steps.length > 0 && (
                    <div className="text-xs opacity-75">
                        Steps: {steps.length} ({routingMode})
                    </div>
                )}
                {data.config?.approvalType && (
                    <div className="text-xs opacity-75">
                        Type: {getApprovalTypeLabel()}
                    </div>
                )}
                {data.config?.deadlineHours && (
                    <div className="flex items-center gap-1 text-xs opacity-75">
                        <Clock size={12} />
                        <span>{data.config.deadlineHours}h deadline</span>
                    </div>
                )}
            </div>
            <Handle
                type="source"
                position={Position.Right}
                id="approved"
                style={{ top: '40%' }}
                className="!bg-green-300 !w-3 !h-3 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                id="rejected"
                style={{ top: '60%' }}
                className="!bg-red-400 !w-3 !h-3 !border-2 !border-white"
            />
            <div className="absolute right-4 top-[35%] text-xs text-white font-medium">
                ✓
            </div>
            <div className="absolute right-4 top-[55%] text-xs text-white font-medium">
                ✗
            </div>
        </div>
    );
};
