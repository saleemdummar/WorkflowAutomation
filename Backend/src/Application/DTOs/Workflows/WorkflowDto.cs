using System;
using System.ComponentModel.DataAnnotations;

namespace WorkflowAutomation.Application.DTOs.Workflows
{
    public class WorkflowDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Definition { get; set; }
        public int Version { get; set; }
        public bool IsActive { get; set; }
        public bool IsPublished { get; set; }
        public Guid? FormId { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    public class CreateWorkflowDto
    {
        [Required(ErrorMessage = "Workflow name is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Workflow name must be between 1 and 100 characters")]
        public string Name { get; set; }

        public string Description { get; set; }

        [Required(ErrorMessage = "Workflow definition is required")]
        public string Definition { get; set; }

        public bool IsActive { get; set; }
        public bool IsPublished { get; set; }
        public Guid? FormId { get; set; }
        public string ChangeDescription { get; set; }
    }
}
