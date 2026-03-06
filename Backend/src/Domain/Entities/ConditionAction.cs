using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class ConditionAction : BaseAuditableEntity
    {
        public Guid ConditionId { get; set; }
        public FormCondition Condition { get; set; }
        public string ActionType { get; set; } // Show, Hide, Enable, Disable, SetValue, etc.
        public Guid TargetFieldId { get; set; }
        public FormField TargetField { get; set; }
        public string ActionConfigJson { get; set; }
        public int ExecutionOrder { get; set; }
    }
}