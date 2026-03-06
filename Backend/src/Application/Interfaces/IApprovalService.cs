using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Approvals;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IApprovalService
    {
        Task<IEnumerable<EnrichedApprovalTaskDto>> GetMyTasksAsync(string userId);
        Task<ApprovalTaskDetailDto?> GetTaskByIdAsync(Guid taskId);
        Task<IEnumerable<ApprovalHistoryEntryDto>> GetApprovalHistoryAsync(Guid taskId);
        Task<IEnumerable<EnrichedApprovalTaskDto>> GetAllTasksAsync();
    }
}
