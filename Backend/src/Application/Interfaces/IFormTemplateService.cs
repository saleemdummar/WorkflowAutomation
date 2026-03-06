using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Application.DTOs.FormTemplates;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IFormTemplateService
    {
        Task<FormTemplateDto> CreateTemplateAsync(CreateFormTemplateDto dto,string userId);
        Task<FormTemplateDto> GetTemplateByIdAsync(Guid id);
        Task<IEnumerable<FormTemplateDto>> GetAllTemplatesAsync();
        Task<IEnumerable<FormTemplateDto>> GetPublicTemplatesAsync();
        Task<IEnumerable<FormTemplateDto>> GetTemplatesByCategoryAsync(string category);
        Task<FormTemplateDto> UpdateTemplateAsync(Guid id, UpdateFormTemplateDto dto);
        Task DeleteTemplateAsync(Guid id);
        Task<FormDto> CreateFormFromTemplateAsync(Guid templateId, string formName, string description, string userId);
    }
}