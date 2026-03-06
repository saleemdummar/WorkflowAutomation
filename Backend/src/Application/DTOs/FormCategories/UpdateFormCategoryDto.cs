using System;
using System.ComponentModel.DataAnnotations;

namespace WorkflowAutomation.Application.DTOs.FormCategories
{
    public class UpdateFormCategoryDto
    {
        [Required]
        [StringLength(100)]
        public string CategoryName { get; set; }

        public Guid? ParentCategoryId { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        public int DisplayOrder { get; set; }
    }
}