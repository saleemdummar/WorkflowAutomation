using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class WorkflowVersionHistory : BaseEntity
    {
        public Guid WorkflowId { get; set; }
        public Workflow Workflow { get; set; }
        public int VersionNumber { get; set; }
        public string WorkflowDefinitionJson { get; set; }
        public string ChangeDescription { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}