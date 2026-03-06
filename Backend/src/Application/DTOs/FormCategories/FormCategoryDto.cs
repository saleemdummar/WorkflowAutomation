using System;
using System.Collections.Generic;

namespace WorkflowAutomation.Application.DTOs.FormCategories
{
    public class FormCategoryDto
    {
        public Guid Id { get; set; }
        public string CategoryName { get; set; }
        public Guid? ParentCategoryId { get; set; }
        public string ParentCategoryName { get; set; }
        public string Description { get; set; }
        public int DisplayOrder { get; set; }
        public DateTime CreatedDate { get; set; }
        public int FormsCount { get; set; }
        public List<FormCategoryDto> SubCategories { get; set; }
    }
}