using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using WorkflowAutomation.Application.DTOs.Workflows;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IWorkflowService
    {
        Task<WorkflowDto> CreateWorkflowAsync(CreateWorkflowDto dto, string userId);
        Task<WorkflowDto> GetWorkflowByIdAsync(Guid id);
        Task<IEnumerable<WorkflowDto>> GetAllWorkflowsAsync();
        Task<WorkflowDto> UpdateWorkflowAsync(Guid id, CreateWorkflowDto dto, string userId);
        Task DeleteWorkflowAsync(Guid id, string userId);

        // Version management
        Task<IEnumerable<WorkflowVersionDto>> GetWorkflowVersionsAsync(Guid workflowId);
        Task<WorkflowVersionDto> GetVersionByIdAsync(Guid versionId);
        Task<WorkflowDto> RollbackToVersionAsync(Guid workflowId, int versionNumber, string userId);
        Task<WorkflowVersionCompareDto> CompareVersionsAsync(Guid workflowId, int version1, int version2);

        // Execution management
        Task<IEnumerable<WorkflowExecutionListItemDto>> GetExecutionsAsync();
        Task<WorkflowExecutionDetailDto?> GetExecutionDetailAsync(Guid instanceId);
        Task<WorkflowDto> CloneWorkflowAsync(Guid workflowId, string userId);

        // Analytics
        Task<IEnumerable<WorkflowAnalyticsDto>> GetAnalyticsAsync();

        // Testing
        Task<WorkflowTestResult> TestWorkflowAsync(Guid workflowId, WorkflowTestRequest? request);

        // Import / Export
        Task<WorkflowExportDto> ExportWorkflowAsync(Guid workflowId);
        Task<WorkflowDto> ImportWorkflowAsync(WorkflowImportDto dto, string userId);
    }
}
