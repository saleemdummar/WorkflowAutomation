using System;

namespace WorkflowAutomation.Application.DTOs.Notifications
{
    public class NotificationPreferencesDto
    {
        public bool RealtimeEnabled { get; set; } = true;
        public bool EmailEnabled { get; set; } = true;
        public bool DigestEnabled { get; set; } = false;

        public bool? InAppNotifications { get; set; }
        public bool? EmailOnWorkflowStart { get; set; }
        public bool? EmailOnWorkflowComplete { get; set; }
        public bool? EmailOnWorkflowFail { get; set; }
        public bool? EmailOnApprovalNeeded { get; set; }
        public bool? EmailOnApprovalDecision { get; set; }
        public bool? EmailOnFormSubmission { get; set; }
        public string? EmailDigestFrequency { get; set; }

        public bool ResolveRealtimeEnabled()
        {
            return InAppNotifications ?? RealtimeEnabled;
        }

        public bool ResolveEmailEnabled()
        {
            if (HasDetailedEmailSettings())
            {
                return (EmailOnWorkflowStart ?? false)
                    || (EmailOnWorkflowComplete ?? false)
                    || (EmailOnWorkflowFail ?? false)
                    || (EmailOnApprovalNeeded ?? false)
                    || (EmailOnApprovalDecision ?? false)
                    || (EmailOnFormSubmission ?? false);
            }

            return EmailEnabled;
        }

        public bool ResolveDigestEnabled()
        {
            if (!string.IsNullOrWhiteSpace(EmailDigestFrequency))
            {
                return !EmailDigestFrequency.Equals("Never", StringComparison.OrdinalIgnoreCase);
            }

            return DigestEnabled;
        }

        public NotificationPreferencesDto PopulateDetailedFields()
        {
            InAppNotifications = RealtimeEnabled;
            EmailOnWorkflowStart = EmailEnabled;
            EmailOnWorkflowComplete = EmailEnabled;
            EmailOnWorkflowFail = EmailEnabled;
            EmailOnApprovalNeeded = EmailEnabled;
            EmailOnApprovalDecision = EmailEnabled;
            EmailOnFormSubmission = EmailEnabled;
            EmailDigestFrequency = DigestEnabled ? "Daily" : "Never";

            return this;
        }

        private bool HasDetailedEmailSettings()
        {
            return EmailOnWorkflowStart.HasValue
                || EmailOnWorkflowComplete.HasValue
                || EmailOnWorkflowFail.HasValue
                || EmailOnApprovalNeeded.HasValue
                || EmailOnApprovalDecision.HasValue
                || EmailOnFormSubmission.HasValue;
        }
    }
}
