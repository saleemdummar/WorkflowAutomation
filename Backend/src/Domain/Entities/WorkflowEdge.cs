using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class WorkflowEdge : BaseAuditableEntity
    {
        public Guid WorkflowId { get; set; }
        public Workflow Workflow { get; set; }
        public Guid SourceNodeId { get; set; }
        public WorkflowNode SourceNode { get; set; }
        public Guid TargetNodeId { get; set; }
        public WorkflowNode TargetNode { get; set; }
        public string EdgeLabel { get; set; }
        public string ConditionJson { get; set; }
    }
}