using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.FormTemplates;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/[controller]")]
    [Authorize]
    public class FormTemplatesController : BaseApiController
    {
        private readonly IFormTemplateService _templateService;

        public FormTemplatesController(IFormTemplateService templateService)
        {
            _templateService = templateService;
        }

        [HttpPost]
        [Authorize(Policy = "TemplateManage")]
        public async Task<IActionResult> CreateTemplate([FromBody] CreateFormTemplateDto dto)
        {
            var userId = GetUserId();
            var result = await _templateService.CreateTemplateAsync(dto, userId);
            return CreatedAtAction(nameof(GetTemplate), new { id = result.Id }, result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTemplate(Guid id)
        {
            var result = await _templateService.GetTemplateByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllTemplates()
        {
            var result = await _templateService.GetAllTemplatesAsync();
            return Ok(result);
        }

        [HttpGet("public")]
        public async Task<IActionResult> GetPublicTemplates()
        {
            var result = await _templateService.GetPublicTemplatesAsync();
            return Ok(result);
        }

        [HttpGet("category/{category}")]
        public async Task<IActionResult> GetTemplatesByCategory(string category)
        {
            var result = await _templateService.GetTemplatesByCategoryAsync(category);
            return Ok(result);
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "TemplateManage")]
        public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] UpdateFormTemplateDto dto)
        {
            try
            {
                var result = await _templateService.UpdateTemplateAsync(id, dto);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "TemplateManage")]
        public async Task<IActionResult> DeleteTemplate(Guid id)
        {
            try
            {
                await _templateService.DeleteTemplateAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("{id}/create-form")]
        public async Task<IActionResult> CreateFormFromTemplate(Guid id, [FromBody] CreateFormFromTemplateDto dto)
        {
            try
            {
                var result = await _templateService.CreateFormFromTemplateAsync(id, dto.FormName, dto.Description, GetUserId());
                return CreatedAtAction("GetForm", "Forms", new { id = result.Id }, result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }

    public class CreateFormFromTemplateDto
    {
        public string FormName { get; set; }
        public string Description { get; set; }
    }
}