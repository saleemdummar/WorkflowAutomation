using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.FormCategories;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IFormCategoryService
    {
        Task<FormCategoryDto> CreateCategoryAsync(CreateFormCategoryDto dto, string userId);
        Task<FormCategoryDto> GetCategoryByIdAsync(Guid id);
        Task<IEnumerable<FormCategoryDto>> GetAllCategoriesAsync();
        Task<IEnumerable<FormCategoryDto>> GetRootCategoriesAsync();
        Task<IEnumerable<FormCategoryDto>> GetSubCategoriesAsync(Guid parentId);
        Task<FormCategoryDto> UpdateCategoryAsync(Guid id, UpdateFormCategoryDto dto, string userId);
        Task DeleteCategoryAsync(Guid id, string userId);
        Task ReorderCategoriesAsync(List<CategoryReorderDto> reorderList, string userId);
    }
}