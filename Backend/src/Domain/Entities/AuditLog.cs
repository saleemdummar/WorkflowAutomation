using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class AuditLog : BaseEntity
    {
        public string Action { get; set; } = string.Empty; // Create, Update, Delete, Publish, Unpublish, Submit, Approve, Reject, Login, Export, Import
        public string EntityType { get; set; } = string.Empty; // Form, Workflow, Submission, ApprovalTask, User, Template, Category, SystemSetting
        public Guid? EntityId { get; set; }
        public string EntityName { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string? OldValues { get; set; } // JSON snapshot of old values
        public string? NewValues { get; set; } // JSON snapshot of new values
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public string? AdditionalInfo { get; set; } // JSON for extra context
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
