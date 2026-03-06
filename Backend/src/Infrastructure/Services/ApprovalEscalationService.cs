using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Infrastructure.Services
{
    public class ApprovalEscalationService : IApprovalEscalationService
    {
        private readonly IApprovalEscalationRepository _escalationRepository;
        private readonly INotificationHubService _notificationHubService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<ApprovalEscalationService> _logger;
        private readonly IEmailService _emailService;
        private readonly IWorkflowEngine _workflowEngine;

        public ApprovalEscalationService(
            IApprovalEscalationRepository escalationRepository,
            INotificationHubService notificationHubService,
            IUnitOfWork unitOfWork,
            ILogger<ApprovalEscalationService> logger,
            IEmailService emailService,
            IWorkflowEngine workflowEngine)
        {
            _escalationRepository = escalationRepository;
            _notificationHubService = notificationHubService;
            _unitOfWork = unitOfWork;
            _logger = logger;
            _emailService = emailService;
            _workflowEngine = workflowEngine;
        }

        public async Task ProcessEscalationsAsync()
        {
            _logger.LogInformation("Checking for overdue approvals to escalate...");

            var overdueApprovalTasks = await _escalationRepository.GetOverdueApprovalTasksAsync();
            _logger.LogInformation("Found {Count} overdue approval tasks", overdueApprovalTasks.Count);

            int successCount = 0;
            int failureCount = 0;

            foreach (var task in overdueApprovalTasks)
            {
                try
                {
                    await ProcessSingleEscalationAsync(task);
                    successCount++;
                }
                catch (Exception ex)
                {
                    failureCount++;
                    _logger.LogError(ex, "Error escalating approval task {TaskId}. Continuing with next task.", task.Id);
                }
            }

            try
            {
                await _unitOfWork.CompleteAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving escalation changes to database");
                throw;
            }

            _logger.LogInformation(
                "Approval escalation processing completed. Success: {Success}, Failures: {Failures}",
                successCount, failureCount);
        }

        private async Task ProcessSingleEscalationAsync(ApprovalTask task)
        {
            var workflowId = task.WorkflowInstance.WorkflowId;
            var rules = await _escalationRepository.GetMatchingRulesAsync(workflowId, task.StepId);

            if (!rules.Any())
            {
                _logger.LogWarning("No escalation rules found for approval task {TaskId}", task.Id);
                return;
            }

            var rule = rules.First();

            var latestEscalation = await _escalationRepository.GetLatestEscalationAsync(task.Id);
            int nextLevel = latestEscalation == null ? 1 : latestEscalation.EscalationLevel + 1;

            if (nextLevel > rule.MaxEscalationLevels)
            {
                _logger.LogWarning("Maximum escalation levels reached for task {TaskId}", task.Id);
                return;
            }

            _logger.LogInformation("Escalating approval task {TaskId} to level {Level}", task.Id, nextLevel);

            if (rule.AutoApproveOnEscalation)
            {
                await _workflowEngine.HandleApprovalActionAsync(task.Id, "approve", "Auto-approved by escalation rule", null);
                return;
            }

            if (rule.AutoRejectOnEscalation)
            {
                await _workflowEngine.HandleApprovalActionAsync(task.Id, "reject", "Auto-rejected by escalation rule", null);
                return;
            }

            var previousAssignee = task.AssignedTo;
            string? escalationTarget = DetermineEscalationTarget(rule, task.AssignedTo);

            if (string.IsNullOrEmpty(escalationTarget))
            {
                _logger.LogWarning("Could not determine escalation target for task {TaskId}", task.Id);
                return;
            }

            if (rule.ReassignOnEscalation)
            {
                task.AssignedTo = escalationTarget;
                task.DueDate = DateTime.UtcNow.AddHours(rule.EscalationDelayHours);
                task.LastModifiedBy = "system";
                await _escalationRepository.UpdateApprovalTaskAsync(task);
            }

            var history = new ApprovalEscalationHistory
            {
                ApprovalTaskId = task.Id,
                ApprovalEscalationRuleId = rule.Id,
                EscalatedFrom = Guid.TryParse(previousAssignee, out var fromGuid) ? fromGuid : (Guid?)null,
                EscalatedTo = Guid.TryParse(escalationTarget, out var toGuid) ? toGuid : rule.EscalateToUserId,
                EscalatedAt = DateTime.UtcNow,
                Reason = GetEscalationReason(rule, nextLevel),
                EscalationLevel = nextLevel,
                WasAutoApproved = false
            };

            await _escalationRepository.AddEscalationHistoryAsync(history);

            var formName = task.WorkflowInstance?.Submission?.Form?.FormName ?? "Unknown Form";
            var workflowName = task.WorkflowInstance?.Workflow?.WorkflowName ?? "Unknown Workflow";

            if (rule.SendNotificationToEscalationTarget)
            {
                await _notificationHubService.SendApprovalTaskNotificationAsync(
                    escalationTarget,
                    task.Id,
                    formName,
                    "escalated to you"
                );

                await SendEscalationEmailAsync(escalationTarget, formName, workflowName, nextLevel);
            }

            if (rule.SendNotificationToOriginalApprover && !string.IsNullOrEmpty(previousAssignee))
            {
                await _notificationHubService.SendNotificationToUserAsync(
                    previousAssignee,
                    "Approval Escalated",
                    $"Approval task for {formName} has been escalated",
                    "escalation"
                );
            }

            _logger.LogInformation("Successfully escalated approval task {TaskId} to {Target}", task.Id, escalationTarget);
        }

        private string? DetermineEscalationTarget(ApprovalEscalationRule rule, string currentAssignee)
        {
            // Priority order: specific user > role > group

            // 1. Specific user
            if (rule.EscalateToUserId.HasValue)
            {
                return rule.EscalateToUserId.Value.ToString();
            }

            // 2. Role (without identity, return role ID as fallback)
            if (rule.EscalateToRoleId.HasValue)
            {
                return rule.EscalateToRoleId.Value.ToString();
            }

            // 3. Group (without identity, return group ID as fallback)
            if (rule.EscalateToGroupId.HasValue)
            {
                return rule.EscalateToGroupId.Value.ToString();
            }

            return null;
        }

        private string GetEscalationReason(ApprovalEscalationRule rule, int level)
        {
            if (!string.IsNullOrEmpty(rule.EscalationMessageTemplate))
            {
                return rule.EscalationMessageTemplate
                    .Replace("{level}", level.ToString())
                    .Replace("{delay}", rule.EscalationDelayHours.ToString());
            }

            return $"Task overdue - escalated to level {level} after {rule.EscalationDelayHours} hours";
        }

        private async Task SendEscalationEmailAsync(string userId, string formName, string workflowName, int level)
        {
            try
            {
                var (toEmail, userName) = await _escalationRepository.ResolveUserEmailAsync(userId);
                var reason = $"Level {level} escalation due to overdue approval";
                await _emailService.SendEscalationNotificationAsync(toEmail, userName, workflowName, reason);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send escalation email to user {UserId}", userId);
            }
        }

        public async Task<ApprovalEscalationRule> CreateEscalationRuleAsync(ApprovalEscalationRule rule)
        {
            _logger.LogInformation("Creating escalation rule for workflow {WorkflowId}", rule.WorkflowId);
            var created = await _escalationRepository.CreateRuleAsync(rule);
            await _unitOfWork.CompleteAsync();
            return created;
        }

        public async Task<ApprovalEscalationRule?> GetEscalationRuleByIdAsync(Guid ruleId)
        {
            return await _escalationRepository.GetRuleByIdAsync(ruleId);
        }

        public async Task<List<ApprovalEscalationRule>> GetAllEscalationRulesAsync()
        {
            return await _escalationRepository.GetAllRulesAsync();
        }

        public async Task<List<ApprovalEscalationRule>> GetEscalationRulesAsync(Guid workflowId)
        {
            return await _escalationRepository.GetRulesByWorkflowAsync(workflowId);
        }

        public async Task<ApprovalEscalationRule> UpdateEscalationRuleAsync(ApprovalEscalationRule rule)
        {
            var updated = await _escalationRepository.UpdateRuleAsync(rule);
            await _unitOfWork.CompleteAsync();
            return updated;
        }

        public async Task DeleteEscalationRuleAsync(Guid ruleId)
        {
            _logger.LogInformation("Deleting escalation rule {RuleId}", ruleId);
            await _escalationRepository.DeleteRuleAsync(ruleId);
            await _unitOfWork.CompleteAsync();
        }

        public async Task<List<ApprovalEscalationHistory>> GetEscalationHistoryAsync(Guid approvalTaskId)
        {
            return await _escalationRepository.GetEscalationHistoryAsync(approvalTaskId);
        }
    }
}
