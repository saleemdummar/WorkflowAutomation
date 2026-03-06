using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class NotificationPreference : BaseEntity
    {
        public Guid UserId { get; set; }
        public bool RealtimeEnabled { get; set; } = true;
        public bool EmailEnabled { get; set; } = true;
        public bool DigestEnabled { get; set; } = false;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
