using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Application.DTOs.FormVersions;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IFormVersionService
    {
        Task<IEnumerable<FormVersionDto>> GetFormVersionsAsync(Guid formId);
        Task<FormVersionDto> GetVersionByIdAsync(Guid versionId);
        Task<FormVersionDto> GetLatestVersionAsync(Guid formId);
        Task<FormDto> RollbackToVersionAsync(Guid formId, int versionNumber, string userId);
        Task<FormVersionComparisonDto> CompareVersionsAsync(Guid formId, int version1, int version2);
    }
}