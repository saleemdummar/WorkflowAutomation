using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class ApprovalEscalationRule : BaseAuditableEntity
    {
        public Guid WorkflowId { get; set; }
        public Workflow Workflow { get; set; }

        public Guid? ApprovalStepId { get; set; }
        public ApprovalStep ApprovalStep { get; set; }

        // Escalation timing
        public int EscalationDelayHours { get; set; } // Hours after due date before escalation
        public bool IsEnabled { get; set; } = true;

        // Escalation targets
        public bool EscalateToManager { get; set; } = true;
        public Guid? EscalateToUserId { get; set; }
        public Guid? EscalateToRoleId { get; set; }
        public Guid? EscalateToGroupId { get; set; }

        // Notification settings
        public bool SendNotificationToOriginalApprover { get; set; } = true;
        public bool SendNotificationToEscalationTarget { get; set; } = true;
        public string? EscalationMessageTemplate { get; set; }

        // Escalation actions
        public bool AutoApproveOnEscalation { get; set; } = false;
        public bool AutoRejectOnEscalation { get; set; } = false;
        public bool ReassignOnEscalation { get; set; } = true;

        // Tracking
        public int MaxEscalationLevels { get; set; } = 3;
        public int EscalationLevel { get; set; } = 1;
    }
}
