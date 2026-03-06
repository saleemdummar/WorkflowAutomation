using System;
using System.Collections.Generic;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class ApprovalStep : BaseAuditableEntity
    {
        public Guid WorkflowId { get; set; }
        public Workflow Workflow { get; set; }

        // NodeId references a node ID from the workflow definition JSON, not a WorkflowNode table row
        public Guid NodeId { get; set; }

        public string StepName { get; set; }
        public int StepOrder { get; set; }
        public string ApprovalType { get; set; } // Single, Multiple, Sequential, Parallel
        public int RequiredApprovals { get; set; }
        public bool EscalationEnabled { get; set; }
        public int? EscalationDeadlineHours { get; set; }
        public Guid? EscalationUserId { get; set; }

        public ICollection<ApprovalStepAssignee> Assignees { get; set; }
        public ICollection<ApprovalTask> Tasks { get; set; }
    }
}