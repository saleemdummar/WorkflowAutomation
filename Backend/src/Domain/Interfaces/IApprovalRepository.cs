using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;

namespace WorkflowAutomation.Domain.Interfaces
{
    public interface IApprovalRepository : IRepository<ApprovalTask>
    {
        Task<IReadOnlyList<ApprovalTask>> GetTasksByAssigneeAsync(string assigneeId);
        Task<IReadOnlyList<ApprovalTask>> GetPendingTasksAsync();
        Task<IReadOnlyList<ApprovalTask>> GetTasksByInstanceIdAsync(Guid instanceId);
        Task<int> GetPendingCountByAssigneeAsync(string assigneeId);
    }
}
