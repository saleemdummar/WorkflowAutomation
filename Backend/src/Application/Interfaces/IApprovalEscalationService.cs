using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IApprovalEscalationService
    {
        Task ProcessEscalationsAsync();
        Task<ApprovalEscalationRule> CreateEscalationRuleAsync(ApprovalEscalationRule rule);
        Task<ApprovalEscalationRule?> GetEscalationRuleByIdAsync(Guid ruleId);
        Task<List<ApprovalEscalationRule>> GetAllEscalationRulesAsync();
        Task<List<ApprovalEscalationRule>> GetEscalationRulesAsync(Guid workflowId);
        Task<ApprovalEscalationRule> UpdateEscalationRuleAsync(ApprovalEscalationRule rule);
        Task DeleteEscalationRuleAsync(Guid ruleId);
        Task<List<ApprovalEscalationHistory>> GetEscalationHistoryAsync(Guid approvalTaskId);
    }
}
