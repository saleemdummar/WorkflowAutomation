using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class ApprovalEscalationHistory : BaseEntity
    {
        public Guid ApprovalTaskId { get; set; }
        public ApprovalTask ApprovalTask { get; set; }

        public Guid ApprovalEscalationRuleId { get; set; }
        public ApprovalEscalationRule EscalationRule { get; set; }

        public DateTime EscalatedAt { get; set; }
        public Guid? EscalatedFrom { get; set; } // Original assignee
        public Guid? EscalatedTo { get; set; } // New assignee
        public int EscalationLevel { get; set; }
        public string Reason { get; set; }
        public bool WasAutoApproved { get; set; }
    }
}
