using System;
using System.Collections.Generic;
using WorkflowAutomation.Domain.Common;
using WorkflowAutomation.Domain.Enums;

namespace WorkflowAutomation.Domain.Entities
{
    public class ApprovalTask : BaseAuditableEntity
    {
        public Guid WorkflowInstanceId { get; set; }
        public WorkflowInstance WorkflowInstance { get; set; }
        public Guid StepId { get; set; }
        public ApprovalStep Step { get; set; }
        public string AssignedTo { get; set; }
        public ApprovalTaskStatus TaskStatus { get; set; }
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DueDate { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string Comments { get; set; }

        public ICollection<ApprovalHistory> History { get; set; } = new List<ApprovalHistory>();
    }
}
