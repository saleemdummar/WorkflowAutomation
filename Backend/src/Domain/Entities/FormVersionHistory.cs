using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class FormVersionHistory : BaseEntity
    {
        public Guid FormId { get; set; }
        public Form Form { get; set; }
        public int VersionNumber { get; set; }
        public string FormDefinitionJson { get; set; }
        public string FormLayoutJson { get; set; }
        public string ChangeDescription { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}