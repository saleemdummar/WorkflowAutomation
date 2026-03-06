using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Jint;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.DTOs.Workflows;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    public class WorkflowService : IWorkflowService
    {
        private readonly IWorkflowRepository _workflowRepository;
        private readonly IRepository<WorkflowVersionHistory> _versionRepository;
        private readonly IRepository<WorkflowInstance> _instanceRepository;
        private readonly IRepository<WorkflowExecutionLog> _executionLogRepository;
        private readonly IRepository<FormSubmission> _submissionRepository;
        private readonly IRepository<WorkflowNode> _nodeRepository;
        private readonly IRepository<WorkflowEdge> _edgeRepository;
        private readonly IWorkflowDefinitionService _definitionService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ISystemLogService _systemLogService;
        private readonly IAuditLogService _auditLogService;
        private readonly ILogger<WorkflowService> _logger;

        private const string DesignerNodeIdKey = "designerNodeId";
        private const string DataKey = "data";

        public WorkflowService(
            IWorkflowRepository workflowRepository,
            IRepository<WorkflowVersionHistory> versionRepository,
            IRepository<WorkflowInstance> instanceRepository,
            IRepository<WorkflowExecutionLog> executionLogRepository,
            IRepository<FormSubmission> submissionRepository,
            IRepository<WorkflowNode> nodeRepository,
            IRepository<WorkflowEdge> edgeRepository,
            IWorkflowDefinitionService definitionService,
            IUnitOfWork unitOfWork,
            ISystemLogService systemLogService,
            IAuditLogService auditLogService,
            ILogger<WorkflowService> logger)
        {
            _workflowRepository = workflowRepository;
            _versionRepository = versionRepository;
            _instanceRepository = instanceRepository;
            _executionLogRepository = executionLogRepository;
            _submissionRepository = submissionRepository;
            _nodeRepository = nodeRepository;
            _edgeRepository = edgeRepository;
            _definitionService = definitionService;
            _unitOfWork = unitOfWork;
            _systemLogService = systemLogService;
            _auditLogService = auditLogService;
            _logger = logger;
        }

        public async Task<WorkflowDto> CreateWorkflowAsync(CreateWorkflowDto dto, string userId)
        {
            // Validate the workflow definition JSON
            if (string.IsNullOrWhiteSpace(dto.Definition))
            {
                throw new InvalidOperationException("Workflow definition is required");
            }

            try
            {
                var definition = JsonNode.Parse(dto.Definition)!.AsObject();
                var nodes = definition["nodes"] as JsonArray;
                if (nodes == null || !nodes.Any(n => n["type"]?.ToString() == "trigger"))
                {
                    throw new InvalidOperationException("Workflow must have at least one trigger node");
                }
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                throw new InvalidOperationException($"Workflow definition is not valid JSON: {ex.Message}");
            }

            var workflow = new Workflow
            {
                WorkflowName = dto.Name,
                WorkflowDescription = dto.Description,
                WorkflowDefinitionJson = dto.Definition,
                FormId = dto.FormId ?? ExtractFormIdFromDefinition(dto.Definition),
                WorkflowVersion = 1,
                CreatedBy = userId,
                LastModifiedBy = userId,
                IsActive = dto.IsActive,
                IsPublished = dto.IsPublished
            };

            await _workflowRepository.AddAsync(workflow);
            await _unitOfWork.CompleteAsync();

            var parsedDefinition = ParseAndValidateDefinition(dto.Definition);
            await SyncWorkflowGraphAsync(workflow.Id, parsedDefinition, userId);
            await _unitOfWork.CompleteAsync();

            workflow.WorkflowDefinitionJson = await BuildWorkflowDefinitionFromNormalizedAsync(workflow);
            await _workflowRepository.UpdateAsync(workflow);
            await _unitOfWork.CompleteAsync();

            // Create initial version history
            var version = new WorkflowVersionHistory
            {
                WorkflowId = workflow.Id,
                VersionNumber = 1,
                WorkflowDefinitionJson = workflow.WorkflowDefinitionJson,
                ChangeDescription = "Initial version",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            await _versionRepository.AddAsync(version);
            await _unitOfWork.CompleteAsync();

            // Log the creation
            await _systemLogService.LogInfoAsync("WorkflowService", $"Workflow '{dto.Name}' created by user {userId}");
            if (Guid.TryParse(userId, out var createdByGuid))
            {
                await _auditLogService.LogAsync(
                    "WorkflowCreated", "Workflow", workflow.Id, dto.Name,
                    createdByGuid, userId, string.Empty,
                    additionalInfo: $"Description: {dto.Description}");
            }

            return await BuildWorkflowDtoAsync(workflow);
        }

        public async Task<WorkflowDto> UpdateWorkflowAsync(Guid id, CreateWorkflowDto dto, string userId)
        {
            var workflow = await _workflowRepository.GetByIdAsync(id);
            if (workflow == null)
                throw new KeyNotFoundException($"Workflow with ID {id} not found");

            var parsedDefinition = ParseAndValidateDefinition(dto.Definition);
            var previousDefinitionJson = await BuildWorkflowDefinitionFromNormalizedAsync(workflow);

            await SyncWorkflowGraphAsync(workflow.Id, parsedDefinition, userId);
            await _unitOfWork.CompleteAsync();

            var normalizedDefinition = await BuildWorkflowDefinitionFromNormalizedAsync(workflow);

            // Create version history before update
            var newVersion = workflow.WorkflowVersion + 1;
            var versionHistory = new WorkflowVersionHistory
            {
                WorkflowId = workflow.Id,
                VersionNumber = newVersion,
                WorkflowDefinitionJson = normalizedDefinition,
                ChangeDescription = dto.ChangeDescription ?? $"Updated to version {newVersion}",
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };
            await _versionRepository.AddAsync(versionHistory);

            // Update workflow
            workflow.WorkflowName = dto.Name;
            workflow.WorkflowDescription = dto.Description;
            workflow.WorkflowDefinitionJson = normalizedDefinition;
            workflow.FormId = dto.FormId ?? ExtractFormIdFromDefinition(dto.Definition);
            workflow.WorkflowVersion = newVersion;
            workflow.IsPublished = dto.IsPublished;
            workflow.IsActive = dto.IsActive;
            await _workflowRepository.UpdateAsync(workflow);

            await _unitOfWork.CompleteAsync();

            // Log the update
            await _systemLogService.LogInfoAsync("WorkflowService", $"Workflow '{dto.Name}' updated to version {newVersion} by user {userId}");
            if (Guid.TryParse(userId, out var updatedByGuid))
            {
                await _auditLogService.LogAsync(
                    "WorkflowUpdated", "Workflow", workflow.Id, dto.Name,
                    updatedByGuid, userId, string.Empty,
                        oldValues: previousDefinitionJson,
                        newValues: normalizedDefinition,
                    additionalInfo: $"Version: {newVersion}, Description: {dto.ChangeDescription}");
            }

            return await BuildWorkflowDtoAsync(workflow);
        }

        public async Task DeleteWorkflowAsync(Guid id, string userId)
        {
            var workflow = await _workflowRepository.GetByIdAsync(id);
            if (workflow == null)
                throw new KeyNotFoundException($"Workflow with ID {id} not found");

            var workflowName = workflow.WorkflowName;
            await _workflowRepository.DeleteAsync(workflow);
            await _unitOfWork.CompleteAsync();

            // Log the deletion
            await _systemLogService.LogInfoAsync("WorkflowService", $"Workflow '{workflowName}' deleted by user {userId}");
            if (Guid.TryParse(userId, out var deletedByGuid))
            {
                await _auditLogService.LogAsync(
                    "WorkflowDeleted", "Workflow", id, workflowName ?? string.Empty,
                    deletedByGuid, userId, string.Empty,
                    additionalInfo: $"Workflow '{workflowName}' permanently deleted");
            }
        }

        public async Task<WorkflowDto> GetWorkflowByIdAsync(Guid id)
        {
            var workflow = await _workflowRepository.GetByIdAsync(id);
            if (workflow == null) return null;

            return await BuildWorkflowDtoAsync(workflow);
        }

        public async Task<IEnumerable<WorkflowDto>> GetAllWorkflowsAsync()
        {
            var workflows = await _workflowRepository.GetAllAsync();
            var dtos = new List<WorkflowDto>();
            foreach (var workflow in workflows)
            {
                dtos.Add(await BuildWorkflowDtoAsync(workflow));
            }

            return dtos;
        }

        public async Task<IEnumerable<WorkflowVersionDto>> GetWorkflowVersionsAsync(Guid workflowId)
        {
            var versions = await _versionRepository.FindAsync(v => v.WorkflowId == workflowId);
            return versions
                .OrderByDescending(v => v.VersionNumber)
                .Select(MapVersionToDto);
        }

        public async Task<WorkflowVersionDto> GetVersionByIdAsync(Guid versionId)
        {
            var version = await _versionRepository.GetByIdAsync(versionId);
            return version != null ? MapVersionToDto(version) : null;
        }

        public async Task<WorkflowDto> RollbackToVersionAsync(Guid workflowId, int versionNumber, string userId)
        {
            var workflow = await _workflowRepository.GetByIdAsync(workflowId);
            if (workflow == null)
                throw new KeyNotFoundException($"Workflow with ID {workflowId} not found");

            var versions = await _versionRepository.FindAsync(v => v.WorkflowId == workflowId && v.VersionNumber == versionNumber);
            var targetVersion = versions.FirstOrDefault();
            if (targetVersion == null)
                throw new KeyNotFoundException($"Version {versionNumber} not found for workflow");

            // Create new version for rollback
            var newVersion = workflow.WorkflowVersion + 1;
            var rollbackVersion = new WorkflowVersionHistory
            {
                WorkflowId = workflowId,
                VersionNumber = newVersion,
                WorkflowDefinitionJson = targetVersion.WorkflowDefinitionJson,
                ChangeDescription = $"Rolled back to version {versionNumber}",
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };
            await _versionRepository.AddAsync(rollbackVersion);

            // Update workflow
            var parsedDefinition = ParseAndValidateDefinition(targetVersion.WorkflowDefinitionJson);
            await SyncWorkflowGraphAsync(workflow.Id, parsedDefinition, userId);
            await _unitOfWork.CompleteAsync();

            workflow.WorkflowDefinitionJson = await BuildWorkflowDefinitionFromNormalizedAsync(workflow);
            workflow.WorkflowVersion = newVersion;
            await _workflowRepository.UpdateAsync(workflow);

            await _unitOfWork.CompleteAsync();

            return await BuildWorkflowDtoAsync(workflow);
        }

        public async Task<WorkflowVersionCompareDto> CompareVersionsAsync(Guid workflowId, int version1, int version2)
        {
            var versions = await _versionRepository.FindAsync(v => v.WorkflowId == workflowId && (v.VersionNumber == version1 || v.VersionNumber == version2));
            var v1 = versions.FirstOrDefault(v => v.VersionNumber == version1);
            var v2 = versions.FirstOrDefault(v => v.VersionNumber == version2);

            if (v1 == null || v2 == null)
                throw new KeyNotFoundException("One or both versions not found");

            var result = new WorkflowVersionCompareDto
            {
                Version1 = MapVersionToDto(v1),
                Version2 = MapVersionToDto(v2),
                AddedNodes = new string[0],
                RemovedNodes = new string[0],
                ModifiedNodes = new string[0],
                AddedEdges = new string[0],
                RemovedEdges = new string[0],
                Changes = Array.Empty<WorkflowChangeDto>()
            };

            try
            {
                var def1 = JsonNode.Parse(v1.WorkflowDefinitionJson)!.AsObject();
                var def2 = JsonNode.Parse(v2.WorkflowDefinitionJson)!.AsObject();

                var nodes1 = (def1["nodes"] as JsonArray)?.Select(n => n?["id"]?.ToString()).Where(id => id != null).ToHashSet() ?? new HashSet<string>();
                var nodes2 = (def2["nodes"] as JsonArray)?.Select(n => n?["id"]?.ToString()).Where(id => id != null).ToHashSet() ?? new HashSet<string>();

                result.AddedNodes = nodes2.Except(nodes1).ToArray();
                result.RemovedNodes = nodes1.Except(nodes2).ToArray();

                var commonNodeIds = nodes1.Intersect(nodes2);
                var modifiedNodeIds = new List<string>();
                var changes = new List<WorkflowChangeDto>();

                var nodeMap1 = (def1["nodes"] as JsonArray)?.ToDictionary(n => n?["id"]?.ToString() ?? "", n => n) ?? new Dictionary<string, JsonNode?>();
                var nodeMap2 = (def2["nodes"] as JsonArray)?.ToDictionary(n => n?["id"]?.ToString() ?? "", n => n) ?? new Dictionary<string, JsonNode?>();

                foreach (var nodeId in commonNodeIds)
                {
                    if (!nodeMap1.TryGetValue(nodeId, out var n1) || !nodeMap2.TryGetValue(nodeId, out var n2)) continue;
                    if (JsonNode.DeepEquals(n1, n2)) continue;

                    modifiedNodeIds.Add(nodeId);
                    var label = n2["data"]?["label"]?.ToString() ?? nodeId;

                    foreach (var prop in new[] { "type", "position" })
                    {
                        var val1 = n1[prop]?.ToString() ?? "";
                        var val2 = n2[prop]?.ToString() ?? "";
                        if (val1 != val2)
                            changes.Add(new WorkflowChangeDto { Path = $"nodes/{label}/{prop}", OldValue = val1, NewValue = val2 });
                    }

                    var data1 = n1?["data"] as JsonObject;
                    var data2 = n2?["data"] as JsonObject;
                    if (data1 != null && data2 != null)
                    {
                        var lbl1 = data1["label"]?.ToString() ?? "";
                        var lbl2 = data2["label"]?.ToString() ?? "";
                        if (lbl1 != lbl2)
                            changes.Add(new WorkflowChangeDto { Path = $"nodes/{label}/label", OldValue = lbl1, NewValue = lbl2 });

                        var cfg1 = data1["config"]?.ToString() ?? "{}";
                        var cfg2 = data2["config"]?.ToString() ?? "{}";
                        if (cfg1 != cfg2)
                            changes.Add(new WorkflowChangeDto { Path = $"nodes/{label}/config", OldValue = cfg1, NewValue = cfg2 });
                    }
                }

                result.ModifiedNodes = modifiedNodeIds.ToArray();

                var edges1 = (def1["edges"] as JsonArray)?.Select(e => $"{e?["source"]}->{e?["target"]}").Where(e => e != null).ToHashSet() ?? new HashSet<string>();
                var edges2 = (def2["edges"] as JsonArray)?.Select(e => $"{e?["source"]}->{e?["target"]}").Where(e => e != null).ToHashSet() ?? new HashSet<string>();

                result.AddedEdges = edges2.Except(edges1).ToArray();
                result.RemovedEdges = edges1.Except(edges2).ToArray();

                foreach (var node in result.AddedNodes)
                    changes.Add(new WorkflowChangeDto { Path = $"nodes/{node}", OldValue = "", NewValue = "added" });
                foreach (var node in result.RemovedNodes)
                    changes.Add(new WorkflowChangeDto { Path = $"nodes/{node}", OldValue = "removed", NewValue = "" });
                foreach (var edge in result.AddedEdges)
                    changes.Add(new WorkflowChangeDto { Path = $"edges/{edge}", OldValue = "", NewValue = "added" });
                foreach (var edge in result.RemovedEdges)
                    changes.Add(new WorkflowChangeDto { Path = $"edges/{edge}", OldValue = "removed", NewValue = "" });

                result.Changes = changes.ToArray();
            }
            catch (Exception ex)
            {
                result.Changes = new[] { new WorkflowChangeDto { Path = "error", OldValue = "", NewValue = $"Could not parse workflow definitions for comparison: {ex.Message}" } };
            }

            return result;
        }

        private async Task<WorkflowDto> BuildWorkflowDtoAsync(Workflow workflow)
        {
            var definition = await BuildWorkflowDefinitionFromNormalizedAsync(workflow);

            return new WorkflowDto
            {
                Id = workflow.Id,
                Name = workflow.WorkflowName,
                Description = workflow.WorkflowDescription,
                Definition = definition,
                Version = workflow.WorkflowVersion,
                IsActive = workflow.IsActive,
                IsPublished = workflow.IsPublished,
                FormId = workflow.FormId,
                CreatedDate = workflow.CreatedDate
            };
        }

        private static WorkflowNodeType ParseNodeType(string? nodeType)
        {
            return nodeType?.ToLowerInvariant() switch
            {
                "trigger" => WorkflowNodeType.Trigger,
                "condition" => WorkflowNodeType.Condition,
                "action" => WorkflowNodeType.Action,
                "approval" => WorkflowNodeType.Approval,
                "end" => WorkflowNodeType.End,
                "sendemail" => WorkflowNodeType.SendEmail,
                "wait" => WorkflowNodeType.Wait,
                "script" => WorkflowNodeType.Script,
                _ => WorkflowNodeType.Action
            };
        }

        private JsonObject ParseAndValidateDefinition(string definitionJson)
        {
            if (string.IsNullOrWhiteSpace(definitionJson))
            {
                throw new InvalidOperationException("Workflow definition is required");
            }

            JsonObject definition;
            try
            {
                definition = JsonNode.Parse(definitionJson)!.AsObject();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Workflow definition is not valid JSON: {ex.Message}");
            }

            if (!_definitionService.ValidateWorkflowDefinition(definition, out var validationErrors))
            {
                throw new InvalidOperationException($"Workflow definition is invalid: {string.Join(" | ", validationErrors)}");
            }

            return definition;
        }

        private async Task SyncWorkflowGraphAsync(Guid workflowId, JsonObject definition, string userId)
        {
            var existingEdges = (await _edgeRepository.FindAsync(e => e.WorkflowId == workflowId)).ToList();
            if (existingEdges.Any())
            {
                await _edgeRepository.DeleteRangeAsync(existingEdges);
            }

            var existingNodes = (await _nodeRepository.FindAsync(n => n.WorkflowId == workflowId)).ToList();
            if (existingNodes.Any())
            {
                await _nodeRepository.DeleteRangeAsync(existingNodes);
            }

            var nodeMap = new Dictionary<string, WorkflowNode>(StringComparer.OrdinalIgnoreCase);
            var nodes = definition["nodes"] as JsonArray ?? new JsonArray();

            foreach (var token in nodes.OfType<JsonObject>())
            {
                var designerNodeId = token["id"]?.ToString() ?? Guid.NewGuid().ToString();
                var data = (token[DataKey]?.DeepClone() as JsonObject) ?? new JsonObject();
                var node = new WorkflowNode
                {
                    WorkflowId = workflowId,
                    NodeType = ParseNodeType(token["type"]?.ToString()),
                    NodeName = data["label"]?.ToString() ?? token["type"]?.ToString() ?? "Node",
                    NodeConfigJson = new JsonObject
                    {
                        [DesignerNodeIdKey] = designerNodeId,
                        [DataKey] = data
                    }.ToJsonString(),
                    PositionX = token["position"]?["x"]?.GetValue<decimal>() ?? 0,
                    PositionY = token["position"]?["y"]?.GetValue<decimal>() ?? 0,
                    CreatedBy = userId,
                    LastModifiedBy = userId
                };

                await _nodeRepository.AddAsync(node);
                nodeMap[designerNodeId] = node;
            }

            var edges = definition["edges"] as JsonArray ?? new JsonArray();
            foreach (var token in edges.OfType<JsonObject>())
            {
                var sourceDesignerNodeId = token["source"]?.ToString();
                var targetDesignerNodeId = token["target"]?.ToString();
                if (string.IsNullOrWhiteSpace(sourceDesignerNodeId) || string.IsNullOrWhiteSpace(targetDesignerNodeId))
                {
                    continue;
                }

                if (!nodeMap.TryGetValue(sourceDesignerNodeId, out var sourceNode) ||
                    !nodeMap.TryGetValue(targetDesignerNodeId, out var targetNode))
                {
                    continue;
                }

                var edge = new WorkflowEdge
                {
                    WorkflowId = workflowId,
                    SourceNodeId = sourceNode.Id,
                    TargetNodeId = targetNode.Id,
                    EdgeLabel = token["label"]?.ToString() ?? string.Empty,
                    ConditionJson = token.ToJsonString(),
                    CreatedBy = userId,
                    LastModifiedBy = userId
                };

                await _edgeRepository.AddAsync(edge);
            }
        }

        private async Task<string> BuildWorkflowDefinitionFromNormalizedAsync(Workflow workflow)
        {
            var nodes = (await _nodeRepository.FindAsync(n => n.WorkflowId == workflow.Id)).ToList();
            if (!nodes.Any())
            {
                return workflow.WorkflowDefinitionJson;
            }

            var nodeMetadataById = new Dictionary<Guid, (string DesignerNodeId, JsonObject Data)>();
            var definitionNodes = new JsonArray();

            foreach (var node in nodes.OrderBy(n => n.CreatedDate))
            {
                var config = string.IsNullOrWhiteSpace(node.NodeConfigJson)
                    ? new JsonObject()
                    : JsonNode.Parse(node.NodeConfigJson)?.AsObject() ?? new JsonObject();

                var designerNodeId = config[DesignerNodeIdKey]?.ToString();
                if (string.IsNullOrWhiteSpace(designerNodeId))
                {
                    designerNodeId = node.Id.ToString();
                }

                var data = (config[DataKey]?.DeepClone() as JsonObject) ?? new JsonObject
                {
                    ["label"] = node.NodeName,
                    ["config"] = new JsonObject()
                };

                nodeMetadataById[node.Id] = (designerNodeId, data);

                definitionNodes.Add(new JsonObject
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

            var definitionEdges = new JsonArray();
            var edges = (await _edgeRepository.FindAsync(e => e.WorkflowId == workflow.Id)).ToList();
            foreach (var edge in edges.OrderBy(e => e.CreatedDate))
            {
                if (!nodeMetadataById.TryGetValue(edge.SourceNodeId, out var sourceNodeMeta) ||
                    !nodeMetadataById.TryGetValue(edge.TargetNodeId, out var targetNodeMeta))
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

                edgeObject["source"] = sourceNodeMeta.DesignerNodeId;
                edgeObject["target"] = targetNodeMeta.DesignerNodeId;
                if (edgeObject["label"] == null && !string.IsNullOrWhiteSpace(edge.EdgeLabel))
                {
                    edgeObject["label"] = edge.EdgeLabel;
                }

                definitionEdges.Add(edgeObject);
            }

            return new JsonObject
            {
                ["nodes"] = definitionNodes,
                ["edges"] = definitionEdges
            }.ToJsonString();
        }

        private static WorkflowVersionDto MapVersionToDto(WorkflowVersionHistory version)
        {
            return new WorkflowVersionDto
            {
                Id = version.Id,
                WorkflowId = version.WorkflowId,
                VersionNumber = version.VersionNumber,
                WorkflowDefinitionJson = version.WorkflowDefinitionJson,
                ChangeDescription = version.ChangeDescription,
                CreatedBy = version.CreatedBy,
                CreatedAt = version.CreatedAt
            };
        }


        public async Task<IEnumerable<WorkflowExecutionListItemDto>> GetExecutionsAsync()
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-90);
            var recentInstances = await _instanceRepository.FindAsync(i => i.StartedAt >= cutoffDate);
            var instances = recentInstances.OrderByDescending(i => i.StartedAt).Take(200).ToList();

            if (!instances.Any()) return Enumerable.Empty<WorkflowExecutionListItemDto>();
            var workflowIds = instances.Select(i => i.WorkflowId).Distinct().ToList();
            var submissionIds = instances.Where(i => i.SubmissionId.HasValue).Select(i => i.SubmissionId!.Value).Distinct().ToList();
            var instanceIds = instances.Select(i => i.Id).ToList();

            var workflows = (await _workflowRepository.FindAsync(w => workflowIds.Contains(w.Id)))
                .ToDictionary(w => w.Id);
            var submissions = (await _submissionRepository.FindAsync(s => submissionIds.Contains(s.Id)))
                .ToDictionary(s => s.Id);
            var logs = await _executionLogRepository.FindAsync(l => instanceIds.Contains(l.InstanceId));

            var list = new List<WorkflowExecutionListItemDto>();
            foreach (var instance in instances)
            {
                workflows.TryGetValue(instance.WorkflowId, out var workflow);
                FormSubmission? submission = null;
                if (instance.SubmissionId.HasValue) submissions.TryGetValue(instance.SubmissionId.Value, out submission);

                var (totalSteps, completedSteps, currentStep) = GetExecutionProgress(workflow?.WorkflowDefinitionJson, instance, logs);

                list.Add(new WorkflowExecutionListItemDto
                {
                    Id = instance.Id,
                    WorkflowId = instance.WorkflowId,
                    WorkflowName = workflow?.WorkflowName ?? "Unknown Workflow",
                    Status = NormalizeStatus(instance.InstanceStatus),
                    StartedAt = instance.StartedAt,
                    CompletedAt = instance.CompletedAt,
                    TriggeredBy = submission?.SubmittedBy.ToString() ?? "Unknown",
                    CurrentStep = currentStep,
                    TotalSteps = totalSteps,
                    CompletedSteps = completedSteps,
                    ErrorMessage = instance.ErrorMessage,
                    FormSubmissionId = submission?.Id
                });
            }

            return list;
        }

        public async Task<WorkflowExecutionDetailDto?> GetExecutionDetailAsync(Guid instanceId)
        {
            var instance = await _instanceRepository.GetByIdAsync(instanceId);
            if (instance == null) return null;

            var workflow = await _workflowRepository.GetByIdAsync(instance.WorkflowId);
            var submission = instance.SubmissionId.HasValue
                ? await _submissionRepository.GetByIdAsync(instance.SubmissionId.Value)
                : null;
            var allLogs = await _executionLogRepository.FindAsync(l => l.InstanceId == instance.Id);
            var instanceLogs = allLogs.OrderBy(l => l.ExecutedAt).ToList();

            var steps = BuildExecutionSteps(workflow?.WorkflowDefinitionJson, instance, instanceLogs);
            var executionLogs = instanceLogs.Select(l => new ExecutionLogEntryDto
            {
                Id = l.Id,
                Timestamp = l.ExecutedAt,
                Level = l.ExecutionStatus switch
                {
                    ExecutionStatus.Failed => "Error",
                    ExecutionStatus.Skipped => "Warning",
                    _ => "Info"
                },
                Message = l.ExecutionStatus switch
                {
                    ExecutionStatus.Completed => "Node completed",
                    ExecutionStatus.Failed => l.ErrorMessage ?? "Node failed",
                    ExecutionStatus.Skipped => "Node skipped",
                    _ => "Node started"
                },
                Data = string.IsNullOrWhiteSpace(l.OutputDataJson) ? null : l.OutputDataJson
            }).ToList();

            var context = new Dictionary<string, object>();
            if (submission?.SubmissionData != null)
            {
                foreach (var item in submission.SubmissionData)
                {
                    var key = item.Field?.FieldName;
                    if (string.IsNullOrWhiteSpace(key)) continue;
                    context[key] = item.FieldValue ?? "";
                }
            }

            return new WorkflowExecutionDetailDto
            {
                Id = instance.Id,
                WorkflowId = instance.WorkflowId,
                WorkflowName = workflow?.WorkflowName ?? "Unknown Workflow",
                Status = NormalizeStatus(instance.InstanceStatus),
                StartedAt = instance.StartedAt,
                CompletedAt = instance.CompletedAt,
                TriggeredBy = submission?.SubmittedBy.ToString() ?? "Unknown",
                FormSubmissionId = submission?.Id,
                ExecutionSteps = steps,
                Logs = executionLogs,
                Context = context
            };
        }

        public async Task<WorkflowDto> CloneWorkflowAsync(Guid workflowId, string userId)
        {
            var workflow = await _workflowRepository.GetByIdAsync(workflowId);
            if (workflow == null)
                throw new KeyNotFoundException($"Workflow with ID {workflowId} not found");

            var clone = new CreateWorkflowDto
            {
                Name = $"{workflow.WorkflowName} (Copy)",
                Description = workflow.WorkflowDescription,
                Definition = workflow.WorkflowDefinitionJson,
                IsActive = false,
                IsPublished = false,
                ChangeDescription = "Cloned workflow"
            };

            return await CreateWorkflowAsync(clone, userId);
        }


        public async Task<IEnumerable<WorkflowAnalyticsDto>> GetAnalyticsAsync()
        {
            var workflows = await _workflowRepository.GetAllAsync();
            var now = DateTime.UtcNow;
            var last30Days = now.AddDays(-30);

            var analytics = new List<WorkflowAnalyticsDto>();
            foreach (var workflow in workflows)
            {
                var workflowInstances = await _instanceRepository.FindAsync(i => i.WorkflowId == workflow.Id);
                var instanceList = workflowInstances.ToList();

                var completedCount = instanceList.Count(i => i.InstanceStatus == WorkflowInstanceStatus.Completed && i.CompletedAt.HasValue);
                var failedCount = instanceList.Count(i => i.InstanceStatus == WorkflowInstanceStatus.Failed || i.InstanceStatus == WorkflowInstanceStatus.Rejected || i.InstanceStatus == WorkflowInstanceStatus.Cancelled);
                var runningCount = instanceList.Count(i => i.InstanceStatus == WorkflowInstanceStatus.Running || i.InstanceStatus == WorkflowInstanceStatus.Pending);

                double averageDurationMs = 0;
                var completedInstances = instanceList.Where(i => i.InstanceStatus == WorkflowInstanceStatus.Completed && i.CompletedAt.HasValue).ToList();
                if (completedInstances.Any())
                    averageDurationMs = completedInstances.Average(i => (i.CompletedAt!.Value - i.StartedAt).TotalMilliseconds);

                var trend = instanceList
                    .Where(i => i.StartedAt >= last30Days)
                    .GroupBy(i => i.StartedAt.Date)
                    .Select(g => new ExecutionTrendDto
                    {
                        Date = g.Key,
                        Count = g.Count(),
                        SuccessCount = g.Count(x => x.InstanceStatus == WorkflowInstanceStatus.Completed),
                        FailedCount = g.Count(x => x.InstanceStatus == WorkflowInstanceStatus.Failed || x.InstanceStatus == WorkflowInstanceStatus.Rejected || x.InstanceStatus == WorkflowInstanceStatus.Cancelled)
                    })
                    .OrderBy(g => g.Date)
                    .ToList();

                // Only load execution logs for this workflow's instances
                var instanceIds = instanceList.Select(i => i.Id).ToHashSet();
                var workflowLogs = await _executionLogRepository.FindAsync(l => instanceIds.Contains(l.InstanceId) && l.Duration.HasValue);
                var nodeNameMap = BuildNodeNameMap(workflow.WorkflowDefinitionJson);

                var bottlenecks = workflowLogs
                    .GroupBy(l => l.NodeId)
                    .Select(g => new BottleneckDto
                    {
                        NodeName = nodeNameMap.TryGetValue(g.Key, out var name) ? name : g.Key.ToString(),
                        AverageDurationMs = g.Average(x => x.Duration ?? 0),
                        ExecutionCount = g.Count()
                    })
                    .OrderByDescending(b => b.AverageDurationMs)
                    .Take(5)
                    .ToList();

                var totalExecutions = instanceList.Count;
                var successRate = totalExecutions > 0 ? (double)completedCount / totalExecutions * 100 : 0;

                analytics.Add(new WorkflowAnalyticsDto
                {
                    WorkflowId = workflow.Id,
                    WorkflowName = workflow.WorkflowName,
                    Stats = new WorkflowStatsDto
                    {
                        TotalExecutions = totalExecutions,
                        SuccessfulExecutions = completedCount,
                        FailedExecutions = failedCount,
                        RunningExecutions = runningCount,
                        AverageDurationMs = Math.Round(averageDurationMs, 2),
                        SuccessRate = Math.Round(successRate, 1)
                    },
                    ExecutionTrend = trend,
                    TopBottlenecks = bottlenecks
                });
            }

            return analytics;
        }


        public async Task<WorkflowTestResult> TestWorkflowAsync(Guid workflowId, WorkflowTestRequest? request)
        {
            var workflow = await _workflowRepository.GetByIdAsync(workflowId);
            if (workflow == null)
                throw new KeyNotFoundException("Workflow not found");

            var testResult = new WorkflowTestResult
            {
                WorkflowId = workflowId,
                WorkflowName = workflow.WorkflowName,
                TestStartedAt = DateTime.UtcNow,
                SimulatedSteps = new List<SimulatedStep>(),
                ValidationErrors = new List<string>(),
                Warnings = new List<string>()
            };

            try
            {
                if (string.IsNullOrWhiteSpace(workflow.WorkflowDefinitionJson))
                {
                    testResult.ValidationErrors.Add("Workflow has no definition");
                    testResult.Success = false;
                    testResult.TestCompletedAt = DateTime.UtcNow;
                    return testResult;
                }

                var definition = JsonSerializer.Deserialize<WorkflowDefinitionDto>(
                    workflow.WorkflowDefinitionJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );

                if (definition?.Nodes == null || definition.Nodes.Count == 0)
                {
                    testResult.ValidationErrors.Add("Workflow definition has no nodes");
                    testResult.Success = false;
                    testResult.TestCompletedAt = DateTime.UtcNow;
                    return testResult;
                }

                var nodeIds = definition.Nodes.Select(n => n.Id).ToHashSet();

                var startNodes = definition.Nodes.Where(n =>
                    n.Type?.Equals("trigger", StringComparison.OrdinalIgnoreCase) == true ||
                    n.Type?.Equals("start", StringComparison.OrdinalIgnoreCase) == true ||
                    n.Type?.Equals("formTrigger", StringComparison.OrdinalIgnoreCase) == true
                ).ToList();

                if (startNodes.Count == 0)
                    testResult.ValidationErrors.Add("Workflow must have at least one start/trigger node");
                else if (startNodes.Count > 1)
                    testResult.Warnings.Add($"Workflow has {startNodes.Count} start nodes - only one will trigger");

                if (definition.Edges != null)
                {
                    foreach (var edge in definition.Edges)
                    {
                        if (!nodeIds.Contains(edge.Source))
                            testResult.ValidationErrors.Add($"Edge references non-existent source node: {edge.Source}");
                        if (!nodeIds.Contains(edge.Target))
                            testResult.ValidationErrors.Add($"Edge references non-existent target node: {edge.Target}");
                    }
                }

                if (definition.Edges != null && definition.Nodes.Count > 1)
                {
                    var connectedNodes = new HashSet<string>();
                    foreach (var edge in definition.Edges)
                    {
                        connectedNodes.Add(edge.Source);
                        connectedNodes.Add(edge.Target);
                    }

                    foreach (var node in definition.Nodes)
                    {
                        if (!connectedNodes.Contains(node.Id) && !startNodes.Any(s => s.Id == node.Id))
                            testResult.Warnings.Add($"Node '{node.Label ?? node.Id}' is not connected to the workflow");
                    }
                }

                int stepOrder = 0;
                foreach (var node in definition.Nodes.OrderBy(n => startNodes.Any(s => s.Id == n.Id) ? 0 : 1))
                {
                    var simulatedStep = new SimulatedStep
                    {
                        StepOrder = ++stepOrder,
                        NodeId = node.Id,
                        NodeType = node.Type ?? "unknown",
                        NodeLabel = node.Label ?? node.Id,
                        Status = "Simulated"
                    };

                    switch (node.Type?.ToLowerInvariant())
                    {
                        case "approval":
                            {
                                JsonObject? data = null;
                                if (node.Data is JsonObject jo) data = jo;
                                else if (node.Data is JsonElement je && je.ValueKind == JsonValueKind.Object) data = JsonObject.Create(je);

                                var assigneeId = data?["config"]?["approverId"]?.ToString() ?? data?["AssigneeId"]?.ToString();
                                var assigneeRoleId = data?["config"]?["approverRoleId"]?.ToString() ?? data?["AssigneeRoleId"]?.ToString();
                                var assigneeGroupId = data?["config"]?["approverGroupId"]?.ToString() ?? data?["AssigneeGroupId"]?.ToString();
                                if (string.IsNullOrWhiteSpace(assigneeId) && string.IsNullOrWhiteSpace(assigneeRoleId) && string.IsNullOrWhiteSpace(assigneeGroupId))
                                    testResult.Warnings.Add($"Approval node '{node.Label ?? node.Id}' has no assignee configured");
                                simulatedStep.SimulatedOutput = new { approvalResult = request?.SimulateApproval ?? "Approved" };
                            }
                            break;

                        case "condition":
                            {
                                JsonObject? data = null;
                                if (node.Data is JsonObject jo) data = jo;
                                else if (node.Data is JsonElement je && je.ValueKind == JsonValueKind.Object) data = JsonObject.Create(je);
                                var expression = data?["config"]?["condition"]?.ToString() ?? data?["Expression"]?.ToString();
                                if (string.IsNullOrWhiteSpace(expression))
                                {
                                    var field = data?["config"]?["field"]?.ToString() ?? data?["Field"]?.ToString();
                                    var op = data?["config"]?["operator"]?.ToString() ?? data?["Operator"]?.ToString();
                                    var value = data?["config"]?["value"]?.ToString() ?? data?["Value"]?.ToString();
                                    if (string.IsNullOrWhiteSpace(field) || string.IsNullOrWhiteSpace(op))
                                    {
                                        testResult.ValidationErrors.Add($"Condition node '{node.Label ?? node.Id}' has no expression");
                                    }
                                    else
                                    {
                                        if (request?.TestData == null)
                                        {
                                            testResult.Warnings.Add($"Condition node '{node.Label ?? node.Id}' uses field/operator/value but no test data provided.");
                                            simulatedStep.SimulatedOutput = new { conditionResult = "Unable to evaluate (no test data)" };
                                        }
                                        else
                                        {
                                            var simpleResult = EvaluateSimpleCondition(request.TestData, field, op, value);
                                            simulatedStep.SimulatedOutput = new { conditionResult = simpleResult };
                                        }
                                    }
                                }
                                else
                                {
                                    if (!IsValidJavaScriptExpression(expression))
                                    {
                                        testResult.Warnings.Add($"Condition expression may have issues: invalid JavaScript syntax");
                                        simulatedStep.SimulatedOutput = new { conditionResult = "Unable to evaluate" };
                                    }
                                    else if (TryEvaluateConditionExpression(expression, request?.TestData, out var result, out var error))
                                    {
                                        simulatedStep.SimulatedOutput = new { conditionResult = result };
                                    }
                                    else
                                    {
                                        if (!string.IsNullOrWhiteSpace(error))
                                        {
                                            testResult.Warnings.Add(error);
                                        }
                                        simulatedStep.SimulatedOutput = new { conditionResult = "Unable to evaluate" };
                                    }
                                }
                            }
                            break;

                        case "notification":
                        case "sendemail":
                            {
                                JsonObject? data = null;
                                if (node.Data is JsonObject jo) data = jo;
                                else if (node.Data is JsonElement je && je.ValueKind == JsonValueKind.Object) data = JsonObject.Create(je);

                                var recipients = data?["config"]?["recipients"] as JsonArray ?? data?["Recipients"] as JsonArray;
                                var recipientExpression = data?["config"]?["recipientExpression"]?.ToString() ?? data?["RecipientExpression"]?.ToString();
                                if (recipients == null && string.IsNullOrWhiteSpace(recipientExpression))
                                    testResult.Warnings.Add($"Notification node '{node.Label ?? node.Id}' has no recipients");
                                simulatedStep.SimulatedOutput = new { notificationSent = true };
                            }
                            break;

                        case "script":
                            {
                                JsonObject? data = null;
                                if (node.Data is JsonObject jo) data = jo;
                                else if (node.Data is JsonElement je && je.ValueKind == JsonValueKind.Object) data = JsonObject.Create(je);

                                var script = data?["config"]?["script"]?.ToString() ?? data?["Script"]?.ToString();
                                if (string.IsNullOrWhiteSpace(script))
                                {
                                    testResult.ValidationErrors.Add($"Script node '{node.Label ?? node.Id}' has no script");
                                }
                                else
                                {
                                    if (!IsValidJavaScriptBlock(script))
                                    {
                                        testResult.ValidationErrors.Add($"Script node '{node.Label ?? node.Id}' has syntax error");
                                        simulatedStep.Status = "ValidationFailed";
                                    }
                                    else
                                    {
                                        simulatedStep.SimulatedOutput = new { scriptExecuted = true };
                                    }
                                }
                            }
                            break;

                        default:
                            simulatedStep.SimulatedOutput = new { executed = true };
                            break;
                    }

                    testResult.SimulatedSteps.Add(simulatedStep);
                }

                testResult.Success = testResult.ValidationErrors.Count == 0;
                testResult.TestCompletedAt = DateTime.UtcNow;
                testResult.Message = testResult.Success
                    ? $"Workflow validation passed with {testResult.Warnings.Count} warning(s)"
                    : $"Workflow validation failed with {testResult.ValidationErrors.Count} error(s)";
            }
            catch (Exception ex)
            {
                testResult.Success = false;
                testResult.ValidationErrors.Add($"Test execution failed: {ex.Message}");
                testResult.TestCompletedAt = DateTime.UtcNow;
            }

            return testResult;
        }

        private static bool EvaluateSimpleCondition(Dictionary<string, object> testData, string field, string op, string? value)
        {
            if (!testData.TryGetValue(field, out var raw))
            {
                // Try fields map if present
                if (testData.TryGetValue("fields", out var fieldsObj) && fieldsObj is Dictionary<string, object> fields && fields.TryGetValue(field, out var inner))
                {
                    raw = inner;
                }
                else
                {
                    return false;
                }
            }

            var actual = raw?.ToString() ?? string.Empty;
            var expected = value ?? string.Empty;

            return op.ToLowerInvariant() switch
            {
                "equals" => string.Equals(actual, expected, StringComparison.OrdinalIgnoreCase),
                "notequals" => !string.Equals(actual, expected, StringComparison.OrdinalIgnoreCase),
                "contains" => actual.Contains(expected, StringComparison.OrdinalIgnoreCase),
                "greaterthan" => double.TryParse(actual, out var a) && double.TryParse(expected, out var b) && a > b,
                "lessthan" => double.TryParse(actual, out var c) && double.TryParse(expected, out var d) && c < d,
                _ => false
            };
        }


        private (int TotalSteps, int CompletedSteps, string CurrentStep) GetExecutionProgress(string? definitionJson, WorkflowInstance instance, IEnumerable<WorkflowExecutionLog> allLogs)
        {
            if (string.IsNullOrWhiteSpace(definitionJson))
                return (0, 0, string.Empty);

            try
            {
                var definition = JsonNode.Parse(definitionJson)!.AsObject();
                var nodes = (definition["nodes"] as JsonArray) ?? new JsonArray();
                var nodeList = nodes.Where(n => n?["type"]?.ToString()?.ToLower() != "trigger").ToList();

                var logs = allLogs.Where(l => l.InstanceId == instance.Id).ToList();
                var completedSteps = logs.Count(l => l.ExecutionStatus == ExecutionStatus.Completed);

                string currentStep = string.Empty;
                if (instance.CurrentNodeId.HasValue)
                {
                    currentStep = nodeList.FirstOrDefault(n =>
                        Guid.TryParse(n?["id"]?.ToString(), out var nid) && nid == instance.CurrentNodeId)?["data"]?["label"]?.ToString()
                        ?? string.Empty;
                }

                return (nodeList.Count, completedSteps, currentStep);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to compute execution progress from workflow definition");
                return (0, 0, string.Empty);
            }
        }

        private static bool IsValidJavaScriptExpression(string expression)
        {
            try
            {
                var engine = CreateSandboxedEngine();
                engine.Execute($"(function() {{ return ({expression}); }})();");
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static bool IsValidJavaScriptBlock(string script)
        {
            try
            {
                var engine = CreateSandboxedEngine();
                engine.Execute($"(function() {{ {script} }})();");
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static Engine CreateSandboxedEngine()
        {
            return new Engine(options =>
            {
                options.Strict();
                options.TimeoutInterval(TimeSpan.FromSeconds(2));
                options.MaxStatements(400);
                options.LimitMemory(2_000_000);
                options.LimitRecursion(80);
            });
        }

        private static bool TryEvaluateConditionExpression(string expression, Dictionary<string, object>? testData, out bool? result, out string? error)
        {
            result = null;
            error = null;

            try
            {
                if (testData == null)
                {
                    return false;
                }

                var engine = CreateSandboxedEngine();
                foreach (var kvp in testData)
                {
                    engine.SetValue(kvp.Key, kvp.Value);
                }
                engine.SetValue("fields", testData);

                var evalResult = engine.Evaluate($"(function() {{ return ({expression}); }})();");
                if (evalResult.IsBoolean())
                {
                    result = evalResult.AsBoolean();
                }
                else if (evalResult.IsNumber())
                {
                    result = evalResult.AsNumber() != 0;
                }
                else if (evalResult.IsString())
                {
                    result = !string.IsNullOrWhiteSpace(evalResult.AsString());
                }
                else
                {
                    result = evalResult.IsNull() || evalResult.IsUndefined() ? false : Convert.ToBoolean(evalResult.ToObject());
                }

                return true;
            }
            catch (Exception ex)
            {
                error = $"Condition evaluation failed in test run: {ex.Message}";
                return false;
            }
        }

        private List<ExecutionStepDto> BuildExecutionSteps(string? definitionJson, WorkflowInstance instance, IEnumerable<WorkflowExecutionLog> logs)
        {
            var steps = new List<ExecutionStepDto>();
            if (string.IsNullOrWhiteSpace(definitionJson)) return steps;

            var logLookup = logs.ToDictionary(l => l.NodeId, l => l);

            try
            {
                var definition = JsonNode.Parse(definitionJson)!.AsObject();
                var nodes = (definition["nodes"] as JsonArray) ?? new JsonArray();
                foreach (var node in nodes.Where(n => n?["type"]?.ToString()?.ToLower() != "trigger"))
                {
                    var nodeIdStr = node?["id"]?.ToString() ?? string.Empty;
                    Guid.TryParse(nodeIdStr, out var nodeId);

                    var status = "Pending";
                    string? errorMessage = null;
                    DateTime? startedAt = null;
                    DateTime? completedAt = null;

                    if (logLookup.TryGetValue(nodeId, out var log))
                    {
                        status = log.ExecutionStatus switch
                        {
                            ExecutionStatus.Completed => "Completed",
                            ExecutionStatus.Failed => "Failed",
                            ExecutionStatus.Skipped => "Skipped",
                            _ => "Pending"
                        };
                        completedAt = log.ExecutedAt;
                        if (log.Duration.HasValue)
                            startedAt = log.ExecutedAt.AddMilliseconds(-log.Duration.Value);
                        errorMessage = log.ErrorMessage;
                    }
                    else if (instance.CurrentNodeId.HasValue && nodeId != Guid.Empty && instance.CurrentNodeId == nodeId)
                    {
                        status = "Running";
                        startedAt = instance.StartedAt;
                    }

                    object? output = null;
                    if (logLookup.TryGetValue(nodeId, out var executionLog) && !string.IsNullOrWhiteSpace(executionLog.OutputDataJson))
                    {
                        try { output = JsonNode.Parse(executionLog.OutputDataJson); }
                        catch (Exception ex) { _logger.LogWarning(ex, "Failed to parse output JSON for node {NodeId}", nodeIdStr); output = executionLog.OutputDataJson; }
                    }

                    steps.Add(new ExecutionStepDto
                    {
                        Id = nodeIdStr,
                        NodeId = nodeIdStr,
                        NodeName = node?["data"]?["label"]?.ToString() ?? node?["type"]?.ToString(),
                        NodeType = node?["type"]?.ToString(),
                        Status = status,
                        StartedAt = startedAt,
                        CompletedAt = completedAt,
                        Output = output,
                        ErrorMessage = errorMessage
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to build execution steps for workflow instance");
            }

            return steps;
        }

        private Dictionary<Guid, string> BuildNodeNameMap(string? definitionJson)
        {
            var map = new Dictionary<Guid, string>();
            if (string.IsNullOrWhiteSpace(definitionJson)) return map;

            try
            {
                var definition = JsonNode.Parse(definitionJson)!.AsObject();
                var nodes = (definition["nodes"] as JsonArray) ?? new JsonArray();
                foreach (var node in nodes)
                {
                    if (Guid.TryParse(node?["id"]?.ToString(), out var nodeId))
                        map[nodeId] = node?["data"]?["label"]?.ToString() ?? node?["type"]?.ToString() ?? nodeId.ToString();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to build node name map from workflow definition");
            }

            return map;
        }

        private static string NormalizeStatus(WorkflowInstanceStatus status) => status switch
        {
            WorkflowInstanceStatus.Running => "Running",
            WorkflowInstanceStatus.Completed => "Completed",
            WorkflowInstanceStatus.Failed => "Failed",
            WorkflowInstanceStatus.Rejected => "Rejected",
            WorkflowInstanceStatus.Cancelled => "Cancelled",
            WorkflowInstanceStatus.Pending => "Pending",
            _ => status.ToString()
        };

        private static Guid? ExtractFormIdFromDefinition(string? definitionJson)
        {
            if (string.IsNullOrWhiteSpace(definitionJson)) return null;

            try
            {
                var definition = JsonNode.Parse(definitionJson)!.AsObject();
                var nodes = definition["nodes"] as JsonArray;
                if (nodes == null) return null;

                var triggerNode = nodes.FirstOrDefault(n =>
                    n?["type"]?.ToString()?.Equals("trigger", StringComparison.OrdinalIgnoreCase) == true);
                if (triggerNode == null) return null;

                var config = triggerNode["data"]?["config"];
                var formIdStr = config?["formId"]?.ToString();

                if (!string.IsNullOrWhiteSpace(formIdStr) && Guid.TryParse(formIdStr, out var formId))
                    return formId;
            }
            catch { }

            return null;
        }


        public async Task<WorkflowExportDto> ExportWorkflowAsync(Guid workflowId)
        {
            var workflow = await _workflowRepository.GetByIdAsync(workflowId);
            if (workflow == null)
                throw new KeyNotFoundException($"Workflow {workflowId} not found");

            return new WorkflowExportDto
            {
                ExportVersion = "1.0",
                ExportedAt = DateTime.UtcNow,
                Name = workflow.WorkflowName,
                Description = workflow.WorkflowDescription,
                Definition = workflow.WorkflowDefinitionJson,
                Version = workflow.WorkflowVersion
            };
        }

        public async Task<WorkflowDto> ImportWorkflowAsync(WorkflowImportDto dto, string userId)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Imported workflow must have a name");

            if (string.IsNullOrWhiteSpace(dto.Definition))
                throw new ArgumentException("Imported workflow must have a definition");

            try { System.Text.Json.JsonDocument.Parse(dto.Definition); }
            catch { throw new ArgumentException("Imported workflow definition is not valid JSON"); }

            var createDto = new CreateWorkflowDto
            {
                Name = $"{dto.Name} (Imported)",
                Description = dto.Description ?? "",
                Definition = dto.Definition,
                IsActive = true,
                IsPublished = false,
                ChangeDescription = "Imported workflow"
            };

            return await CreateWorkflowAsync(createDto, userId);
        }
    }
}
