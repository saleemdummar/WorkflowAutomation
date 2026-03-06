using System.Collections.Generic;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class Workflow : BaseAuditableEntity
    {
        public string WorkflowName { get; set; }
        public string WorkflowDescription { get; set; }
        public Guid? FormId { get; set; }
        public Form Form { get; set; }
        public int WorkflowVersion { get; set; }
        public bool IsActive { get; set; }
        public bool IsPublished { get; set; }
        public string WorkflowDefinitionJson { get; set; }

        public ICollection<WorkflowNode> Nodes { get; set; }
        public ICollection<WorkflowEdge> Edges { get; set; }
        public ICollection<WorkflowVersionHistory> VersionHistory { get; set; }
        public ICollection<ApprovalStep> ApprovalSteps { get; set; }
        public ICollection<FormSubmission> Submissions { get; set; }
        public ICollection<WorkflowInstance> Instances { get; set; }
    }
}
