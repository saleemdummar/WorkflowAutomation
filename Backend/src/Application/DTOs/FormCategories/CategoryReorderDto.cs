using System;

namespace WorkflowAutomation.Application.DTOs.FormCategories
{
    public class CategoryReorderDto
    {
        public Guid CategoryId { get; set; }
        public int NewDisplayOrder { get; set; }
    }
}