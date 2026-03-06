using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class Notification : BaseEntity
    {
        public Guid UserId { get; set; }
        public string NotificationType { get; set; } // TaskAssigned, ApprovalRequired, StatusChanged, Escalation, FormPublished, SubmissionReceived, DeadlineReminder, etc.
        public string Subject { get; set; }
        public string Message { get; set; }
        public string RelatedEntityType { get; set; } // Submission, Task, Workflow, Form
        public Guid? RelatedEntityId { get; set; }
        public bool IsRead { get; set; }
        public bool IsSent { get; set; }
        public DateTime? SentAt { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}