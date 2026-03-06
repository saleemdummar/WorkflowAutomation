using System.ComponentModel.DataAnnotations;

namespace WorkflowAutomation.Application.DTOs.FormTemplates
{
    public class UpdateFormTemplateDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        [StringLength(50)]
        public string Category { get; set; }

        public bool IsPublic { get; set; }

        [Required]
        public string FormDefinition { get; set; }

        public string FormLayout { get; set; }
    }
}