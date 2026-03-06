using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.Approvals;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/[controller]")]
    [Authorize]
    public class ApprovalsController : BaseApiController
    {
        private readonly IApprovalService _approvalService;
        private readonly IRepository<ApprovalTask> _approvalRepository;
        private readonly IWorkflowEngine _workflowEngine;
        private readonly ISystemLogService _systemLogService;
        private readonly IAuditLogService _auditLogService;

        public ApprovalsController(
            IApprovalService approvalService,
            IRepository<ApprovalTask> approvalRepository,
            IWorkflowEngine workflowEngine,
            ISystemLogService systemLogService,
            IAuditLogService auditLogService)
        {
            _approvalService = approvalService;
            _approvalRepository = approvalRepository;
            _workflowEngine = workflowEngine;
            _systemLogService = systemLogService;
            _auditLogService = auditLogService;
        }

        [HttpGet("my-tasks")]
        public async Task<IActionResult> GetMyTasks()
        {
            var result = await _approvalService.GetMyTasksAsync(GetUserId());
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTaskById(Guid id)
        {
            var result = await _approvalService.GetTaskByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetApprovalHistory(Guid id)
        {
            try
            {
                var result = await _approvalService.GetApprovalHistoryAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("{id}/action")]
        [Authorize(Policy = "ApprovalAct")]
        public async Task<IActionResult> TakeAction(Guid id, [FromBody] ApprovalActionRequest request)
        {
            var task = await _approvalRepository.GetByIdAsync(id);
            if (task == null) return NotFound();

            if (task.TaskStatus != ApprovalTaskStatus.Pending)
                return BadRequest(new { message = "This task has already been processed." });

            var userId = GetUserId();
            await _workflowEngine.HandleApprovalActionAsync(id, request.Action, request.Comments, userId);

            await LogApprovalActionAsync(id, request.Action, request.Comments, userId);

            return Ok(new { message = $"Task {request.Action} successfully" });
        }

        /// <summary>
        /// Legacy endpoint kept for backward compatibility. Delegates to TakeAction internally.
        /// Prefer using POST {id}/action with explicit action string.
        /// </summary>
        [HttpPost("{id}/approve")]
        [Authorize(Policy = "ApprovalAct")]
        public async Task<IActionResult> ApproveTask(Guid id, [FromBody] ApprovalDecisionRequest request)
        {
            var action = request.Approved ? "approve" : "reject";
            var actionRequest = new ApprovalActionRequest
            {
                Action = action,
                Comments = request.Comments ?? string.Empty
            };
            return await TakeAction(id, actionRequest);
        }

        [HttpGet]
        [Authorize(Policy = "ApprovalViewAll")]
        public async Task<IActionResult> GetAllTasks()
        {
            var result = await _approvalService.GetAllTasksAsync();
            return Ok(result);
        }

        /// <summary>
        /// Shared audit logging for approval actions.
        /// </summary>
        private async Task LogApprovalActionAsync(Guid taskId, string action, string? comments, string userId)
        {
            await _systemLogService.LogInfoAsync("ApprovalsController", $"Approval task {taskId} {action} by user {userId}");
            if (Guid.TryParse(userId, out var userGuid))
            {
                await _auditLogService.LogAsync(
                    "ApprovalAction", "ApprovalTask", taskId, $"Task {taskId}",
                    userGuid, GetUserName(), GetUserEmail(),
                    additionalInfo: $"Action: {action}, Comments: {comments}");
            }
        }
    }
}
