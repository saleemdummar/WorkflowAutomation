using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Domain.Interfaces
{
    /// <summary>
    /// Repository for approval escalation operations that require complex
    /// query composition (Include/ThenInclude) not supported by IRepository&lt;T&gt;.
    /// </summary>
    public interface IApprovalEscalationRepository
    {
        /// <summary>
        /// Gets pending approval tasks that are past their due date,
        /// including related WorkflowInstance, Submission, and Form data.
        /// </summary>
        Task<List<ApprovalTask>> GetOverdueApprovalTasksAsync();

        /// <summary>
        /// Gets escalation rules matching the given workflow and optional step.
        /// </summary>
        Task<List<ApprovalEscalationRule>> GetMatchingRulesAsync(Guid workflowId, Guid? stepId);

        /// <summary>
        /// Gets the latest escalation history entry for a given approval task.
        /// </summary>
        Task<ApprovalEscalationHistory?> GetLatestEscalationAsync(Guid approvalTaskId);

        /// <summary>
        /// Updates an approval task (reassignment, new deadline, etc.).
        /// </summary>
        Task UpdateApprovalTaskAsync(ApprovalTask task);

        /// <summary>
        /// Adds an escalation history record.
        /// </summary>
        Task AddEscalationHistoryAsync(ApprovalEscalationHistory history);

        /// <summary>
        /// CRUD operations for escalation rules with navigation properties loaded.
        /// </summary>
        Task<ApprovalEscalationRule> CreateRuleAsync(ApprovalEscalationRule rule);
        Task<ApprovalEscalationRule?> GetRuleByIdAsync(Guid ruleId);
        Task<List<ApprovalEscalationRule>> GetAllRulesAsync();
        Task<List<ApprovalEscalationRule>> GetRulesByWorkflowAsync(Guid workflowId);
        Task<ApprovalEscalationRule> UpdateRuleAsync(ApprovalEscalationRule rule);
        Task DeleteRuleAsync(Guid ruleId);

        /// <summary>
        /// Gets escalation history for a specific approval task with related data.
        /// </summary>
        Task<List<ApprovalEscalationHistory>> GetEscalationHistoryAsync(Guid approvalTaskId);

        /// <summary>
        /// Resolves a user's email and display name by user ID.
        /// Returns (email, displayName).
        /// </summary>
        Task<(string email, string displayName)> ResolveUserEmailAsync(string userId);
    }
}
