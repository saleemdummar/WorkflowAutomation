using System;
using System.Collections.Generic;
using WorkflowAutomation.Domain.Common;
using WorkflowAutomation.Domain.Enums;

namespace WorkflowAutomation.Domain.Entities
{
    public class WorkflowInstance : BaseAuditableEntity
    {
        public Guid WorkflowId { get; set; }
        public Workflow Workflow { get; set; }
        public Guid? SubmissionId { get; set; }
        public FormSubmission? Submission { get; set; }
        public WorkflowInstanceStatus InstanceStatus { get; set; }
        public Guid? CurrentNodeId { get; set; }
        // CurrentNode navigation removed - CurrentNodeId is just a tracking field, not a foreign key
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
        public string ErrorMessage { get; set; }

        public ICollection<WorkflowExecutionLog> ExecutionLogs { get; set; } = new List<WorkflowExecutionLog>();
        public ICollection<ApprovalTask> ApprovalTasks { get; set; } = new List<ApprovalTask>();
    }
}
