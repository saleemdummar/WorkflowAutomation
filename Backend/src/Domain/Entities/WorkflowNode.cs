using System;
using System.Collections.Generic;
using WorkflowAutomation.Domain.Common;
using WorkflowAutomation.Domain.Enums;

namespace WorkflowAutomation.Domain.Entities
{
    public class WorkflowNode : BaseAuditableEntity
    {
        public Guid WorkflowId { get; set; }
        public Workflow Workflow { get; set; }
        public WorkflowNodeType NodeType { get; set; }
        public string NodeName { get; set; }
        public string NodeConfigJson { get; set; }
        public decimal PositionX { get; set; }
        public decimal PositionY { get; set; }

        public ICollection<WorkflowEdge> SourceEdges { get; set; }
        public ICollection<WorkflowEdge> TargetEdges { get; set; }
        // CurrentInstances removed - WorkflowInstance.CurrentNodeId is no longer a foreign key
    }
}
