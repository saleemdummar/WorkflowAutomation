using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.FormTemplates;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    public class FormTemplateService : IFormTemplateService
    {
        private readonly IRepository<FormTemplate> _templateRepository;
        private readonly IFormService _formService;
        private readonly IUnitOfWork _unitOfWork;

        public FormTemplateService(
            IRepository<FormTemplate> templateRepository,
            IFormService formService,
            IUnitOfWork unitOfWork)
        {
            _templateRepository = templateRepository;
            _formService = formService;
            _unitOfWork = unitOfWork;
        }

        public async Task<FormTemplateDto> CreateTemplateAsync(CreateFormTemplateDto dto,string userId)
        {
 
            if (!string.IsNullOrEmpty(dto.FormDefinition))
            {
                try
                {
                    System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(dto.FormDefinition);
                }
                catch (System.Text.Json.JsonException ex)
                {
                    throw new ArgumentException($"Invalid form definition JSON: {ex.Message}", nameof(dto));
                }
            }

            var template = new FormTemplate
            {
                Name = dto.Name,
                Category = dto.Category,
                IsPublic = dto.IsPublic,
                FormDefinition = dto.FormDefinition,
                FormLayoutJson = dto.FormLayout,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow,
                LastModifiedBy = userId,

            };

            await _templateRepository.AddAsync(template);
            await _unitOfWork.CompleteAsync();

            return MapToDto(template);
        }

        public async Task<FormTemplateDto> GetTemplateByIdAsync(Guid id)
        {
            var template = await _templateRepository.GetByIdAsync(id);
            if (template == null) return null;

            return MapToDto(template);
        }

        public async Task<IEnumerable<FormTemplateDto>> GetAllTemplatesAsync()
        {
            var templates = await _templateRepository.GetAllAsync();
            return templates.Select(MapToDto);
        }

        public async Task<IEnumerable<FormTemplateDto>> GetPublicTemplatesAsync()
        {
            var templates = await _templateRepository.FindAsync(t => t.IsPublic);
            return templates.Select(MapToDto);
        }

        public async Task<IEnumerable<FormTemplateDto>> GetTemplatesByCategoryAsync(string category)
        {
            var templates = await _templateRepository.FindAsync(t => t.Category == category);
            return templates.Select(MapToDto);
        }

        public async Task<FormTemplateDto> UpdateTemplateAsync(Guid id, UpdateFormTemplateDto dto)
        {
            var template = await _templateRepository.GetByIdAsync(id);
            if (template == null)
                throw new KeyNotFoundException("Template not found");

            template.Name = dto.Name;
            template.Category = dto.Category;
            template.IsPublic = dto.IsPublic;
            template.FormDefinition = dto.FormDefinition;
            template.FormLayoutJson = dto.FormLayout;

            await _templateRepository.UpdateAsync(template);
            await _unitOfWork.CompleteAsync();

            return MapToDto(template);
        }

        public async Task DeleteTemplateAsync(Guid id)
        {
            var template = await _templateRepository.GetByIdAsync(id);
            if (template == null)
                throw new KeyNotFoundException("Template not found");

            await _templateRepository.DeleteAsync(template);
            await _unitOfWork.CompleteAsync();
        }

        public async Task<FormDto> CreateFormFromTemplateAsync(Guid templateId, string formName, string description, string userId)
        {
            var template = await _templateRepository.GetByIdAsync(templateId);
            if (template == null)
                throw new KeyNotFoundException("Template not found");

            var createFormDto = new CreateFormDto
            {
                Name = formName,
                Description = description,
                Definition = template.FormDefinition,
                Layout = template.FormLayoutJson
            };

            var form = await _formService.CreateFormAsync(createFormDto, userId);

            return form;
        }

        private FormTemplateDto MapToDto(FormTemplate template)
        {
            return new FormTemplateDto
            {
                Id = template.Id,
                Name = template.Name,
                Category = template.Category,
                IsPublic = template.IsPublic,
                FormDefinition = template.FormDefinition,
                FormLayout = template.FormLayoutJson,
                CreatedDate = template.CreatedDate
            };
        }
    }
}