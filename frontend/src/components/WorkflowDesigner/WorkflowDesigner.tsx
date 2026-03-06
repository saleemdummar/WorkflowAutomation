'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
    Node,
    Edge,
    addEdge,
    Background,
    Controls,
    MiniMap,
    Connection,
    useNodesState,
    useEdgesState,
    MarkerType,
    ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useToast } from '@/contexts/ToastContext';
import { NodePalette } from './NodePalette';
import { NodeProperties } from './NodeProperties';
import { WorkflowToolbar } from './WorkflowToolbar';
import { WorkflowTestingTool } from './WorkflowTestingTool';
import { WorkflowVersionHistory } from './WorkflowVersionHistory';
import { TriggerNode } from './nodes/TriggerNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { ApprovalNode } from './nodes/ApprovalNode';
import { EndNode } from './nodes/EndNode';
import { WaitNode } from './nodes/WaitNode';
import { ScriptNode } from './nodes/ScriptNode';
import { v4 as uuidv4 } from 'uuid';

const nodeTypes = {
    trigger: TriggerNode,
    condition: ConditionNode,
    action: ActionNode,
    approval: ApprovalNode,
    end: EndNode,
    wait: WaitNode,
    script: ScriptNode,
};

interface WorkflowDefinition {
    nodes?: Node[];
    edges?: Edge[];
}

interface InitialWorkflow {
    id?: string;
    name?: string;
    description?: string;
    isPublished?: boolean;
    version?: number;
    workflowDefinition?: string | WorkflowDefinition;
    definition?: string | WorkflowDefinition;
}

interface WorkflowDesignerProps {
    initialWorkflow?: InitialWorkflow;
    onSave: (workflow: Record<string, unknown>) => Promise<void>;
    saving?: boolean;
}

export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
    initialWorkflow,
    onSave,
    saving = false,
}) => {
    const { success, error: showError } = useToast();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [workflowName, setWorkflowName] = useState(initialWorkflow?.name || 'Untitled Workflow');
    const [workflowDescription, setWorkflowDescription] = useState(initialWorkflow?.description || '');
    const [isPublished, setIsPublished] = useState(initialWorkflow?.isPublished || false);
    const [showTestingTool, setShowTestingTool] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

    useEffect(() => {
        const rawDefinition = initialWorkflow?.workflowDefinition || initialWorkflow?.definition;
        if (rawDefinition) {
            try {
                const definition = typeof rawDefinition === 'string'
                    ? JSON.parse(rawDefinition)
                    : rawDefinition;

                if (definition.nodes) setNodes(definition.nodes);
                if (definition.edges) setEdges(definition.edges);
            } catch (error) {
                console.error('Failed to parse workflow definition:', error);
            }
        }
    }, [initialWorkflow, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) =>
            setEdges((eds) =>
                addEdge(
                    {
                        ...params,
                        markerEnd: { type: MarkerType.ArrowClosed },
                        style: { stroke: '#FFD700' },
                    },
                    eds
                )
            ),
        [setEdges]
    );

    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const handleAddNode = (type: string) => {
        const defaultConfig: Record<string, unknown> = {};
        if (type === 'trigger') {
            defaultConfig.triggerType = 'form_submission';
        }
        // Place new nodes in a predictable grid position (fixes WF-04)
        const existingCount = nodes.length;
        const col = existingCount % 3;
        const row = Math.floor(existingCount / 3);
        const newNode: Node = {
            id: uuidv4(),
            type,
            position: {
                x: 150 + col * 280,
                y: 100 + row * 200,
            },
            data: {
                label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
                config: defaultConfig,
            },
        };

        setNodes((nds) => [...nds, newNode]);
    };

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;
        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        // Use screenToFlowPosition instead of deprecated project() (fixes WF-03)
        const position = reactFlowInstance.screenToFlowPosition
            ? reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
            : reactFlowInstance.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
        const newNode: Node = {
            id: uuidv4(),
            type,
            position,
            data: {
                label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
                config: type === 'trigger' ? { triggerType: 'form_submission' } : {},
            },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [reactFlowInstance, setNodes]);

    const handleNodeUpdate = (nodeId: string, updates: Record<string, unknown>) => {
        setNodes((nds) =>
            nds.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...updates } }
                    : node
            )
        );
    };

    const handleDeleteNode = (nodeId: string) => {
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) =>
            eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
        );
        setSelectedNode(null);
    };

    // Extract formId from the first trigger node's config so the backend can match workflows to form submissions
    const extractFormIdFromTrigger = (): string | undefined => {
        const triggerNode = nodes.find((n) => n.type === 'trigger');
        const formId = triggerNode?.data?.config?.formId;
        return formId && typeof formId === 'string' && formId.length > 0 ? formId : undefined;
    };

    const handleSave = async () => {
        if (workflowName.trim() === '') {
            showError('Workflow name is required');
            return;
        }

        const errors = validateWorkflow();
        if (errors.length > 0) {
            showError(`Validation failed: ${errors[0]}`);
            return;
        }

        const workflowData = {
            Name: workflowName,
            Description: workflowDescription,
            Definition: JSON.stringify({ nodes, edges }),
            IsPublished: isPublished,
            IsActive: true,
            Version: (initialWorkflow?.version || 0) + 1,
            ChangeDescription: initialWorkflow ? 'Workflow updated' : 'Workflow created',
            FormId: extractFormIdFromTrigger()
        };

        try {
            await onSave(workflowData);
            success('Workflow saved successfully');
        } catch (err: any) {
            const message = err.response?.data?.message || err.response?.data?.title || 'Failed to save workflow';
            showError(message);
        }
    };

    const handlePublish = async () => {
        if (workflowName.trim() === '') {
            showError('Workflow name is required');
            return;
        }

        const errors = validateWorkflow();
        if (errors.length > 0) {
            showError(`Cannot publish: ${errors[0]}`);
            return;
        }

        setIsPublished(true);
        const workflowData = {
            Name: workflowName,
            Description: workflowDescription,
            Definition: JSON.stringify({ nodes, edges }),
            IsPublished: true,
            IsActive: true,
            Version: (initialWorkflow?.version || 0) + 1,
            ChangeDescription: 'Workflow published',
            FormId: extractFormIdFromTrigger()
        };

        try {
            await onSave(workflowData);
            success('Workflow published successfully');
        } catch (err: any) {
            const message = err.response?.data?.message || err.response?.data?.title || 'Failed to publish workflow';
            showError(message);
        }
    };

    const validateWorkflow = () => {
        const errors: string[] = [];
        const isGuid = (value: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);

        const hasTrigger = nodes.some((node) => node.type === 'trigger');
        if (!hasTrigger) {
            errors.push('Workflow must have at least one trigger node');
        }

        const invalidIds = nodes.filter(n => !isGuid(n.id));
        if (invalidIds.length > 0) {
            errors.push('All node IDs must be valid GUIDs. Recreate invalid nodes before saving.');
        }

        const connectedNodes = new Set<string>();
        edges.forEach((edge) => {
            connectedNodes.add(edge.source);
            connectedNodes.add(edge.target);
        });

        const disconnectedNodes = nodes.filter(
            (node) => !connectedNodes.has(node.id) && node.type !== 'trigger'
        );
        if (disconnectedNodes.length > 0) {
            errors.push(`${disconnectedNodes.length} node(s) are not connected`);
        }

        // Dead-end detection: non-end nodes that have incoming edges but no outgoing edges
        nodes.forEach((node) => {
            if (node.type !== 'end') {
                const hasOutgoing = edges.some((e) => e.source === node.id);
                const hasIncoming = edges.some((e) => e.target === node.id);
                if (hasIncoming && !hasOutgoing) {
                    errors.push(`Node "${node.data.label}" is a dead end (no outgoing connections). Add an End node or connect it further.`);
                }
            }
        });

        // Circular reference detection using DFS
        const adjacency = new Map<string, string[]>();
        edges.forEach((e) => {
            if (!adjacency.has(e.source)) adjacency.set(e.source, []);
            adjacency.get(e.source)!.push(e.target);
        });

        const visited = new Set<string>();
        const inStack = new Set<string>();
        let hasCycle = false;

        const dfs = (nodeId: string) => {
            if (hasCycle) return;
            visited.add(nodeId);
            inStack.add(nodeId);
            for (const neighbor of adjacency.get(nodeId) || []) {
                if (inStack.has(neighbor)) {
                    hasCycle = true;
                    return;
                }
                if (!visited.has(neighbor)) {
                    dfs(neighbor);
                }
            }
            inStack.delete(nodeId);
        };

        for (const node of nodes) {
            if (!visited.has(node.id)) {
                dfs(node.id);
            }
        }
        if (hasCycle) {
            errors.push('Workflow contains a circular reference (cycle). Remove the loop to proceed.');
        }

        nodes.forEach((node) => {
            if (node.type === 'approval') {
                const steps = Array.isArray(node.data.config?.steps) ? node.data.config.steps : [];
                if (steps.length > 0) {
                    const invalidStep = steps.find((step: any) => !step?.approverId);
                    if (invalidStep) {
                        errors.push(`Approval node "${node.data.label}" has a step missing approver configuration`);
                    }
                } else if (!node.data.config?.approverId) {
                    errors.push(`Approval node "${node.data.label}" is missing approver configuration`);
                }
            }
            if (node.type === 'condition' && !node.data.config?.condition && !node.data.config?.field) {
                errors.push(`Condition node "${node.data.label}" is missing condition configuration (set either a JS expression or field/operator/value)`);
            }
        });

        return errors;
    };

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-180px)]">
            <NodePalette onAddNode={handleAddNode} />
            <div className="flex-1 relative">
                <WorkflowToolbar
                    workflowName={workflowName}
                    workflowDescription={workflowDescription}
                    onNameChange={setWorkflowName}
                    onDescriptionChange={setWorkflowDescription}
                    onSave={handleSave}
                    onPublish={handlePublish}
                    onValidate={validateWorkflow}
                    onTest={() => setShowTestingTool(true)}
                    onVersionHistory={initialWorkflow?.id ? () => setShowVersionHistory(true) : undefined}
                    saving={saving}
                    isPublished={isPublished}
                />
                <div ref={reactFlowWrapper} className="h-full" onDragOver={handleDragOver} onDrop={handleDrop}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        onInit={setReactFlowInstance}
                        nodeTypes={nodeTypes}
                        fitView
                        className="bg-fcc-midnight"
                    >
                        <Background color="#374151" gap={16} />
                        <Controls className="bg-fcc-charcoal border-fcc-border" />
                        <MiniMap
                            className="bg-fcc-charcoal border border-fcc-border"
                            nodeColor={(node) => {
                                switch (node.type) {
                                    case 'trigger':
                                        return '#10b981';
                                    case 'condition':
                                        return '#f59e0b';
                                    case 'action':
                                        return '#f97316';
                                    case 'approval':
                                        return '#22c55e';
                                    case 'end':
                                        return '#ef4444';
                                    case 'wait':
                                        return '#f97316';
                                    case 'script':
                                        return '#14b8a6';
                                    default:
                                        return '#6b7280';
                                }
                            }}
                        />
                    </ReactFlow>
                </div>
            </div>
            <NodeProperties
                node={selectedNode}
                onUpdate={handleNodeUpdate}
                onDelete={handleDeleteNode}
                onClose={() => setSelectedNode(null)}
                workflowId={initialWorkflow?.id}
            />

            <WorkflowTestingTool
                isOpen={showTestingTool}
                onClose={() => setShowTestingTool(false)}
                nodes={nodes}
                edges={edges}
                workflowName={workflowName}
                workflowId={initialWorkflow?.id}
            />

            {initialWorkflow?.id && (
                <WorkflowVersionHistory
                    workflowId={initialWorkflow.id}
                    isOpen={showVersionHistory}
                    onClose={() => setShowVersionHistory(false)}
                    onRevert={(version) => {
                        try {
                            const def = typeof version.definition === 'string' ? JSON.parse(version.definition) : version.definition;
                            if (def.nodes) setNodes(def.nodes);
                            if (def.edges) setEdges(def.edges);
                            setShowVersionHistory(false);
                        } catch (error) {
                            console.error('Failed to revert version:', error);
                        }
                    }}
                />
            )}
        </div>
    );
};
