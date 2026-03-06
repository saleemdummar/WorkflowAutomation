using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class NotificationTemplate : BaseAuditableEntity
    {
        public string TemplateName { get; set; }
        public string TemplateType { get; set; } // Email, InApp, SMS
        public string Subject { get; set; }
        public string BodyTemplate { get; set; }
        public bool IsActive { get; set; }
    }
}