using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Hangfire;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    public class WorkflowEngine : IWorkflowEngine
    {
        private readonly IWorkflowRepository _workflowRepository;
        private readonly IRepository<WorkflowInstance> _instanceRepository;
        private readonly IFormSubmissionRepository _submissionRepository;
        private readonly IRepository<Form> _formRepository;
        private readonly IRepository<ApprovalTask> _approvalRepository;
        private readonly IRepository<ApprovalHistory> _approvalHistoryRepository;
        private readonly IRepository<ApprovalStep> _approvalStepRepository;
        private readonly IRepository<WorkflowExecutionLog> _executionLogRepository;
        private readonly IJintExecutionService _jintService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly INotificationHubService _notificationHub;
        private readonly IEmailService _emailService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IUserAdminService _userAdmin;
        private readonly IBackgroundJobClient _backgroundJobClient;
        private readonly IWorkflowDefinitionService _definitionService;
        private readonly ILogger<WorkflowEngine> _logger;

        public WorkflowEngine(
            IWorkflowRepository workflowRepository,
            IRepository<WorkflowInstance> instanceRepository,
            IFormSubmissionRepository submissionRepository,
            IRepository<Form> formRepository,
            IRepository<ApprovalTask> approvalRepository,
            IRepository<ApprovalHistory> approvalHistoryRepository,
            IRepository<ApprovalStep> approvalStepRepository,
            IRepository<WorkflowExecutionLog> executionLogRepository,
            IJintExecutionService jintService,
            IUnitOfWork unitOfWork,
            INotificationHubService notificationHub,
            IEmailService emailService,
            IHttpClientFactory httpClientFactory,
            IUserAdminService userAdmin,
            IBackgroundJobClient backgroundJobClient,
            IWorkflowDefinitionService definitionService,
            ILogger<WorkflowEngine> logger)
        {
            _workflowRepository = workflowRepository;
            _instanceRepository = instanceRepository;
            _submissionRepository = submissionRepository;
            _formRepository = formRepository;
            _approvalRepository = approvalRepository;
            _approvalHistoryRepository = approvalHistoryRepository;
            _approvalStepRepository = approvalStepRepository;
            _executionLogRepository = executionLogRepository;
            _jintService = jintService;
            _unitOfWork = unitOfWork;
            _notificationHub = notificationHub;
            _emailService = emailService;
            _httpClientFactory = httpClientFactory;
            _userAdmin = userAdmin;
            _backgroundJobClient = backgroundJobClient;
            _definitionService = definitionService;
            _logger = logger;
        }

        public async Task TriggerWorkflowAsync(Guid submissionId)
        {
            _logger.LogInformation("TriggerWorkflowAsync called for submission {SubmissionId}", submissionId);

            var submission = await _submissionRepository.GetSubmissionWithDataAsync(submissionId);
            if (submission == null)
            {
                _logger.LogWarning("Submission {SubmissionId} not found, aborting workflow trigger", submissionId);
                return;
            }

            _logger.LogInformation("Submission {SubmissionId} found for FormId {FormId}", submissionId, submission.FormId);

            // Search for workflows by FormId match, plus workflows without FormId that may have it in trigger config
            var candidateWorkflows = await _workflowRepository.FindAsync(w =>
                w.IsActive && w.IsPublished &&
                (w.FormId == submission.FormId || w.FormId == null));

            _logger.LogInformation("Found {Count} candidate workflows (IsActive && IsPublished) for FormId {FormId}", candidateWorkflows.Count(), submission.FormId);

            // If no published workflows found, log all workflows for this form for debugging
            if (!candidateWorkflows.Any())
            {
                var allForForm = await _workflowRepository.FindAsync(w => w.FormId == submission.FormId);
                foreach (var w in allForForm)
                {
                    _logger.LogWarning("Workflow {WorkflowId} '{Name}' for FormId {FormId}: IsActive={IsActive}, IsPublished={IsPublished}",
                        w.Id, w.WorkflowName, w.FormId, w.IsActive, w.IsPublished);
                }
            }

            foreach (var workflow in candidateWorkflows)
            {
                _logger.LogInformation("Evaluating workflow {WorkflowId} '{Name}' (FormId={FormId}) for submission {SubmissionId}",
                    workflow.Id, workflow.WorkflowName, workflow.FormId, submissionId);

                var definition = await _definitionService.LoadRuntimeDefinitionAsync(workflow);
                if (definition == null)
                {
                    _logger.LogWarning("Workflow {WorkflowId} '{Name}' has no valid definition", workflow.Id, workflow.WorkflowName);
                    continue;
                }
                if (!_definitionService.ValidateWorkflowDefinition(definition, out var validationErrors))
                {
                    var errorMessage = string.Join(" | ", validationErrors);
                    _logger.LogWarning("Workflow {WorkflowId} '{Name}' validation failed: {Errors}", workflow.Id, workflow.WorkflowName, errorMessage);
                    continue;
                }
                var nodes = definition["nodes"] as JsonArray;

                var triggerNode = nodes?.FirstOrDefault(n => n?["type"]?.ToString()?.ToLower() == "trigger");
                if (triggerNode == null)
                {
                    _logger.LogWarning("Workflow {WorkflowId} '{Name}' has no trigger node in definition", workflow.Id, workflow.WorkflowName);
                    continue;
                }

                if (!_definitionService.IsTriggerMatch(triggerNode, submission.FormId))
                {
                    _logger.LogInformation("Workflow {WorkflowId} '{Name}' trigger does not match FormId {FormId}", workflow.Id, workflow.WorkflowName, submission.FormId);
                    continue;
                }

                _logger.LogInformation("Workflow {WorkflowId} '{Name}' matched! Creating instance for submission {SubmissionId}",
                    workflow.Id, workflow.WorkflowName, submissionId);

                var instance = new WorkflowInstance
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = workflow.Id,
                    SubmissionId = submission.Id,
                    InstanceStatus = WorkflowInstanceStatus.Running,
                    StartedAt = DateTime.UtcNow,
                    CurrentNodeId = Guid.TryParse(triggerNode["id"]?.ToString(), out var nodeId) ? nodeId : (Guid?)null,
                    CreatedBy = submission.SubmittedBy.ToString(),
                    LastModifiedBy = submission.SubmittedBy.ToString(),
                    ErrorMessage = string.Empty
                };

                await _instanceRepository.AddAsync(instance);
                await _unitOfWork.CompleteAsync();

                await ProcessFromNodeAsync(instance, triggerNode["id"]?.ToString() ?? "", submission);
            }
        }

        private async Task ProcessFromNodeAsync(WorkflowInstance instance, string currentNodeId, FormSubmission? submission)
        {
            // Overload for backward compatibility — creates a new visited set and loads the definition once
            var workflow = await _workflowRepository.GetByIdAsync(instance.WorkflowId);
            if (workflow == null) return;

            var definition = await _definitionService.LoadRuntimeDefinitionAsync(workflow);
            if (definition == null)
            {
                instance.InstanceStatus = WorkflowInstanceStatus.Failed;
                instance.ErrorMessage = "Workflow definition is missing or invalid.";
                instance.CompletedAt = DateTime.UtcNow;
                await _unitOfWork.CompleteAsync();
                return;
            }
            if (!_definitionService.ValidateWorkflowDefinition(definition, out var validationErrors))
            {
                instance.InstanceStatus = WorkflowInstanceStatus.Failed;
                instance.ErrorMessage = $"Workflow validation failed: {string.Join(" | ", validationErrors)}";
                instance.CompletedAt = DateTime.UtcNow;
                await _unitOfWork.CompleteAsync();
                try { await _notificationHub.SendWorkflowStatusUpdateAsync(submission?.SubmittedBy.ToString() ?? instance.WorkflowId.ToString(), instance.Id, "Failed", instance.ErrorMessage); } catch (Exception ex) { _logger.LogWarning(ex, "SignalR notification failed for workflow {WorkflowId}", instance.WorkflowId); }
                return;
            }

            var nodes = definition["nodes"] as JsonArray;
            var edges = definition["edges"] as JsonArray;
            var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            await ProcessFromNodeCoreAsync(instance, currentNodeId, submission, nodes!, edges, visited);
        }

        /// <summary>
        /// Core traversal: walks outgoing edges from <paramref name="currentNodeId"/>,
        /// reusing the already-parsed <paramref name="nodes"/> / <paramref name="edges"/>
        /// and tracking <paramref name="visited"/> to prevent infinite cycles.
        /// </summary>
        private async Task ProcessFromNodeCoreAsync(
            WorkflowInstance instance,
            string currentNodeId,
            FormSubmission? submission,
            JsonArray nodes,
            JsonArray? edges,
            HashSet<string> visited)
        {
            // Cycle detection: if we already executed this node in this traversal, stop
            if (!visited.Add(currentNodeId))
            {
                _logger.LogWarning("Cycle detected at node {NodeId} in workflow {WorkflowId}. Stopping traversal.", currentNodeId, instance.WorkflowId);
                return;
            }

            // Find edges from current node
            var outgoingEdges = edges?.Where(e => e?["source"]?.ToString() == currentNodeId).ToList();
            if (outgoingEdges == null || !outgoingEdges.Any()) return;

            foreach (var edge in outgoingEdges)
            {
                var targetNodeId = edge?["target"]?.ToString();
                var targetNode = nodes.FirstOrDefault(n => n?["id"]?.ToString() == targetNodeId);
                if (targetNode == null) continue;

                // Check condition if this edge has one
                var sourceHandle = edge?["sourceHandle"]?.ToString();
                if (!string.IsNullOrEmpty(sourceHandle) && submission != null)
                {
                    var currentNode = nodes.FirstOrDefault(n => n?["id"]?.ToString() == currentNodeId);
                    if (currentNode?["type"]?.ToString()?.ToLower() == "condition")
                    {
                        var conditionResult = await EvaluateConditionAsync(currentNode, submission);
                        if ((sourceHandle == "true" && !conditionResult) || (sourceHandle == "false" && conditionResult))
                        {
                            continue;
                        }
                    }
                }

                if (Guid.TryParse(targetNodeId, out var nextNodeGuid))
                {
                    instance.CurrentNodeId = nextNodeGuid;
                    await _unitOfWork.CompleteAsync();
                }

                await ExecuteNodeCoreAsync(instance, targetNode, submission, nodes, edges, visited);
            }
        }

        private async Task<bool> EvaluateConditionAsync(JsonNode node, FormSubmission submission)
        {
            var conditionConfig = _definitionService.GetNodeConfig(node);
            var expression = conditionConfig?["condition"]?.ToString();

            if (!string.IsNullOrWhiteSpace(expression))
            {
                var context = BuildSubmissionContext(submission);
                try
                {
                    return _jintService.EvaluateCondition(expression, context);
                }
                catch (Exception ex)
                {
                    // Log condition evaluation errors instead of silently defaulting (ISSUE-013)
                    _logger.LogError(ex, "Condition evaluation failed for expression '{Expression}'. Defaulting to false.", expression);
                    return false;
                }
            }

            var field = conditionConfig?["field"]?.ToString();
            var op = conditionConfig?["operator"]?.ToString();
            var value = conditionConfig?["value"]?.ToString();

            if (string.IsNullOrEmpty(field)) return false;

            var fieldData = submission.SubmissionData?.FirstOrDefault(d => d.Field?.FieldName == field);
            var actualValue = fieldData?.FieldValue ?? "";
            var fieldType = fieldData?.Field?.FieldType;

            var actualTyped = CoerceComparable(actualValue, fieldType);
            var expectedTyped = CoerceComparable(value, fieldType);

            return op?.ToLower() switch
            {
                "equals" => AreEqual(actualTyped, expectedTyped),
                "notequals" => !AreEqual(actualTyped, expectedTyped),
                "contains" => (actualTyped?.ToString() ?? "").Contains(expectedTyped?.ToString() ?? "", StringComparison.OrdinalIgnoreCase),
                "greaterthan" => Compare(actualTyped, expectedTyped) > 0,
                "lessthan" => Compare(actualTyped, expectedTyped) < 0,
                _ => false
            };
        }

        public async Task HandleApprovalActionAsync(Guid taskId, string action, string comments, string? userId)
        {
            var task = await _approvalRepository.GetByIdAsync(taskId);
            if (task == null) return;

            // Explicitly load related entities to avoid NullReferenceException (ISSUE-002)
            var workflowInstance = await _instanceRepository.GetByIdAsync(task.WorkflowInstanceId);
            if (workflowInstance == null)
            {
                _logger.LogWarning("WorkflowInstance {InstanceId} not found for approval task {TaskId}", task.WorkflowInstanceId, taskId);
                return;
            }
            var submission = workflowInstance.SubmissionId.HasValue
                ? await _submissionRepository.GetSubmissionWithDataAsync(workflowInstance.SubmissionId.Value)
                : null;

            task.TaskStatus = action.ToLower() switch
            {
                "approve" => ApprovalTaskStatus.Approved,
                "reject" => ApprovalTaskStatus.Rejected,
                "return" => ApprovalTaskStatus.Returned,
                _ => task.TaskStatus
            };
            task.Comments = comments;
            task.CompletedAt = DateTime.UtcNow;
            task.LastModifiedBy = userId ?? "system";

            await _unitOfWork.CompleteAsync();

            if (Guid.TryParse(userId, out var userGuid))
            {
                var history = new ApprovalHistory
                {
                    TaskId = task.Id,
                    SubmissionId = workflowInstance.SubmissionId ?? Guid.Empty,
                    ApprovedBy = userGuid,
                    Action = action,
                    Comments = comments
                };
                await _approvalHistoryRepository.AddAsync(history);
                await _unitOfWork.CompleteAsync();
            }

            if (task.TaskStatus == ApprovalTaskStatus.Approved)
            {
                var instance = workflowInstance;
                if (instance != null)
                {
                    var instanceTasks = await _approvalRepository.FindAsync(t => t.WorkflowInstanceId == instance.Id);
                    var instanceStepIds = instanceTasks.Select(t => t.StepId).Distinct().ToList();
                    var steps = await _approvalStepRepository.FindAsync(s => instanceStepIds.Contains(s.Id));
                    var stepLookup = steps.ToDictionary(s => s.Id, s => s);

                    var workflow = await _workflowRepository.GetByIdAsync(instance.WorkflowId);
                    var approvalNode = await GetApprovalNodeForTaskAsync(workflow, task, stepLookup);
                    if (approvalNode == null)
                    {
                        _logger.LogWarning("Approval node not found for task {TaskId}", task.Id);
                        return;
                    }

                    var approvalSteps = GetApprovalSteps(approvalNode);
                    var routingMode = GetApprovalRoutingMode(approvalNode);
                    var step = stepLookup.TryGetValue(task.StepId, out var stepEntity) ? stepEntity : null;
                    var currentStepOrder = step?.StepOrder ?? 1;
                    var currentStepConfig = approvalSteps.ElementAtOrDefault(currentStepOrder - 1);
                    var approvalType = (currentStepConfig?.ApprovalType ?? "any").ToLowerInvariant();

                    var stepTasks = instanceTasks.Where(t => t.StepId == task.StepId).ToList();
                    var shouldProceed = ShouldApproveStep(stepTasks, approvalType);

                    if (shouldProceed)
                    {
                        await ClosePendingStepTasksAsync(stepTasks, "Auto-closed after approval criteria met");

                        if (routingMode == "sequential" && approvalSteps.Count > currentStepOrder)
                        {
                            var nextOrder = currentStepOrder + 1;
                            var nodeGuid = step?.NodeId ?? Guid.Empty;
                            if (!InstanceHasStepTasks(instanceTasks, stepLookup, nodeGuid, nextOrder))
                            {
                                var created = await CreateApprovalStepAndTasksAsync(instance, approvalNode["id"]?.ToString() ?? "", approvalSteps[nextOrder - 1], nextOrder, submission);
                                if (created > 0)
                                {
                                    await _unitOfWork.CompleteAsync();
                                    return;
                                }
                            }
                        }

                        if (routingMode == "parallel")
                        {
                            if (!AreAllStepsComplete(instanceTasks, stepLookup, approvalSteps, step?.NodeId ?? Guid.Empty))
                            {
                                return;
                            }
                        }

                        if (submission != null)
                        {
                            await ProcessFromNodeAsync(instance, approvalNode["id"]?.ToString() ?? "", submission);
                        }
                    }
                }
            }
            else if (task.TaskStatus == ApprovalTaskStatus.Returned)
            {
                // Close other pending tasks for the same step
                var instance = workflowInstance;
                if (instance != null)
                {
                    var instanceTasks = await _approvalRepository.FindAsync(t => t.WorkflowInstanceId == instance.Id);
                    var pendingForStep = instanceTasks.Where(t => t.StepId == task.StepId && t.TaskStatus == ApprovalTaskStatus.Pending).ToList();
                    foreach (var pending in pendingForStep)
                    {
                        pending.TaskStatus = ApprovalTaskStatus.Returned;
                        pending.Comments = "Auto-closed due to return";
                        pending.CompletedAt = DateTime.UtcNow;
                        pending.LastModifiedBy = "system";
                    }

                    instance.InstanceStatus = WorkflowInstanceStatus.Failed;
                    instance.ErrorMessage = "Returned for revision";
                    instance.CompletedAt = DateTime.UtcNow;
                }

                if (submission != null)
                {
                    submission.SubmissionStatus = SubmissionStatus.Returned;
                }

                await _unitOfWork.CompleteAsync();

                // Notify submitter of return
                try
                {
                    await _notificationHub.SendWorkflowStatusUpdateAsync(
                        submission?.SubmittedBy.ToString() ?? workflowInstance.WorkflowId.ToString(),
                        workflowInstance.Id, "Returned", "Submission returned for revision");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "SignalR notification failed for returned workflow {WorkflowId}", workflowInstance.WorkflowId);
                }
            }
            else if (task.TaskStatus == ApprovalTaskStatus.Rejected)
            {
                var instance = workflowInstance;
                if (instance != null)
                {
                    var instanceTasks = await _approvalRepository.FindAsync(t => t.WorkflowInstanceId == instance.Id);
                    var instanceStepIds = instanceTasks.Select(t => t.StepId).Distinct().ToList();
                    var steps = await _approvalStepRepository.FindAsync(s => instanceStepIds.Contains(s.Id));
                    var stepLookup = steps.ToDictionary(s => s.Id, s => s);

                    var workflow = await _workflowRepository.GetByIdAsync(instance.WorkflowId);
                    var approvalNode = await GetApprovalNodeForTaskAsync(workflow, task, stepLookup);
                    if (approvalNode == null)
                    {
                        _logger.LogWarning("Approval node not found for task {TaskId}", task.Id);
                        return;
                    }

                    var approvalSteps = GetApprovalSteps(approvalNode);
                    var step = stepLookup.TryGetValue(task.StepId, out var stepEntity) ? stepEntity : null;
                    var currentStepOrder = step?.StepOrder ?? 1;
                    var currentStepConfig = approvalSteps.ElementAtOrDefault(currentStepOrder - 1);
                    var approvalType = (currentStepConfig?.ApprovalType ?? "any").ToLowerInvariant();

                    var stepTasks = instanceTasks.Where(t => t.StepId == task.StepId).ToList();
                    var shouldFail = ShouldRejectStep(stepTasks, approvalType);

                    if (shouldFail)
                    {
                        // Close all remaining pending tasks for this instance
                        var pendingTasks = instanceTasks.Where(t => t.TaskStatus == ApprovalTaskStatus.Pending).ToList();
                        foreach (var pending in pendingTasks)
                        {
                            pending.TaskStatus = ApprovalTaskStatus.Returned;
                            pending.Comments = "Auto-closed due to rejection";
                            pending.CompletedAt = DateTime.UtcNow;
                            pending.LastModifiedBy = "system";
                        }

                        instance.InstanceStatus = WorkflowInstanceStatus.Rejected;
                        instance.CompletedAt = DateTime.UtcNow;

                        // Update submission status to Rejected
                        if (submission != null)
                        {
                            submission.SubmissionStatus = SubmissionStatus.Rejected;
                        }

                        await _unitOfWork.CompleteAsync();

                        // Notify submitter of rejection
                        try
                        {
                            await _notificationHub.SendWorkflowStatusUpdateAsync(
                                submission?.SubmittedBy.ToString() ?? instance.WorkflowId.ToString(),
                                instance.Id, "Rejected", "Workflow rejected");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "SignalR notification failed for rejected workflow {WorkflowId}", instance.WorkflowId);
                        }
                    }
                }
            }
        }

        private async Task ExecuteNodeAsync(WorkflowInstance instance, JsonNode node, FormSubmission? submission)
        {
            // Legacy overload — loads definition and delegates to core
            var workflow = await _workflowRepository.GetByIdAsync(instance.WorkflowId);
            if (workflow == null) return;
            var definition = await _definitionService.LoadRuntimeDefinitionAsync(workflow);
            if (definition == null) return;
            var nodes = definition["nodes"] as JsonArray ?? new JsonArray();
            var edges = definition["edges"] as JsonArray;
            var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            await ExecuteNodeCoreAsync(instance, node, submission, nodes, edges, visited);
        }

        private async Task ExecuteNodeCoreAsync(WorkflowInstance instance, JsonNode node, FormSubmission? submission, JsonArray nodes, JsonArray? edges, HashSet<string> visited)
        {
            var nodeType = node["type"]?.ToString() ?? "";
            var nodeId = node["id"]?.ToString() ?? "";
            var nodeLabel = node["data"]?["label"]?.ToString() ?? nodeType;
            var startedAt = DateTime.UtcNow;
            Guid.TryParse(nodeId, out var nodeGuid);

            // Send real-time progress notification for every node execution step
            try
            {
                await _notificationHub.SendWorkflowStatusUpdateAsync(
                    submission?.SubmittedBy.ToString() ?? instance.WorkflowId.ToString(),
                    instance.Id,
                    "Running",
                    $"Executing node: {nodeLabel} ({nodeType})");
            }
            catch { /* Non-critical - don't fail execution if notification fails */ }

            switch (nodeType.ToLower())
            {
                case "condition":
                    await ProcessFromNodeCoreAsync(instance, nodeId, submission, nodes, edges, visited);
                    await LogNodeExecutionAsync(instance.Id, nodeGuid, ExecutionStatus.Completed, null, null, null, (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
                    break;

                case "approval":
                    await ExecuteApprovalNodeAsync(instance, node, submission);
                    await LogNodeExecutionAsync(instance.Id, nodeGuid, ExecutionStatus.Completed, null, null, null, (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
                    break;

                case "action":
                    if (submission != null) await ExecuteActionNodeAsync(instance, node, submission);
                    await LogNodeExecutionAsync(instance.Id, nodeGuid, ExecutionStatus.Completed, null, null, null, (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
                    await ProcessFromNodeCoreAsync(instance, nodeId, submission, nodes, edges, visited);
                    break;

                case "end":
                    instance.InstanceStatus = WorkflowInstanceStatus.Completed;
                    instance.CompletedAt = DateTime.UtcNow;
                    await _unitOfWork.CompleteAsync();
                    await LogNodeExecutionAsync(instance.Id, nodeGuid, ExecutionStatus.Completed, null, null, null, (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
                    // Notify via SignalR that workflow completed
                    try { await _notificationHub.SendWorkflowStatusUpdateAsync(submission?.SubmittedBy.ToString() ?? instance.WorkflowId.ToString(), instance.Id, "Completed", "Workflow completed successfully"); } catch (Exception ex) { _logger.LogWarning(ex, "SignalR notification failed for workflow {WorkflowId}", instance.WorkflowId); }
                    break;

                case "sendemail":
                    // SendEmail node type - convenience alias for Action with send_email (ISSUE-004/MISSING-001)
                    if (submission != null) await ExecuteActionNodeAsync(instance, node, submission);
                    await LogNodeExecutionAsync(instance.Id, nodeGuid, ExecutionStatus.Completed, null, null, null, (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
                    await ProcessFromNodeCoreAsync(instance, nodeId, submission, nodes, edges, visited);
                    break;

                case "wait":
                    // Wait/Delay node pauses execution
                    var waitConfig = _definitionService.GetNodeConfig(node);
                    var waitHours = int.TryParse(waitConfig?["waitHours"]?.ToString(), out var wh) ? wh : 0;
                    var waitMinutes = int.TryParse(waitConfig?["waitMinutes"]?.ToString(), out var wm) ? wm : 0;
                    var totalWaitMs = (waitHours * 3600 + waitMinutes * 60) * 1000;
                    if (totalWaitMs > 0 && totalWaitMs <= 60000)
                    {
                        await Task.Delay(totalWaitMs);
                    }
                    else if (totalWaitMs > 60000)
                    {
                        // Schedule continuation via Hangfire for long waits
                        var delayTimeSpan = TimeSpan.FromMilliseconds(totalWaitMs);
                        _logger.LogInformation("Wait node {NodeId}: scheduling {Hours}h {Minutes}m delay for workflow {WorkflowId}", nodeId, waitHours, waitMinutes, instance.WorkflowId);
                        await LogNodeExecutionAsync(instance.Id, nodeGuid, ExecutionStatus.Completed, null, JsonSerializer.Serialize(new { waitHours, waitMinutes, scheduledContinuation = true }), null, (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
                        _backgroundJobClient.Schedule<IWorkflowEngine>(
                            x => x.ProcessWorkflowInstanceAsync(instance.Id, null),
                            delayTimeSpan);
                        return; // Don't continue processing now — Hangfire will resume after the delay
                    }
                    await LogNodeExecutionAsync(instance.Id, nodeGuid, ExecutionStatus.Completed, null, JsonSerializer.Serialize(new { waitHours, waitMinutes }), null, (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
                    await ProcessFromNodeCoreAsync(instance, nodeId, submission, nodes, edges, visited);
                    break;

                case "script":
                    // Script node executes custom JavaScript via Jint (MISSING-002)
                    try
                    {
                        var scriptConfig = _definitionService.GetNodeConfig(node);
                        var script = scriptConfig?["script"]?.ToString();
                        if (!string.IsNullOrWhiteSpace(script))
                        {
                            var scriptContext = submission != null ? BuildSubmissionContext(submission) : new Dictionary<string, object>();
                            var scriptResult = _jintService.ExecuteJavaScript(script, scriptContext);
                            await LogNodeExecutionAsync(instance.Id, nodeGuid, ExecutionStatus.Completed, null, JsonSerializer.Serialize(new { result = scriptResult?.ToString() }), null, (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
                        }
                        else
                        {
                            _logger.LogWarning("Script node {NodeId} has no script configured", nodeId);
                            await LogNodeExecutionAsync(instance.Id, nodeGuid, ExecutionStatus.Completed, null, null, "No script configured", (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Script execution failed for node {NodeId} in workflow {WorkflowId}", nodeId, instance.WorkflowId);
                        await LogNodeExecutionAsync(instance.Id, nodeGuid, ExecutionStatus.Failed, null, null, ex.Message, (int)(DateTime.UtcNow - startedAt).TotalMilliseconds);
                        instance.InstanceStatus = WorkflowInstanceStatus.Failed;
                        instance.ErrorMessage = $"Script execution failed: {ex.Message}";
                        instance.CompletedAt = DateTime.UtcNow;
                        await _unitOfWork.CompleteAsync();
                        try { await _notificationHub.SendWorkflowStatusUpdateAsync(submission?.SubmittedBy.ToString() ?? instance.WorkflowId.ToString(), instance.Id, "Failed", instance.ErrorMessage); } catch (Exception notifEx) { _logger.LogWarning(notifEx, "SignalR notification failed for workflow {WorkflowId}", instance.WorkflowId); }
                        return;
                    }
                    await ProcessFromNodeCoreAsync(instance, nodeId, submission, nodes, edges, visited);
                    break;

                default:
                    _logger.LogWarning("Unknown workflow node type '{NodeType}' for workflow {WorkflowId}", nodeType, instance.WorkflowId);
                    break;
            }
        }

        private async Task ExecuteApprovalNodeAsync(WorkflowInstance instance, JsonNode node, FormSubmission? submission)
        {
            var nodeId = node["id"]?.ToString() ?? "";
            var steps = GetApprovalSteps(node);
            if (!steps.Any())
            {
                _logger.LogWarning("Approval node {NodeId} has no steps configured", nodeId);
                await ProcessFromNodeAsync(instance, nodeId, submission);
                return;
            }

            var routingMode = GetApprovalRoutingMode(node);
            var createdTasks = 0;

            if (routingMode == "parallel")
            {
                for (var i = 0; i < steps.Count; i++)
                {
                    createdTasks += await CreateApprovalStepAndTasksAsync(instance, nodeId, steps[i], i + 1, submission);
                }
            }
            else
            {
                createdTasks += await CreateApprovalStepAndTasksAsync(instance, nodeId, steps[0], 1, submission);
            }

            if (createdTasks == 0)
            {
                if (instance.InstanceStatus == WorkflowInstanceStatus.Failed)
                {
                    return;
                }
                await ProcessFromNodeAsync(instance, nodeId, submission);
                return;
            }

            await _unitOfWork.CompleteAsync();
        }

        private sealed class ApprovalStepConfig
        {
            public string StepName { get; set; } = "Approval Step";
            public string ApproverType { get; set; } = "user";
            public string ApproverId { get; set; } = string.Empty;
            public string ApprovalType { get; set; } = "any";
            public int? DeadlineHours { get; set; }
            public int? DueDays { get; set; }
        }

        private List<ApprovalStepConfig> GetApprovalSteps(JsonNode node)
        {
            var config = _definitionService.GetNodeConfig(node);
            var steps = new List<ApprovalStepConfig>();
            var stepsToken = config?["steps"] as JsonArray;

            if (stepsToken != null && stepsToken.Any())
            {
                foreach (var step in stepsToken)
                {
                    steps.Add(new ApprovalStepConfig
                    {
                        StepName = step?["stepName"]?.ToString() ?? "Approval Step",
                        ApproverType = step?["approverType"]?.ToString() ?? "user",
                        ApproverId = step?["approverId"]?.ToString() ?? string.Empty,
                        ApprovalType = step?["approvalType"]?.ToString() ?? "any",
                        DeadlineHours = int.TryParse(step?["deadlineHours"]?.ToString(), out var hours) ? hours : (int?)null,
                        DueDays = int.TryParse(step?["dueDays"]?.ToString(), out var days) ? days : (int?)null
                    });
                }

                return steps;
            }

            steps.Add(new ApprovalStepConfig
            {
                StepName = config?["stepName"]?.ToString() ?? "Approval Step",
                ApproverType = config?["approverType"]?.ToString() ?? "user",
                ApproverId = config?["approverId"]?.ToString() ?? string.Empty,
                ApprovalType = config?["approvalType"]?.ToString() ?? "any",
                DeadlineHours = int.TryParse(config?["deadlineHours"]?.ToString(), out var fallbackHours) ? fallbackHours : (int?)null,
                DueDays = int.TryParse(config?["dueDays"]?.ToString(), out var fallbackDays) ? fallbackDays : (int?)null
            });

            return steps;
        }

        private string GetApprovalRoutingMode(JsonNode node)
        {
            var config = _definitionService.GetNodeConfig(node);
            var routingMode = config?["routingMode"]?.ToString()?.ToLowerInvariant();
            return routingMode == "parallel" ? "parallel" : "sequential";
        }

        private async Task<JsonNode?> GetApprovalNodeForTaskAsync(Workflow? workflow, ApprovalTask task, Dictionary<Guid, ApprovalStep> stepLookup)
        {
            if (workflow == null) return null;

            try
            {
                var definition = await _definitionService.LoadRuntimeDefinitionAsync(workflow);
                if (definition == null) return null;
                var nodes = definition["nodes"] as JsonArray;
                if (nodes == null) return null;

                if (stepLookup.TryGetValue(task.StepId, out var step))
                {
                    var node = nodes.FirstOrDefault(n => n?["id"]?.ToString() == step.NodeId.ToString());
                    if (node != null) return node;
                }

                return nodes.FirstOrDefault(n => n?["type"]?.ToString()?.ToLower() == "approval");
            }
            catch
            {
                return null;
            }
        }

        private async Task<int> CreateApprovalStepAndTasksAsync(
            WorkflowInstance instance,
            string nodeId,
            ApprovalStepConfig stepConfig,
            int stepOrder,
            FormSubmission? submission)
        {
            var approvers = await ResolveApproversAsync(stepConfig.ApproverType, stepConfig.ApproverId);
            if (!approvers.Any())
            {
                _logger.LogWarning("No approvers found for workflow {WorkflowId}, node {NodeId}, step {StepOrder}", instance.WorkflowId, nodeId, stepOrder);
                instance.InstanceStatus = WorkflowInstanceStatus.Failed;
                instance.ErrorMessage = $"Approval node '{nodeId}' has no resolvable approvers (step {stepOrder}).";
                instance.CompletedAt = DateTime.UtcNow;
                await _unitOfWork.CompleteAsync();
                try
                {
                    await _notificationHub.SendWorkflowStatusUpdateAsync(
                        submission?.SubmittedBy.ToString() ?? instance.WorkflowId.ToString(),
                        instance.Id,
                        "Failed",
                        instance.ErrorMessage);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "SignalR notification failed for workflow {WorkflowId}", instance.WorkflowId);
                }
                return 0;
            }

            // Load form name explicitly — the navigation property is often not loaded
            var formName = "Unknown Form";
            if (submission != null)
            {
                var form = await _formRepository.GetByIdAsync(submission.FormId);
                formName = form?.FormName ?? "Unknown Form";
            }

            Guid.TryParse(nodeId, out var nodeGuid);
            var approvalType = stepConfig.ApprovalType?.ToLowerInvariant() ?? "any";
            var requiredApprovals = approvalType switch
            {
                "all" => approvers.Count,
                "majority" => approvers.Count / 2 + 1,
                _ => 1
            };

            var approvalStep = new ApprovalStep
            {
                Id = Guid.NewGuid(),
                WorkflowId = instance.WorkflowId,
                NodeId = nodeGuid,
                StepName = stepConfig.StepName,
                StepOrder = stepOrder,
                ApprovalType = approvalType,
                RequiredApprovals = requiredApprovals,
                EscalationEnabled = false,
                CreatedBy = instance.CreatedBy,
                LastModifiedBy = instance.CreatedBy
            };

            await _approvalStepRepository.AddAsync(approvalStep);

            var dueDays = stepConfig.DueDays ?? 7;
            var createdTasks = 0;

            foreach (var approver in approvers)
            {
                var task = new ApprovalTask
                {
                    Id = Guid.NewGuid(),
                    WorkflowInstanceId = instance.Id,
                    StepId = approvalStep.Id,
                    AssignedTo = approver,
                    TaskStatus = ApprovalTaskStatus.Pending,
                    Comments = string.Empty,
                    DueDate = stepConfig.DeadlineHours.HasValue
                        ? DateTime.UtcNow.AddHours(stepConfig.DeadlineHours.Value)
                        : DateTime.UtcNow.AddDays(dueDays),
                    CreatedDate = DateTime.UtcNow,
                    CreatedBy = instance.CreatedBy,
                    LastModifiedBy = instance.CreatedBy
                };

                await _approvalRepository.AddAsync(task);
                createdTasks++;

                await _notificationHub.SendApprovalTaskNotificationAsync(
                    approver,
                    task.Id,
                    formName,
                    "assigned to you"
                );
            }

            return createdTasks;
        }

        private async Task<List<string>> ResolveApproversAsync(string approverType, string approverId)
        {
            var approvers = new List<string>();

            switch (approverType.ToLowerInvariant())
            {
                case "user":
                    if (!string.IsNullOrEmpty(approverId))
                        approvers.Add(approverId);
                    break;
                case "role":
                    if (!string.IsNullOrEmpty(approverId))
                    {
                        try
                        {
                            var roleUsers = await _userAdmin.GetUserIdsByRoleAsync(approverId);
                            approvers.AddRange(roleUsers);
                            _logger.LogInformation("Resolved {Count} users for role {RoleName}", roleUsers.Count, approverId);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to resolve users for role {RoleName}", approverId);
                        }
                    }
                    break;
                case "group":
                    if (!string.IsNullOrEmpty(approverId))
                    {
                        try
                        {
                            var groupUsers = await _userAdmin.GetUserIdsByGroupAsync(approverId);
                            approvers.AddRange(groupUsers);
                            _logger.LogInformation("Resolved {Count} users for group {GroupId}", groupUsers.Count, approverId);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to resolve members for group {GroupId}", approverId);
                        }
                    }
                    break;
            }

            return approvers.Distinct().ToList();
        }

        private static bool ShouldApproveStep(List<ApprovalTask> stepTasks, string approvalType)
        {
            if (!stepTasks.Any()) return false;
            return approvalType switch
            {
                "all" => stepTasks.All(t => t.TaskStatus == ApprovalTaskStatus.Approved),
                "any" => stepTasks.Any(t => t.TaskStatus == ApprovalTaskStatus.Approved),
                "majority" => stepTasks.Count(t => t.TaskStatus == ApprovalTaskStatus.Approved) > stepTasks.Count / 2,
                _ => stepTasks.Any(t => t.TaskStatus == ApprovalTaskStatus.Approved)
            };
        }

        private static bool ShouldRejectStep(List<ApprovalTask> stepTasks, string approvalType)
        {
            if (!stepTasks.Any()) return false;

            return approvalType switch
            {
                "all" => stepTasks.Any(t => t.TaskStatus == ApprovalTaskStatus.Rejected),
                "any" => stepTasks.Any(t => t.TaskStatus == ApprovalTaskStatus.Rejected),
                "majority" => stepTasks.Count(t => t.TaskStatus == ApprovalTaskStatus.Rejected) > stepTasks.Count / 2,
                _ => stepTasks.Any(t => t.TaskStatus == ApprovalTaskStatus.Rejected)
            };
        }

        private static bool InstanceHasStepTasks(IReadOnlyList<ApprovalTask> instanceTasks, Dictionary<Guid, ApprovalStep> stepLookup, Guid nodeId, int stepOrder)
        {
            return instanceTasks.Any(task =>
            {
                if (!stepLookup.TryGetValue(task.StepId, out var step)) return false;
                return step.NodeId == nodeId && step.StepOrder == stepOrder;
            });
        }

        private static bool AreAllStepsComplete(
            IReadOnlyList<ApprovalTask> instanceTasks,
            Dictionary<Guid, ApprovalStep> stepLookup,
            List<ApprovalStepConfig> approvalSteps,
            Guid nodeId)
        {
            for (var order = 1; order <= approvalSteps.Count; order++)
            {
                var tasksForStep = instanceTasks.Where(task =>
                {
                    if (!stepLookup.TryGetValue(task.StepId, out var step)) return false;
                    return step.NodeId == nodeId && step.StepOrder == order;
                }).ToList();

                if (!ShouldApproveStep(tasksForStep, approvalSteps[order - 1].ApprovalType?.ToLowerInvariant() ?? "any"))
                {
                    return false;
                }
            }

            return true;
        }

        private async Task ClosePendingStepTasksAsync(List<ApprovalTask> stepTasks, string reason)
        {
            var pendingTasks = stepTasks.Where(t => t.TaskStatus == ApprovalTaskStatus.Pending).ToList();
            if (!pendingTasks.Any()) return;

            foreach (var pending in pendingTasks)
            {
                pending.TaskStatus = ApprovalTaskStatus.Skipped;
                pending.Comments = reason;
                pending.CompletedAt = DateTime.UtcNow;
                pending.LastModifiedBy = "system";
            }

            await _unitOfWork.CompleteAsync();
        }

        private async Task ExecuteActionNodeAsync(WorkflowInstance instance, JsonNode node, FormSubmission submission)
        {
            var actionConfig = _definitionService.GetNodeConfig(node);
            var actionType = actionConfig?["actionType"]?.ToString() ?? "";

            switch (actionType.ToLower())
            {
                case "send_email":
                    var toEmail = actionConfig?["toEmail"]?.ToString();
                    var subject = actionConfig?["subject"]?.ToString() ?? "Workflow Notification";
                    var message = actionConfig?["message"]?.ToString() ?? "";

                    if (!string.IsNullOrEmpty(toEmail))
                    {
                        try
                        {
                            var processedMessage = ReplacePlaceholders(message, submission);
                            var processedSubject = ReplacePlaceholders(subject, submission);

                            await _emailService.SendEmailAsync(toEmail, processedSubject, processedMessage);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to send email to {Email} for workflow {WorkflowId}", toEmail, instance.WorkflowId);
                        }
                    }
                    break;

                case "update_field":
                    var fieldName = actionConfig?["fieldName"]?.ToString();
                    var fieldValue = actionConfig?["fieldValue"]?.ToString();

                    if (!string.IsNullOrEmpty(fieldName))
                    {
                        var fieldData = submission.SubmissionData?.FirstOrDefault(d => d.Field?.FieldName == fieldName);
                        if (fieldData != null)
                        {
                            fieldData.FieldValue = fieldValue ?? "";
                            await _unitOfWork.CompleteAsync();
                        }
                    }
                    break;

                case "webhook":
                    var webhookUrl = actionConfig?["webhookUrl"]?.ToString();
                    var webhookMethod = actionConfig?["method"]?.ToString()?.ToUpper() ?? "POST";
                    var webhookHeaders = actionConfig?["headers"]?.ToString();

                    if (!string.IsNullOrEmpty(webhookUrl))
                    {
                        try
                        {
                            var client = _httpClientFactory.CreateClient("WebhookClient");

                            var payload = new
                            {
                                workflowId = instance.WorkflowId,
                                instanceId = instance.Id,
                                submissionId = submission.Id,
                                formId = submission.FormId,
                                status = submission.SubmissionStatus.ToString(),
                                submittedBy = submission.SubmittedBy,
                                submittedDate = submission.SubmittedAt,
                                data = submission.SubmissionData?.ToDictionary(
                                    d => d.Field?.FieldName ?? "unknown",
                                    d => d.FieldValue ?? ""
                                )
                            };

                            var jsonPayload = JsonSerializer.Serialize(payload);
                            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                            // Use per-request headers instead of mutating shared DefaultRequestHeaders (ISSUE-003)
                            var httpMethod = webhookMethod switch
                            {
                                "GET" => HttpMethod.Get,
                                "PUT" => HttpMethod.Put,
                                _ => HttpMethod.Post
                            };
                            var requestMessage = new HttpRequestMessage(httpMethod, webhookUrl);
                            if (httpMethod != HttpMethod.Get)
                                requestMessage.Content = content;

                            if (!string.IsNullOrEmpty(webhookHeaders))
                            {
                                try
                                {
                                    var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(webhookHeaders);
                                    if (headers != null)
                                    {
                                        foreach (var header in headers)
                                        {
                                            requestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value);
                                        }
                                    }
                                }
                                catch (Exception ex) { _logger.LogWarning(ex, "Failed to parse webhook headers"); }
                            }

                            var response = await client.SendAsync(requestMessage);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to execute webhook {Url} for workflow {WorkflowId}", webhookUrl, instance.WorkflowId);
                        }
                    }
                    break;

                case "update_status":
                    var newStatus = actionConfig?["status"]?.ToString();
                    if (!string.IsNullOrEmpty(newStatus) && Enum.TryParse<SubmissionStatus>(newStatus, true, out var parsedStatus))
                    {
                        submission.SubmissionStatus = parsedStatus;
                        await _unitOfWork.CompleteAsync();
                    }
                    break;

                default:
                    _logger.LogWarning("Unknown action type '{ActionType}' for workflow {WorkflowId}", actionType, instance.WorkflowId);
                    break;
            }
        }

        private string ReplacePlaceholders(string template, FormSubmission submission)
        {
            if (string.IsNullOrEmpty(template)) return template;

            var result = template;

            result = result.Replace("{{submissionId}}", submission.Id.ToString());
            result = result.Replace("{{submittedBy}}", submission.SubmittedBy.ToString());
            result = result.Replace("{{submittedDate}}", submission.SubmittedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "N/A");
            result = result.Replace("{{status}}", submission.SubmissionStatus.ToString());

            if (submission.SubmissionData != null)
            {
                foreach (var data in submission.SubmissionData)
                {
                    var fieldName = data.Field?.FieldName ?? "";
                    if (!string.IsNullOrEmpty(fieldName))
                    {
                        result = result.Replace($"{{{{{fieldName}}}}}", data.FieldValue ?? "");
                    }
                }
            }

            return result;
        }

        public async Task<bool> CheckApprovalCompletionAsync(Guid instanceId, string approvalType)
        {
            var instanceTasks = (await _approvalRepository.FindAsync(t => t.WorkflowInstanceId == instanceId)).ToList();

            if (!instanceTasks.Any()) return false;

            return approvalType.ToLower() switch
            {
                "all" => instanceTasks.All(t => t.TaskStatus == ApprovalTaskStatus.Approved),
                "any" => instanceTasks.Any(t => t.TaskStatus == ApprovalTaskStatus.Approved),
                "majority" => instanceTasks.Count(t => t.TaskStatus == ApprovalTaskStatus.Approved) > instanceTasks.Count / 2,
                _ => instanceTasks.Any(t => t.TaskStatus == ApprovalTaskStatus.Approved)
            };
        }

        public async Task ProcessWorkflowInstanceAsync(Guid instanceId, string? userId = null)
        {
            var instance = await _instanceRepository.GetByIdAsync(instanceId);
            if (instance == null) return;

            var submission = instance.SubmissionId.HasValue
                ? await _submissionRepository.GetSubmissionWithDataAsync(instance.SubmissionId.Value)
                : null;

            var workflow = await _workflowRepository.GetByIdAsync(instance.WorkflowId);
            if (workflow == null) return;

            var definition = await _definitionService.LoadRuntimeDefinitionAsync(workflow);
            if (definition == null)
            {
                instance.InstanceStatus = WorkflowInstanceStatus.Failed;
                instance.ErrorMessage = "Workflow definition is missing or invalid.";
                instance.CompletedAt = DateTime.UtcNow;
                await _unitOfWork.CompleteAsync();
                return;
            }
            if (!_definitionService.ValidateWorkflowDefinition(definition, out var validationErrors))
            {
                instance.InstanceStatus = WorkflowInstanceStatus.Failed;
                instance.ErrorMessage = $"Workflow validation failed: {string.Join(" | ", validationErrors)}";
                instance.CompletedAt = DateTime.UtcNow;
                await _unitOfWork.CompleteAsync();

                return;
            }
            var nodes = definition["nodes"] as JsonArray;

            var currentNode = nodes?.FirstOrDefault(n =>
                n?["id"]?.ToString() == instance.CurrentNodeId?.ToString());

            if (currentNode != null)
            {
                await ExecuteNodeAsync(instance, currentNode, submission);
            }
        }

        public async Task RetryWorkflowInstanceAsync(Guid instanceId, string? userId = null)
        {
            var instance = await _instanceRepository.GetByIdAsync(instanceId);
            if (instance == null) return;

            instance.InstanceStatus = WorkflowInstanceStatus.Running;
            instance.ErrorMessage = string.Empty;
            instance.CompletedAt = null;
            await _unitOfWork.CompleteAsync();

            var submission = instance.SubmissionId.HasValue
                ? await _submissionRepository.GetSubmissionWithDataAsync(instance.SubmissionId.Value)
                : null;
            if (submission == null) return;

            var workflow = await _workflowRepository.GetByIdAsync(instance.WorkflowId);
            if (workflow == null) return;

            var definition = await _definitionService.LoadRuntimeDefinitionAsync(workflow);
            if (definition == null) return;
            var nodes = definition["nodes"] as JsonArray;
            var triggerNode = nodes?.FirstOrDefault(n => n?["type"]?.ToString()?.ToLower() == "trigger");
            if (triggerNode == null) return;

            await ProcessFromNodeAsync(instance, triggerNode["id"]?.ToString() ?? "", submission);
        }

        public async Task CancelWorkflowInstanceAsync(Guid instanceId, string? userId = null)
        {
            var instance = await _instanceRepository.GetByIdAsync(instanceId);
            if (instance == null) return;

            if (instance.InstanceStatus == WorkflowInstanceStatus.Completed) return;

            instance.InstanceStatus = WorkflowInstanceStatus.Cancelled;
            instance.ErrorMessage = "Cancelled by user";
            instance.CompletedAt = DateTime.UtcNow;
            await _unitOfWork.CompleteAsync();
        }

        private Dictionary<string, object> BuildSubmissionContext(FormSubmission submission)
        {
            var context = new Dictionary<string, object>();
            if (submission.SubmissionData == null) return context;

            var fields = new Dictionary<string, object>();

            foreach (var item in submission.SubmissionData)
            {
                var key = item.Field?.FieldName;
                if (string.IsNullOrWhiteSpace(key)) continue;
                var value = item.FieldValue ?? "";
                context[key] = value;
                var safeKey = NormalizeFieldKey(key);
                if (!string.Equals(safeKey, key, StringComparison.OrdinalIgnoreCase) && !context.ContainsKey(safeKey))
                {
                    context[safeKey] = value;
                }
                fields[key] = value;
            }
            context["fields"] = fields;
            return context;
        }

        private static object? CoerceComparable(string? value, string? fieldType)
        {
            if (value == null) return null;
            if (string.IsNullOrWhiteSpace(fieldType)) return value;

            switch (fieldType.ToLowerInvariant())
            {
                case "number":
                case "decimal":
                case "integer":
                case "int":
                    if (decimal.TryParse(value, out var dec)) return dec;
                    break;
                case "date":
                case "datetime":
                    if (DateTime.TryParse(value, out var dt)) return dt;
                    break;
                case "checkbox":
                case "boolean":
                case "bool":
                    if (bool.TryParse(value, out var b)) return b;
                    if (value == "1") return true;
                    if (value == "0") return false;
                    break;
            }

            return value;
        }

        private static int Compare(object? left, object? right)
        {
            if (left is decimal ld && right is decimal rd)
                return ld.CompareTo(rd);
            if (left is DateTime ldt && right is DateTime rdt)
                return ldt.CompareTo(rdt);
            if (left is bool lb && right is bool rb)
                return lb.CompareTo(rb);
            var ls = left?.ToString() ?? string.Empty;
            var rs = right?.ToString() ?? string.Empty;
            return string.Compare(ls, rs, StringComparison.OrdinalIgnoreCase);
        }

        private static bool AreEqual(object? left, object? right)
        {
            if (left is decimal ld && right is decimal rd)
                return ld == rd;
            if (left is DateTime ldt && right is DateTime rdt)
                return ldt == rdt;
            if (left is bool lb && right is bool rb)
                return lb == rb;
            return string.Equals(left?.ToString() ?? string.Empty, right?.ToString() ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        }

        private static string NormalizeFieldKey(string key)
        {
            var normalized = new string(key.Select(ch => char.IsLetterOrDigit(ch) ? ch : '_').ToArray());
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return "field";
            }
            if (char.IsDigit(normalized[0]))
            {
                normalized = $"f_{normalized}";
            }
            return normalized;
        }

        private async Task LogNodeExecutionAsync(Guid instanceId, Guid nodeId, ExecutionStatus status, string? inputJson, string? outputJson, string? errorMessage, int durationMs)
        {
            var log = new WorkflowExecutionLog
            {
                InstanceId = instanceId,
                NodeId = nodeId,
                ExecutionStatus = status,
                InputDataJson = inputJson ?? string.Empty,
                OutputDataJson = outputJson ?? string.Empty,
                ErrorMessage = errorMessage ?? string.Empty,
                Duration = durationMs,
                ExecutedAt = DateTime.UtcNow
            };

            await _executionLogRepository.AddAsync(log);
            await _unitOfWork.CompleteAsync();
        }

        /// <summary>
        /// Checks all active, published workflows for schedule-type triggers and starts instances for any due ones.
        /// Meant to be called every minute by Hangfire.
        /// </summary>
        public async Task ProcessScheduledTriggersAsync()
        {
            try
            {
                var activeWorkflows = await _workflowRepository.GetActiveWorkflowsAsync();
                foreach (var workflow in activeWorkflows)
                {
                    try
                    {
                        var definition = await _definitionService.LoadRuntimeDefinitionAsync(workflow);
                        if (definition == null) continue;
                        var nodes = definition["nodes"] as JsonArray;
                        if (nodes == null) continue;

                        var triggerNode = nodes.FirstOrDefault(n => n?["type"]?.ToString()?.ToLower() == "trigger");
                        if (triggerNode == null) continue;

                        var config = _definitionService.GetNodeConfig(triggerNode);
                        var triggerType = config?["triggerType"]?.ToString();
                        if (triggerType != "schedule") continue;

                        var cronExpression = config?["cronExpression"]?.ToString();
                        if (string.IsNullOrWhiteSpace(cronExpression)) continue;

                        if (!IsCronDue(DateTime.UtcNow, cronExpression))
                        {
                            continue;
                        }

                        // Simple cron-like check: if the trigger is schedule-type, create instance periodically
                        // For production, use a proper cron parser - here we check if trigger hasn't fired recently
                        var recentInstances = await _instanceRepository.FindAsync(i =>
                            i.WorkflowId == workflow.Id &&
                            i.StartedAt > DateTime.UtcNow.AddMinutes(-1));

                        if (recentInstances.Any())
                        {
                            // Already fired within the last 5 minutes, skip
                            continue;
                        }

                        _logger.LogInformation("Executing scheduled trigger for workflow {WorkflowId}", workflow.Id);

                        var instance = new WorkflowInstance
                        {
                            Id = Guid.NewGuid(),
                            WorkflowId = workflow.Id,
                            SubmissionId = null, // No submission for scheduled triggers
                            InstanceStatus = WorkflowInstanceStatus.Running,
                            StartedAt = DateTime.UtcNow,
                            CurrentNodeId = Guid.TryParse(triggerNode["id"]?.ToString(), out var nodeId) ? nodeId : (Guid?)null,
                            CreatedBy = workflow.CreatedBy,
                            LastModifiedBy = workflow.CreatedBy,
                            ErrorMessage = string.Empty
                        };

                        await _instanceRepository.AddAsync(instance);
                        await _unitOfWork.CompleteAsync();

                        try
                        {
                            await _notificationHub.SendWorkflowStatusUpdateAsync(
                                workflow.Id.ToString(), instance.Id, "Running", "Scheduled workflow triggered");
                        }
                        catch (Exception ex) { _logger.LogWarning(ex, "SignalR notification failed for scheduled workflow {WorkflowId}", workflow.Id); }

                        // Process from the trigger node outward (skip the trigger itself, go to next nodes)
                        await ProcessFromNodeAsync(instance, triggerNode["id"]?.ToString() ?? "", null);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing scheduled trigger for workflow {WorkflowId}", workflow.Id);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ProcessScheduledTriggersAsync");
            }
        }

        private static bool IsCronDue(DateTime utcNow, string cronExpression)
        {
            var parts = cronExpression.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 5) return false;

            return MatchesCronField(utcNow.Minute, parts[0], 0, 59)
                   && MatchesCronField(utcNow.Hour, parts[1], 0, 23)
                   && MatchesCronField(utcNow.Day, parts[2], 1, 31)
                   && MatchesCronField(utcNow.Month, parts[3], 1, 12)
                   && MatchesCronField((int)utcNow.DayOfWeek, parts[4], 0, 6);
        }

        private static bool MatchesCronField(int value, string field, int min, int max)
        {
            if (field == "*") return true;
            if (field.StartsWith("*/", StringComparison.Ordinal))
            {
                if (int.TryParse(field.Substring(2), out var step) && step > 0)
                {
                    return (value - min) % step == 0;
                }
                return false;
            }
            if (int.TryParse(field, out var exact))
            {
                return exact == value;
            }
            return false;
        }
    }
}
