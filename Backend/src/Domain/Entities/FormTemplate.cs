using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class FormTemplate : BaseAuditableEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public bool IsPublic { get; set; }
        public string FormDefinition { get; set; } = "{}"; // JSON
        public string FormLayoutJson { get; set; } = "{}"; // JSON
    }
}
