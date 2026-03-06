'use client';

import React from 'react';
import { Zap, GitBranch, Play, CheckCircle, StopCircle, Clock, Code } from 'lucide-react';

interface NodePaletteProps {
    onAddNode: (type: string) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
    const nodeTypes = [
        {
            type: 'trigger',
            label: 'Trigger',
            icon: Zap,
            color: 'green',
            description: 'Start workflow on form submission',
        },
        {
            type: 'condition',
            label: 'Condition',
            icon: GitBranch,
            color: 'yellow',
            description: 'Branch based on field values',
        },
        {
            type: 'action',
            label: 'Action',
            icon: Play,
            color: 'orange',
            description: 'Perform an action (email, update)',
        },
        {
            type: 'approval',
            label: 'Approval',
            icon: CheckCircle,
            color: 'green',
            description: 'Require approval from user/role',
        },
        {
            type: 'wait',
            label: 'Wait',
            icon: Clock,
            color: 'orange',
            description: 'Delay execution by time',
        },
        {
            type: 'script',
            label: 'Script',
            icon: Code,
            color: 'teal',
            description: 'Run custom JavaScript logic',
        },
        {
            type: 'end',
            label: 'End',
            icon: StopCircle,
            color: 'red',
            description: 'Terminate workflow execution',
        },
    ];

    const colorClasses = {
        green: 'from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
        yellow: 'from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700',
        blue: 'from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700',
        purple: 'from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700',
        orange: 'from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700',
        teal: 'from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700',
        red: 'from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700',
    };

    return (
        <div className="hidden md:block w-48 lg:w-64 bg-fcc-charcoal border-r border-fcc-border p-3 lg:p-4 overflow-y-auto shrink-0">
            <h3 className="text-lg font-bold text-white mb-4">Node Palette</h3>
            <p className="text-sm text-gray-400 mb-6">
                Drag or click to add nodes to the canvas
            </p>

            <div className="space-y-3">
                {nodeTypes.map((nodeType) => {
                    const Icon = nodeType.icon;
                    return (
                        <button
                            key={nodeType.type}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('application/reactflow', nodeType.type);
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                            onClick={() => onAddNode(nodeType.type)}
                            className={`w-full p-4 rounded-lg bg-gradient-to-br ${colorClasses[nodeType.color as keyof typeof colorClasses]
                                } text-white transition-all hover:scale-105 hover:shadow-lg cursor-grab active:cursor-grabbing`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <Icon size={20} />
                                <span className="font-bold">{nodeType.label}</span>
                            </div>
                            <p className="text-xs opacity-90">{nodeType.description}</p>
                        </button>
                    );
                })}
            </div>

            <div className="mt-8 p-4 bg-fcc-midnight rounded-lg border border-fcc-border">
                <h4 className="text-sm font-bold text-white mb-2">Tips</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Start with a Trigger node</li>
                    <li>• Connect nodes by dragging edges</li>
                    <li>• Click nodes to configure</li>
                    <li>• Validate before publishing</li>
                </ul>
            </div>
        </div>
    );
};
