using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.Escalation;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/approval-escalation")]
    [Authorize(Policy = "EscalationManage")]
    public class ApprovalEscalationController : BaseApiController
    {
        private readonly IApprovalEscalationService _escalationService;
        private readonly IRepository<ApprovalTask> _approvalTaskRepository;

        public ApprovalEscalationController(
            IApprovalEscalationService escalationService,
            IRepository<ApprovalTask> approvalTaskRepository)
        {
            _escalationService = escalationService;
            _approvalTaskRepository = approvalTaskRepository;
        }

        [HttpGet]
        public async Task<ActionResult<List<EscalationRuleDto>>> GetAll()
        {
            var rules = await _escalationService.GetAllEscalationRulesAsync();
            return Ok(rules.ConvertAll(MapToDto));
        }

        [HttpGet("{ruleId}")]
        public async Task<ActionResult<EscalationRuleDto>> GetById(Guid ruleId)
        {
            var rule = await _escalationService.GetEscalationRuleByIdAsync(ruleId);
            if (rule == null) return NotFound();
            return Ok(MapToDto(rule));
        }

        // GET: api/approval-escalation/workflow/{workflowId}
        [HttpGet("workflow/{workflowId}")]
        public async Task<ActionResult<List<EscalationRuleDto>>> GetRulesForWorkflow(Guid workflowId)
        {
            var rules = await _escalationService.GetEscalationRulesAsync(workflowId);
            return Ok(rules.ConvertAll(MapToDto));
        }

        // POST: api/approval-escalation
        [HttpPost]
        public async Task<ActionResult<EscalationRuleDto>> CreateRule([FromBody] EscalationRuleRequest rule)
        {
            var entity = MapToEntity(rule);
            entity.CreatedBy = GetUserId();
            entity.LastModifiedBy = entity.CreatedBy;
            entity.CreatedDate = DateTime.UtcNow;
            entity.LastModifiedDate = entity.CreatedDate;
            var createdRule = await _escalationService.CreateEscalationRuleAsync(entity);
            return CreatedAtAction(nameof(GetById), new { ruleId = createdRule.Id }, MapToDto(createdRule));
        }

        [HttpPut("{ruleId}")]
        public async Task<ActionResult<EscalationRuleDto>> UpdateRule(Guid ruleId, [FromBody] EscalationRuleRequest rule)
        {
            var existing = await _escalationService.GetEscalationRuleByIdAsync(ruleId);
            if (existing == null) return NotFound();

            existing.WorkflowId = string.IsNullOrWhiteSpace(rule.WorkflowId) ? Guid.Empty : Guid.Parse(rule.WorkflowId);
            existing.EscalationDelayHours = rule.EscalationHours;
            existing.EscalateToUserId = string.IsNullOrWhiteSpace(rule.EscalateToUserId) ? null : Guid.Parse(rule.EscalateToUserId);
            existing.EscalateToRoleId = string.IsNullOrWhiteSpace(rule.EscalateToRoleId) ? null : Guid.Parse(rule.EscalateToRoleId);
            existing.EscalateToGroupId = string.IsNullOrWhiteSpace(rule.EscalateToGroupId) ? null : Guid.Parse(rule.EscalateToGroupId);
            existing.EscalateToManager = rule.EscalateToManager;
            existing.MaxEscalationLevels = rule.MaxEscalationLevels > 0 ? rule.MaxEscalationLevels : existing.MaxEscalationLevels;
            existing.EscalationMessageTemplate = string.IsNullOrWhiteSpace(rule.EscalationMessageTemplate) ? existing.EscalationMessageTemplate : rule.EscalationMessageTemplate;
            existing.ReassignOnEscalation = rule.ReassignOnEscalation;
            existing.SendNotificationToOriginalApprover = rule.SendReminder;
            existing.SendNotificationToEscalationTarget = rule.SendReminder || rule.SendEmailNotification || rule.SendInAppNotification;
            existing.AutoApproveOnEscalation = rule.AutoReject ? false : rule.AutoApprove;
            existing.IsEnabled = rule.IsActive;
            if (rule.AutoReject)
            {
                existing.EscalationMessageTemplate = "[AUTO_REJECT]" + (rule.EscalationMessageTemplate ?? "");
            }
            existing.LastModifiedBy = GetUserId();
            existing.LastModifiedDate = DateTime.UtcNow;

            var updated = await _escalationService.UpdateEscalationRuleAsync(existing);
            return Ok(MapToDto(updated));
        }

        // DELETE: api/approval-escalation/{ruleId}
        [HttpDelete("{ruleId}")]
        public async Task<IActionResult> DeleteRule(Guid ruleId)
        {
            await _escalationService.DeleteEscalationRuleAsync(ruleId);
            return NoContent();
        }

        // GET: api/approval-escalation/history/{approvalTaskId}
        [HttpGet("history/{approvalTaskId}")]
        public async Task<ActionResult<List<ApprovalEscalationHistory>>> GetEscalationHistory(Guid approvalTaskId)
        {
            var history = await _escalationService.GetEscalationHistoryAsync(approvalTaskId);
            return Ok(history);
        }

        // POST: api/approval-escalation/process
        // Manual trigger for processing escalations (primarily for testing)
        [HttpPost("process")]
        public async Task<IActionResult> ProcessEscalations()
        {
            await _escalationService.ProcessEscalationsAsync();
            return Ok(new { message = "Escalation processing completed" });
        }

        [HttpPost("{ruleId}/test")]
        public async Task<IActionResult> TestRule(Guid ruleId)
        {
            var rule = await _escalationService.GetEscalationRuleByIdAsync(ruleId);
            if (rule == null) return NotFound();

            // Simulate: find pending approval tasks that would be affected by this rule
            var pendingTasks = await _approvalTaskRepository.FindAsync(t =>
                t.TaskStatus == ApprovalTaskStatus.Pending &&
                (rule.WorkflowId == Guid.Empty || t.WorkflowInstanceId != null));

            var now = DateTime.UtcNow;
            var overdueTasks = new List<object>();
            var upcomingTasks = new List<object>();

            foreach (var task in pendingTasks)
            {
                var hoursSinceCreated = (now - task.CreatedDate).TotalHours;
                var wouldEscalate = hoursSinceCreated >= rule.EscalationDelayHours;

                var taskInfo = new
                {
                    taskId = task.Id,
                    assignedTo = task.AssignedTo,
                    createdAt = task.CreatedDate,
                    hoursPending = Math.Round(hoursSinceCreated, 1),
                    wouldEscalate
                };

                if (wouldEscalate)
                    overdueTasks.Add(taskInfo);
                else
                    upcomingTasks.Add(taskInfo);
            }

            // Check existing escalation history for this rule's workflow
            var escalationHistory = rule.WorkflowId != Guid.Empty
                ? await _escalationService.GetEscalationHistoryAsync(rule.WorkflowId)
                : new List<ApprovalEscalationHistory>();

            return Ok(new
            {
                ruleId = rule.Id,
                isEnabled = rule.IsEnabled,
                escalationDelayHours = rule.EscalationDelayHours,
                maxEscalationLevels = rule.MaxEscalationLevels,
                escalationTarget = new
                {
                    toUserId = rule.EscalateToUserId,
                    toRoleId = rule.EscalateToRoleId,
                    toGroupId = rule.EscalateToGroupId,
                    toManager = rule.EscalateToManager
                },
                actions = new
                {
                    reassign = rule.ReassignOnEscalation,
                    autoApprove = rule.AutoApproveOnEscalation,
                    autoReject = rule.EscalationMessageTemplate?.StartsWith("[AUTO_REJECT]") == true,
                    notifyOriginal = rule.SendNotificationToOriginalApprover,
                    notifyTarget = rule.SendNotificationToEscalationTarget
                },
                simulation = new
                {
                    totalPendingTasks = pendingTasks.Count,
                    overdueTaskCount = overdueTasks.Count,
                    upcomingTaskCount = upcomingTasks.Count,
                    overdueTasks,
                    upcomingTasks
                },
                previousEscalations = escalationHistory.Count,
                message = overdueTasks.Count > 0
                    ? $"Rule would escalate {overdueTasks.Count} overdue task(s) now."
                    : "No tasks currently qualify for escalation under this rule."
            });
        }

        private static ApprovalEscalationRule MapToEntity(EscalationRuleRequest request)
        {
            var entity = new ApprovalEscalationRule
            {
                WorkflowId = string.IsNullOrWhiteSpace(request.WorkflowId) ? Guid.Empty : Guid.Parse(request.WorkflowId),
                EscalationDelayHours = request.EscalationHours,
                EscalateToUserId = string.IsNullOrWhiteSpace(request.EscalateToUserId) ? null : Guid.Parse(request.EscalateToUserId),
                EscalateToRoleId = string.IsNullOrWhiteSpace(request.EscalateToRoleId) ? null : Guid.Parse(request.EscalateToRoleId),
                EscalateToGroupId = string.IsNullOrWhiteSpace(request.EscalateToGroupId) ? null : Guid.Parse(request.EscalateToGroupId),
                EscalateToManager = request.EscalateToManager,
                MaxEscalationLevels = request.MaxEscalationLevels > 0 ? request.MaxEscalationLevels : 3,
                EscalationMessageTemplate = request.EscalationMessageTemplate,
                ReassignOnEscalation = request.ReassignOnEscalation,
                SendNotificationToOriginalApprover = request.SendReminder,
                SendNotificationToEscalationTarget = request.SendReminder || request.SendEmailNotification || request.SendInAppNotification,
                AutoApproveOnEscalation = request.AutoReject ? false : request.AutoApprove,
                AutoRejectOnEscalation = request.AutoReject,
                IsEnabled = request.IsActive
            };

            return entity;
        }

        private static EscalationRuleDto MapToDto(ApprovalEscalationRule rule)
        {
            return new EscalationRuleDto
            {
                Id = rule.Id,
                WorkflowId = rule.WorkflowId == Guid.Empty ? null : rule.WorkflowId.ToString(),
                WorkflowName = rule.Workflow?.WorkflowName,
                EscalationHours = rule.EscalationDelayHours,
                EscalateToUserId = rule.EscalateToUserId?.ToString(),
                EscalateToRoleId = rule.EscalateToRoleId?.ToString(),
                EscalateToGroupId = rule.EscalateToGroupId?.ToString(),
                EscalateToManager = rule.EscalateToManager,
                SendReminder = rule.SendNotificationToOriginalApprover,
                SendEmailNotification = rule.SendNotificationToEscalationTarget,
                SendInAppNotification = rule.SendNotificationToEscalationTarget,
                AutoApprove = rule.AutoApproveOnEscalation,
                AutoReject = rule.AutoRejectOnEscalation,
                IsActive = rule.IsEnabled,
                MaxEscalationLevels = rule.MaxEscalationLevels,
                EscalationMessageTemplate = rule.EscalationMessageTemplate,
                ReassignOnEscalation = rule.ReassignOnEscalation,
                CreatedAt = rule.CreatedDate
            };
        }
    }
}
