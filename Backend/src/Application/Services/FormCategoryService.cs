using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.FormCategories;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    public class FormCategoryService : IFormCategoryService
    {
        private readonly IRepository<FormCategory> _categoryRepository;
        private readonly IRepository<Form> _formRepository;
        private readonly IUnitOfWork _unitOfWork;

        public FormCategoryService(
            IRepository<FormCategory> categoryRepository,
            IRepository<Form> formRepository,
            IUnitOfWork unitOfWork)
        {
            _categoryRepository = categoryRepository;
            _formRepository = formRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<FormCategoryDto> CreateCategoryAsync(CreateFormCategoryDto dto, string userId)
        {
            if (dto.ParentCategoryId.HasValue)
            {
                var parent = await _categoryRepository.GetByIdAsync(dto.ParentCategoryId.Value);
                if (parent == null)
                    throw new ArgumentException("Parent category not found");
            }

            var category = new FormCategory
            {
                CategoryName = dto.CategoryName,
                ParentCategoryId = dto.ParentCategoryId,
                Description = dto.Description,
                DisplayOrder = dto.DisplayOrder,
                CreatedBy = userId,
                LastModifiedBy = userId
            };

            await _categoryRepository.AddAsync(category);
            await _unitOfWork.CompleteAsync();

            return await MapToDtoAsync(category);
        }

        public async Task<FormCategoryDto> GetCategoryByIdAsync(Guid id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null) return null;
            return await MapToDtoAsync(category);
        }

        public async Task<IEnumerable<FormCategoryDto>> GetAllCategoriesAsync()
        {
            var categories = await _categoryRepository.GetAllAsync();
            var forms = await _formRepository.GetAllAsync();
            var formCountByCategory = forms.GroupBy(f => f.CategoryId).ToDictionary(g => g.Key ?? Guid.Empty, g => g.Count());
            var categoryList = categories.ToList();
            var dtos = categoryList.Select(c => MapToDtoInMemory(c, categoryList, formCountByCategory))
                .OrderBy(c => c.DisplayOrder)
                .ToList();

            return dtos;
        }

        public async Task<IEnumerable<FormCategoryDto>> GetRootCategoriesAsync()
        {
            var categories = await _categoryRepository.GetAllAsync();
            var forms = await _formRepository.GetAllAsync();
            var formCountByCategory = forms.GroupBy(f => f.CategoryId)
                .ToDictionary(g => g.Key ?? Guid.Empty, g => g.Count());
            var categoryList = categories.ToList();

            return categoryList
                .Where(c => c.ParentCategoryId == null)
                .OrderBy(c => c.DisplayOrder)
                .Select(c => MapToDtoInMemory(c, categoryList, formCountByCategory))
                .ToList();
        }

        public async Task<IEnumerable<FormCategoryDto>> GetSubCategoriesAsync(Guid parentId)
        {
            var subCats = await _categoryRepository.FindAsync(c => c.ParentCategoryId == parentId);
            var subCatIds = subCats.Select(c => c.Id).ToHashSet();
            var allCategories = await _categoryRepository.GetAllAsync();
            var forms = await _formRepository.GetAllAsync();
            var formCountByCategory = forms.GroupBy(f => f.CategoryId).ToDictionary(g => g.Key ?? Guid.Empty, g => g.Count());
            var categoryList = allCategories.ToList();

            return categoryList
                .Where(c => c.ParentCategoryId == parentId)
                .OrderBy(c => c.DisplayOrder)
                .Select(c => MapToDtoInMemory(c, categoryList, formCountByCategory))
                .ToList();
        }

        public async Task<FormCategoryDto> UpdateCategoryAsync(Guid id, UpdateFormCategoryDto dto, string userId)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
                throw new KeyNotFoundException("Category not found");

            if (dto.ParentCategoryId.HasValue && dto.ParentCategoryId.Value == id)
                throw new ArgumentException("Category cannot be its own parent");

            if (dto.ParentCategoryId.HasValue)
            {
                var parent = await _categoryRepository.GetByIdAsync(dto.ParentCategoryId.Value);
                if (parent == null)
                    throw new ArgumentException("Parent category not found");
            }

            category.CategoryName = dto.CategoryName;
            category.ParentCategoryId = dto.ParentCategoryId;
            category.Description = dto.Description;
            category.DisplayOrder = dto.DisplayOrder;
            category.LastModifiedBy = userId;
            category.LastModifiedDate = DateTime.UtcNow;

            await _categoryRepository.UpdateAsync(category);
            await _unitOfWork.CompleteAsync();

            return await MapToDtoAsync(category);
        }

        public async Task DeleteCategoryAsync(Guid id, string userId)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
                throw new KeyNotFoundException("Category not found");

            var hasSubCategories = await _categoryRepository.CountAsync(c => c.ParentCategoryId == id);
            if (hasSubCategories > 0)
                throw new InvalidOperationException("Cannot delete category with subcategories");

            var hasAssociatedForms = await _formRepository.CountAsync(f => f.CategoryId == id);
            if (hasAssociatedForms > 0)
                throw new InvalidOperationException("Cannot delete category with associated forms");

            await _categoryRepository.DeleteAsync(category);
            await _unitOfWork.CompleteAsync();
        }

        public async Task ReorderCategoriesAsync(List<CategoryReorderDto> reorderList, string userId)
        {
            foreach (var reorder in reorderList)
            {
                var category = await _categoryRepository.GetByIdAsync(reorder.CategoryId);
                if (category != null)
                {
                    category.DisplayOrder = reorder.NewDisplayOrder;
                    category.LastModifiedBy = userId;
                    category.LastModifiedDate = DateTime.UtcNow;
                    await _categoryRepository.UpdateAsync(category);
                }
            }

            await _unitOfWork.CompleteAsync();
        }

        private async Task<FormCategoryDto> MapToDtoAsync(FormCategory category)
        {
            var formsCount = await _formRepository.CountAsync(f => f.CategoryId == category.Id);

            var allCategories = await _categoryRepository.GetAllAsync();
            var categoryList = allCategories.ToList();
            var forms = await _formRepository.GetAllAsync();
            var formCountByCategory = forms.GroupBy(f => f.CategoryId)
                .ToDictionary(g => g.Key ?? Guid.Empty, g => g.Count());

            return MapToDtoInMemory(category, categoryList, formCountByCategory);
        }

        /// <summary>
        /// Maps a FormCategory to DTO using pre-loaded data to avoid N+1 queries.
        /// </summary>
        private static FormCategoryDto MapToDtoInMemory(
            FormCategory category,
            List<FormCategory> allCategories,
            Dictionary<Guid, int> formCountByCategory)
        {
            formCountByCategory.TryGetValue(category.Id, out var formsCount);

            var subCategoryDtos = allCategories
                .Where(c => c.ParentCategoryId == category.Id)
                .OrderBy(c => c.DisplayOrder)
                .Select(sub => MapToDtoInMemory(sub, allCategories, formCountByCategory))
                .ToList();

            return new FormCategoryDto
            {
                Id = category.Id,
                CategoryName = category.CategoryName,
                ParentCategoryId = category.ParentCategoryId,
                ParentCategoryName = category.ParentCategory?.CategoryName,
                Description = category.Description,
                DisplayOrder = category.DisplayOrder,
                CreatedDate = category.CreatedDate,
                FormsCount = formsCount,
                SubCategories = subCategoryDtos
            };
        }
    }
}