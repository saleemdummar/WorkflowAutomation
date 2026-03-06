using System;

namespace WorkflowAutomation.Application.DTOs.FormTemplates
{
    public class FormTemplateDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Category { get; set; }
        public bool IsPublic { get; set; }
        public string FormDefinition { get; set; }
        public string FormLayout { get; set; }
        public DateTime CreatedDate { get; set; }
    }
}