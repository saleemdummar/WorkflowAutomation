using System;
using System.Threading.Tasks;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IWorkflowEngine
    {
        Task TriggerWorkflowAsync(Guid submissionId);
        Task ProcessWorkflowInstanceAsync(Guid instanceId, string? userId = null);
        Task HandleApprovalActionAsync(Guid taskId, string action, string comments, string? userId);
        Task RetryWorkflowInstanceAsync(Guid instanceId, string? userId = null);
        Task CancelWorkflowInstanceAsync(Guid instanceId, string? userId = null);
        Task<bool> CheckApprovalCompletionAsync(Guid instanceId, string approvalType);

        /// <summary>
        /// Processes all active workflows that have a scheduled trigger whose cron expression matches the current time.
        /// Called periodically by Hangfire.
        /// </summary>
        Task ProcessScheduledTriggersAsync();
    }
}
