using System;

namespace WorkflowAutomation.Application.DTOs.Escalation
{
    public class EscalationRuleRequest
    {
        public string? WorkflowId { get; set; }
        public int EscalationHours { get; set; }
        public string? EscalateToUserId { get; set; }
        public string? EscalateToRoleId { get; set; }
        public string? EscalateToGroupId { get; set; }
        public bool EscalateToManager { get; set; }
        public int MaxEscalationLevels { get; set; } = 3;
        public string? EscalationMessageTemplate { get; set; }
        public bool ReassignOnEscalation { get; set; } = true;
        public bool SendReminder { get; set; }
        public bool SendEmailNotification { get; set; } = true;
        public bool SendInAppNotification { get; set; } = true;
        public bool AutoApprove { get; set; }
        public bool AutoReject { get; set; }
        public bool IsActive { get; set; }
    }

    public class EscalationRuleDto
    {
        public Guid Id { get; set; }
        public string? WorkflowId { get; set; }
        public string? WorkflowName { get; set; }
        public int EscalationHours { get; set; }
        public string? EscalateToUserId { get; set; }
        public string? EscalateToRoleId { get; set; }
        public string? EscalateToGroupId { get; set; }
        public bool EscalateToManager { get; set; }
        public bool SendReminder { get; set; }
        public bool SendEmailNotification { get; set; }
        public bool SendInAppNotification { get; set; }
        public bool AutoApprove { get; set; }
        public bool AutoReject { get; set; }
        public bool IsActive { get; set; }
        public int MaxEscalationLevels { get; set; }
        public string? EscalationMessageTemplate { get; set; }
        public bool ReassignOnEscalation { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
