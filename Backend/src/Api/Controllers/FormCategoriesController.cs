using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.FormCategories;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/[controller]")]
    [Authorize]
    public class FormCategoriesController : BaseApiController
    {
        private readonly IFormCategoryService _categoryService;

        public FormCategoriesController(IFormCategoryService categoryService)
        {
            _categoryService = categoryService;
        }

        [HttpPost]
        [Authorize(Policy = "CategoryManage")]
        public async Task<IActionResult> CreateCategory([FromBody] CreateFormCategoryDto dto)
        {
            var userId = GetUserId();
            var result = await _categoryService.CreateCategoryAsync(dto, userId);
            return CreatedAtAction(nameof(GetCategory), new { id = result.Id }, result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCategory(Guid id)
        {
            var result = await _categoryService.GetCategoryByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllCategories()
        {
            var result = await _categoryService.GetAllCategoriesAsync();
            return Ok(result);
        }

        [HttpGet("root")]
        public async Task<IActionResult> GetRootCategories()
        {
            var result = await _categoryService.GetRootCategoriesAsync();
            return Ok(result);
        }

        [HttpGet("{parentId}/subcategories")]
        public async Task<IActionResult> GetSubCategories(Guid parentId)
        {
            var result = await _categoryService.GetSubCategoriesAsync(parentId);
            return Ok(result);
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "CategoryManage")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] UpdateFormCategoryDto dto)
        {
            try
            {
                var userId = GetUserId();
                var result = await _categoryService.UpdateCategoryAsync(id, dto, userId);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "CategoryManage")]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            try
            {
                var userId = GetUserId();
                await _categoryService.DeleteCategoryAsync(id, userId);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
        }

        [HttpPost("reorder")]
        [Authorize(Policy = "CategoryManage")]
        public async Task<IActionResult> ReorderCategories([FromBody] List<CategoryReorderDto> reorderList)
        {
            var userId = GetUserId();
            await _categoryService.ReorderCategoriesAsync(reorderList, userId);
            return Ok();
        }
    }
}