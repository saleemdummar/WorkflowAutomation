using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    /// <summary>
    /// Handles workflow definition loading, building from normalized graph, and validation.
    /// Extracted from WorkflowEngine to separate definition concerns from execution logic.
    /// </summary>
    public class WorkflowDefinitionService : IWorkflowDefinitionService
    {
        private const string DesignerNodeIdKey = "designerNodeId";
        private const string DataKey = "data";

        private readonly IWorkflowRepository _workflowRepository;

        public WorkflowDefinitionService(IWorkflowRepository workflowRepository)
        {
            _workflowRepository = workflowRepository;
        }

        public async Task<JsonObject?> LoadRuntimeDefinitionAsync(Workflow workflow)
        {
            var workflowWithGraph = await _workflowRepository.GetWorkflowWithNodesAsync(workflow.Id);
            if (workflowWithGraph?.Nodes != null && workflowWithGraph.Nodes.Any())
            {
                var normalizedDefinition = BuildDefinitionFromNormalizedGraph(workflowWithGraph);
                if (normalizedDefinition != null)
                {
                    return normalizedDefinition;
                }
            }

            if (string.IsNullOrWhiteSpace(workflow.WorkflowDefinitionJson))
            {
                return null;
            }

            try
            {
                return JsonNode.Parse(workflow.WorkflowDefinitionJson)?.AsObject();
            }
            catch
            {
                return null;
            }
        }

        public JsonObject? BuildDefinitionFromNormalizedGraph(Workflow workflow)
        {
            if (workflow.Nodes == null || !workflow.Nodes.Any())
            {
                return null;
            }

            var nodeMetadata = new Dictionary<Guid, (string DesignerNodeId, JsonObject Data)>();
            var nodesArray = new JsonArray();

            foreach (var node in workflow.Nodes.OrderBy(n => n.CreatedDate))
            {
                JsonObject nodeConfig;
                try
                {
                    nodeConfig = string.IsNullOrWhiteSpace(node.NodeConfigJson)
                        ? new JsonObject()
                        : JsonNode.Parse(node.NodeConfigJson)?.AsObject() ?? new JsonObject();
                }
                catch
                {
                    nodeConfig = new JsonObject();
                }

                var designerNodeId = nodeConfig[DesignerNodeIdKey]?.ToString();
                if (string.IsNullOrWhiteSpace(designerNodeId))
                {
                    designerNodeId = node.Id.ToString();
                }

                var data = (nodeConfig[DataKey]?.DeepClone() as JsonObject) ?? new JsonObject
                {
                    ["label"] = node.NodeName ?? node.NodeType.ToString(),
                    ["config"] = new JsonObject()
                };

                nodeMetadata[node.Id] = (designerNodeId, data);

                nodesArray.Add(new JsonObject
                {
                    ["id"] = designerNodeId,
                    ["type"] = node.NodeType.ToString().ToLowerInvariant(),
                    ["position"] = new JsonObject
                    {
                        ["x"] = node.PositionX,
                        ["y"] = node.PositionY
                    },
                    ["data"] = data
                });
            }

            var edgesArray = new JsonArray();
            foreach (var edge in (workflow.Edges ?? Array.Empty<WorkflowEdge>()).OrderBy(e => e.CreatedDate))
            {
                if (!nodeMetadata.TryGetValue(edge.SourceNodeId, out var sourceNode) ||
                    !nodeMetadata.TryGetValue(edge.TargetNodeId, out var targetNode))
                {
                    continue;
                }

                JsonObject edgeObject;
                try
                {
                    edgeObject = string.IsNullOrWhiteSpace(edge.ConditionJson)
                        ? new JsonObject()
                        : JsonNode.Parse(edge.ConditionJson)?.AsObject() ?? new JsonObject();
                }
                catch
                {
                    edgeObject = new JsonObject();
                }

                edgeObject["source"] = sourceNode.DesignerNodeId;
                edgeObject["target"] = targetNode.DesignerNodeId;
                if (edgeObject["label"] == null && !string.IsNullOrWhiteSpace(edge.EdgeLabel))
                {
                    edgeObject["label"] = edge.EdgeLabel;
                }

                edgesArray.Add(edgeObject);
            }

            return new JsonObject
            {
                ["nodes"] = nodesArray,
                ["edges"] = edgesArray
            };
        }

        public bool ValidateWorkflowDefinition(JsonObject definition, out List<string> errors)
        {
            errors = new List<string>();

            if (definition == null)
            {
                errors.Add("Workflow definition is null.");
                return false;
            }

            var nodes = definition["nodes"] as JsonArray;
            if (nodes == null || !nodes.Any())
            {
                errors.Add("Workflow definition must include a non-empty nodes array.");
                return false;
            }

            var nodeIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var node in nodes)
            {
                var nodeId = node["id"]?.ToString();
                if (string.IsNullOrWhiteSpace(nodeId))
                {
                    errors.Add("Node is missing an id.");
                    continue;
                }

                if (!nodeIds.Add(nodeId))
                {
                    errors.Add($"Duplicate node id '{nodeId}'.");
                }
                if (!Guid.TryParse(nodeId, out _))
                {
                    errors.Add($"Node '{nodeId}' id must be a valid GUID.");
                }

                var nodeType = node["type"]?.ToString()?.ToLower();
                if (string.IsNullOrWhiteSpace(nodeType))
                {
                    errors.Add($"Node '{nodeId}' is missing a type.");
                    continue;
                }

                if (!IsSupportedNodeType(nodeType))
                {
                    errors.Add($"Node '{nodeId}' has unsupported type '{nodeType}'.");
                    continue;
                }

                ValidateNodeConfig(node, nodeType, nodeId, errors);
            }

            if (!nodes.Any(n => n?["type"]?.ToString()?.Equals("trigger", StringComparison.OrdinalIgnoreCase) == true))
            {
                errors.Add("Workflow must contain at least one trigger node.");
            }

            var edges = definition["edges"] as JsonArray;
            if (edges != null)
            {
                foreach (var edge in edges)
                {
                    var source = edge["source"]?.ToString();
                    var target = edge["target"]?.ToString();

                    if (string.IsNullOrWhiteSpace(source) || string.IsNullOrWhiteSpace(target))
                    {
                        errors.Add("Edge must include both source and target.");
                        continue;
                    }

                    if (!nodeIds.Contains(source))
                    {
                        errors.Add($"Edge source '{source}' does not match any node id.");
                    }

                    if (!nodeIds.Contains(target))
                    {
                        errors.Add($"Edge target '{target}' does not match any node id.");
                    }
                }
            }

            return errors.Count == 0;
        }

        public bool IsTriggerMatch(JsonNode triggerNode, Guid formId)
        {
            var config = GetNodeConfig(triggerNode);
            var triggerType = config?["triggerType"]?.ToString() ?? "form_submission";
            var formIdConfig = config?["formId"]?.ToString();

            if (!string.IsNullOrWhiteSpace(formIdConfig) && Guid.TryParse(formIdConfig, out var configuredFormId))
            {
                if (configuredFormId != formId) return false;
            }

            return triggerType == "form_submission";
        }

        public JsonObject? GetNodeConfig(JsonNode node)
        {
            var data = node["data"];
            if (data == null) return null;
            var config = data["config"] ?? data;
            return config as JsonObject;
        }

        #region Private validation helpers

        private static bool IsSupportedNodeType(string nodeType)
        {
            return nodeType switch
            {
                "trigger" => true,
                "condition" => true,
                "action" => true,
                "approval" => true,
                "end" => true,
                "sendemail" => true,
                "wait" => true,
                "script" => true,
                _ => false
            };
        }

        private void ValidateNodeConfig(JsonNode node, string nodeType, string nodeId, List<string> errors)
        {
            var config = GetNodeConfig(node);
            if (config == null && nodeType != "end" && nodeType != "wait")
            {
                errors.Add($"Node '{nodeId}' of type '{nodeType}' is missing config.");
                return;
            }

            switch (nodeType)
            {
                case "trigger":
                    ValidateTriggerConfig(config, nodeId, errors);
                    break;
                case "condition":
                    ValidateConditionConfig(config, nodeId, errors);
                    break;
                case "action":
                    ValidateActionConfig(config, nodeId, errors);
                    break;
                case "approval":
                    ValidateApprovalConfig(config, nodeId, errors);
                    break;
                case "sendemail":
                    if (string.IsNullOrWhiteSpace(config?["toEmail"]?.ToString()))
                        errors.Add($"SendEmail node '{nodeId}' is missing toEmail.");
                    break;
                case "wait":
                    // Wait node config is optional (defaults to 0 delay)
                    break;
                case "script":
                    if (string.IsNullOrWhiteSpace(config?["script"]?.ToString()))
                        errors.Add($"Script node '{nodeId}' is missing script code.");
                    break;
            }
        }

        private static void ValidateTriggerConfig(JsonObject? config, string nodeId, List<string> errors)
        {
            var triggerType = config?["triggerType"]?.ToString();
            if (string.IsNullOrWhiteSpace(triggerType))
            {
                triggerType = "form_submission";
            }
            if (!new[] { "form_submission", "schedule", "field_change" }.Contains(triggerType, StringComparer.OrdinalIgnoreCase))
            {
                errors.Add($"Trigger node '{nodeId}' has unsupported triggerType '{triggerType}'.");
            }
            if (triggerType.Equals("schedule", StringComparison.OrdinalIgnoreCase))
            {
                var cronExpression = config?["cronExpression"]?.ToString();
                if (string.IsNullOrWhiteSpace(cronExpression))
                {
                    errors.Add($"Trigger node '{nodeId}' is missing cronExpression for schedule trigger.");
                }
            }
            if (triggerType.Equals("field_change", StringComparison.OrdinalIgnoreCase))
            {
                errors.Add($"Trigger node '{nodeId}' uses field_change which is not supported yet.");
            }
            var formId = config?["formId"]?.ToString();
            if (!string.IsNullOrWhiteSpace(formId) && !Guid.TryParse(formId, out _))
            {
                errors.Add($"Trigger node '{nodeId}' has invalid formId '{formId}'.");
            }
        }

        private static void ValidateConditionConfig(JsonObject? config, string nodeId, List<string> errors)
        {
            var condition = config?["condition"]?.ToString();
            var field = config?["field"]?.ToString();
            var op = config?["operator"]?.ToString();
            var value = config?["value"]?.ToString();

            var hasExpression = !string.IsNullOrWhiteSpace(condition);
            var hasFieldCondition = !string.IsNullOrWhiteSpace(field) || !string.IsNullOrWhiteSpace(op) || !string.IsNullOrWhiteSpace(value);

            if (!hasExpression && !hasFieldCondition)
            {
                errors.Add($"Condition node '{nodeId}' must include a condition expression or field/operator/value configuration.");
            }
            if (hasFieldCondition)
            {
                if (string.IsNullOrWhiteSpace(field))
                    errors.Add($"Condition node '{nodeId}' is missing field.");
                if (string.IsNullOrWhiteSpace(op))
                    errors.Add($"Condition node '{nodeId}' is missing operator.");
                if (string.IsNullOrWhiteSpace(value))
                    errors.Add($"Condition node '{nodeId}' is missing value.");
            }
        }

        private static void ValidateActionConfig(JsonObject? config, string nodeId, List<string> errors)
        {
            var actionType = config?["actionType"]?.ToString();
            if (string.IsNullOrWhiteSpace(actionType))
            {
                errors.Add($"Action node '{nodeId}' is missing actionType.");
                return;
            }

            switch (actionType.ToLower())
            {
                case "send_email":
                    if (string.IsNullOrWhiteSpace(config?["toEmail"]?.ToString()))
                        errors.Add($"Action node '{nodeId}' of type 'send_email' is missing toEmail.");
                    break;
                case "update_field":
                    if (string.IsNullOrWhiteSpace(config?["fieldName"]?.ToString()))
                        errors.Add($"Action node '{nodeId}' of type 'update_field' is missing fieldName.");
                    break;
                case "webhook":
                    if (string.IsNullOrWhiteSpace(config?["webhookUrl"]?.ToString()))
                        errors.Add($"Action node '{nodeId}' of type 'webhook' is missing webhookUrl.");
                    break;
                case "update_status":
                    if (string.IsNullOrWhiteSpace(config?["status"]?.ToString()))
                        errors.Add($"Action node '{nodeId}' of type 'update_status' is missing status.");
                    break;
                default:
                    errors.Add($"Action node '{nodeId}' has unsupported actionType '{actionType}'.");
                    break;
            }
        }

        private static void ValidateApprovalConfig(JsonObject? config, string nodeId, List<string> errors)
        {
            var stepsToken = config?["steps"] as JsonArray;
            if (stepsToken != null && stepsToken.Any())
            {
                for (var index = 0; index < stepsToken.Count; index++)
                {
                    var step = stepsToken[index];
                    var stepName = step?["stepName"]?.ToString() ?? $"Step {index + 1}";
                    ValidateApprovalStepConfig(step, nodeId, stepName, errors);
                }
            }
            else
            {
                // Single-step fallback
                ValidateApprovalStepConfig(config, nodeId, null, errors);
            }
        }

        private static void ValidateApprovalStepConfig(JsonNode? config, string nodeId, string? stepName, List<string> errors)
        {
            var prefix = stepName != null ? $"Approval node '{nodeId}' step '{stepName}'" : $"Approval node '{nodeId}'";
            var approverType = config?["approverType"]?.ToString();
            var approverId = config?["approverId"]?.ToString();
            var approvalType = config?["approvalType"]?.ToString();
            var deadlineHours = config?["deadlineHours"]?.ToString();
            var dueDays = config?["dueDays"]?.ToString();

            if (string.IsNullOrWhiteSpace(approverType))
            {
                errors.Add($"{prefix} is missing approverType.");
            }
            else if (approverType != "user" && approverType != "role" && approverType != "group")
            {
                errors.Add($"{prefix} has unsupported approverType '{approverType}'.");
            }

            if (string.IsNullOrWhiteSpace(approverId))
            {
                errors.Add($"{prefix} is missing approverId.");
            }

            if (!string.IsNullOrWhiteSpace(approvalType) && approvalType != "any" && approvalType != "all" && approvalType != "majority")
            {
                errors.Add($"{prefix} has unsupported approvalType '{approvalType}'.");
            }

            if (!string.IsNullOrWhiteSpace(deadlineHours) && (!int.TryParse(deadlineHours, out var hours) || hours <= 0))
            {
                errors.Add($"{prefix} has invalid deadlineHours '{deadlineHours}'.");
            }

            if (!string.IsNullOrWhiteSpace(dueDays) && (!int.TryParse(dueDays, out var days) || days <= 0))
            {
                errors.Add($"{prefix} has invalid dueDays '{dueDays}'.");
            }
        }

        #endregion
    }
}
