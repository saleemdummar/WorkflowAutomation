using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using WorkflowAutomation.Application.DTOs.Forms;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IFormService
    {
        Task<FormDto> CreateFormAsync(CreateFormDto dto, string userId);
        Task<FormDto?> GetFormByIdAsync(Guid id);
        Task<IEnumerable<FormDto>> GetAllFormsAsync(Guid? categoryId = null);
        Task<FormDto> UpdateFormAsync(Guid id, CreateFormDto dto, string userId);
        Task DeleteFormAsync(Guid formId, string userId, string? reason = null);
        Task<IEnumerable<FormFieldDto>> GetFormFieldsAsync(Guid formId);
        Task SyncFormFieldsAsync(Guid formId, string userId);
        Task<ExportFormDto> ExportFormAsync(Guid formId);
        Task<FormDto> ImportFormAsync(ImportFormDto dto, string userId);
        Task<IEnumerable<FormDto>> SearchFormsAsync(string query);
        Task TransferFormOwnershipAsync(Guid formId, string newOwnerId, string currentUserId);
    }
}
