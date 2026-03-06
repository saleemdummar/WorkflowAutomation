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
    public class ApprovalRepository : GenericRepository<ApprovalTask>, IApprovalRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public ApprovalRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Returns a base query with the full navigation chain loaded:
        /// WorkflowInstance → Submission → Form, and SubmissionData → Field.
        /// </summary>
        private IQueryable<ApprovalTask> QueryWithIncludes()
        {
            return _dbContext.ApprovalTasks
                .Include(t => t.WorkflowInstance)
                    .ThenInclude(wi => wi.Submission)
                        .ThenInclude(s => s.Form)
                .Include(t => t.WorkflowInstance)
                    .ThenInclude(wi => wi.Submission)
                        .ThenInclude(s => s.SubmissionData)
                            .ThenInclude(d => d.Field);
        }

        public async Task<IReadOnlyList<ApprovalTask>> GetTasksByAssigneeAsync(string assigneeId)
        {
            return await QueryWithIncludes()
                .Where(t => t.AssignedTo == assigneeId)
                .OrderByDescending(t => t.AssignedAt)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<ApprovalTask>> GetPendingTasksAsync()
        {
            return await QueryWithIncludes()
                .Where(t => t.TaskStatus == ApprovalTaskStatus.Pending)
                .OrderBy(t => t.DueDate)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<ApprovalTask>> GetTasksByInstanceIdAsync(Guid instanceId)
        {
            return await QueryWithIncludes()
                .Where(t => t.WorkflowInstanceId == instanceId)
                .OrderBy(t => t.AssignedAt)
                .ToListAsync();
        }

        public async Task<int> GetPendingCountByAssigneeAsync(string assigneeId)
        {
            return await _dbContext.ApprovalTasks
                .CountAsync(t => t.AssignedTo == assigneeId && t.TaskStatus == ApprovalTaskStatus.Pending);
        }
    }
}
