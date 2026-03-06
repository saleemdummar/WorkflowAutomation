using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class SystemSetting : BaseEntity
    {
        public string SettingKey { get; set; }
        public string SettingValue { get; set; }
        public string SettingType { get; set; } // String, Number, Boolean, JSON
        public string Description { get; set; }
        public string Category { get; set; } // General, Email, Security, Workflow, Notifications
        public bool IsEditable { get; set; }
        public Guid? UpdatedBy { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}