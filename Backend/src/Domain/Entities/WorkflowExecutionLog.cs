using System;
using WorkflowAutomation.Domain.Common;
using WorkflowAutomation.Domain.Enums;

namespace WorkflowAutomation.Domain.Entities
{
    public class WorkflowExecutionLog : BaseEntity
    {
        public Guid InstanceId { get; set; }
        public WorkflowInstance Instance { get; set; }

        // NodeId references a node ID from the workflow definition JSON, not a WorkflowNode table row
        public Guid NodeId { get; set; }

        public ExecutionStatus ExecutionStatus { get; set; }
        public string InputDataJson { get; set; }
        public string OutputDataJson { get; set; }
        public string ErrorMessage { get; set; }
        public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
        public int? Duration { get; set; } // milliseconds
    }
}