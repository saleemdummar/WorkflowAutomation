using System;
using System.Collections.Generic;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class FormCondition : BaseAuditableEntity
    {
        public Guid FormId { get; set; }
        public Form Form { get; set; }
        public string ConditionName { get; set; }
        public Guid? ConditionGroupId { get; set; }
        public ConditionGroup ConditionGroup { get; set; }
        public Guid TriggerFieldId { get; set; }
        public FormField TriggerField { get; set; }
        public string Operator { get; set; } // Equals, NotEquals, etc.
        public string ComparisonValue { get; set; }
        public string LogicalOperator { get; set; } // AND, OR, NOT
        public int ExecutionOrder { get; set; }
        public bool IsActive { get; set; }

        public ICollection<ConditionAction> Actions { get; set; }
    }
}