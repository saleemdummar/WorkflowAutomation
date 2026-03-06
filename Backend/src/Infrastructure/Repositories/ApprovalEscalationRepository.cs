using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;
using WorkflowAutomation.Domain.Interfaces;
using WorkflowAutomation.Infrastructure.Data;

namespace WorkflowAutomation.Infrastructure.Repositories
{
    public class ApprovalEscalationRepository : IApprovalEscalationRepository
    {
        private readonly ApplicationDbContext _context;

        public ApprovalEscalationRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<ApprovalTask>> GetOverdueApprovalTasksAsync()
        {
            return await _context.ApprovalTasks
                .Include(t => t.Step)
                .Include(t => t.WorkflowInstance)
                    .ThenInclude(wi => wi.Submission)
                        .ThenInclude(s => s.Form)
                .Where(t => t.TaskStatus == ApprovalTaskStatus.Pending &&
                           t.DueDate.HasValue &&
                           t.DueDate.Value < DateTime.UtcNow)
                .ToListAsync();
        }

        public async Task<List<ApprovalEscalationRule>> GetMatchingRulesAsync(Guid workflowId, Guid? stepId)
        {
            return await _context.ApprovalEscalationRules
                .Where(r => (r.WorkflowId == workflowId || r.WorkflowId == Guid.Empty) &&
                           r.IsEnabled &&
                           (!r.ApprovalStepId.HasValue || r.ApprovalStepId == stepId))
                .ToListAsync();
        }

        public async Task<ApprovalEscalationHistory?> GetLatestEscalationAsync(Guid approvalTaskId)
        {
            return await _context.ApprovalEscalationHistories
                .Where(h => h.ApprovalTaskId == approvalTaskId)
                .OrderByDescending(h => h.EscalatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task UpdateApprovalTaskAsync(ApprovalTask task)
        {
            _context.ApprovalTasks.Update(task);
        }

        public async Task AddEscalationHistoryAsync(ApprovalEscalationHistory history)
        {
            await _context.ApprovalEscalationHistories.AddAsync(history);
        }

        public async Task<ApprovalEscalationRule> CreateRuleAsync(ApprovalEscalationRule rule)
        {
            await _context.ApprovalEscalationRules.AddAsync(rule);
            return rule;
        }

        public async Task<ApprovalEscalationRule?> GetRuleByIdAsync(Guid ruleId)
        {
            return await _context.ApprovalEscalationRules
                .Include(r => r.Workflow)
                .Include(r => r.ApprovalStep)
                .FirstOrDefaultAsync(r => r.Id == ruleId);
        }

        public async Task<List<ApprovalEscalationRule>> GetAllRulesAsync()
        {
            return await _context.ApprovalEscalationRules
                .Include(r => r.Workflow)
                .Include(r => r.ApprovalStep)
                .OrderByDescending(r => r.CreatedDate)
                .ToListAsync();
        }

        public async Task<List<ApprovalEscalationRule>> GetRulesByWorkflowAsync(Guid workflowId)
        {
            return await _context.ApprovalEscalationRules
                .Include(r => r.Workflow)
                .Include(r => r.ApprovalStep)
                .Where(r => r.WorkflowId == workflowId)
                .OrderBy(r => r.EscalationLevel)
                .ThenBy(r => r.CreatedDate)
                .ToListAsync();
        }

        public async Task<ApprovalEscalationRule> UpdateRuleAsync(ApprovalEscalationRule rule)
        {
            _context.ApprovalEscalationRules.Update(rule);
            return rule;
        }

        public async Task DeleteRuleAsync(Guid ruleId)
        {
            var rule = await _context.ApprovalEscalationRules.FindAsync(ruleId);
            if (rule != null)
            {
                _context.ApprovalEscalationRules.Remove(rule);
            }
        }

        public async Task<List<ApprovalEscalationHistory>> GetEscalationHistoryAsync(Guid approvalTaskId)
        {
            return await _context.ApprovalEscalationHistories
                .Include(h => h.ApprovalTask)
                .Include(h => h.EscalationRule)
                .Where(h => h.ApprovalTaskId == approvalTaskId)
                .OrderByDescending(h => h.EscalatedAt)
                .ToListAsync();
        }

        public async Task<(string email, string displayName)> ResolveUserEmailAsync(string userId)
        {
            string email = $"user-{userId}@system.local";
            string displayName = "System User";

            if (Guid.TryParse(userId, out var userGuid))
            {
                var authUser = await _context.AuthUsers.FirstOrDefaultAsync(u => u.Id == userGuid.ToString());
                if (authUser != null && !string.IsNullOrEmpty(authUser.Email))
                {
                    return (authUser.Email, authUser.Name ?? authUser.Email);
                }

                var profile = await _context.UserProfiles.FirstOrDefaultAsync(u => u.SubjectId == userGuid.ToString());
                if (profile != null && !string.IsNullOrEmpty(profile.Email))
                {
                    return (profile.Email, profile.DisplayName ?? profile.Email);
                }
            }

            return (email, displayName);
        }
    }
}
