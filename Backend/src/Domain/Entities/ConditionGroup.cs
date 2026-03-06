using System;
using System.Collections.Generic;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class ConditionGroup : BaseAuditableEntity
    {
        public Guid FormId { get; set; }
        public Form Form { get; set; }
        public string GroupName { get; set; }
        public Guid? ParentGroupId { get; set; }
        public ConditionGroup ParentGroup { get; set; }
        public string LogicalOperator { get; set; } // AND, OR

        public ICollection<ConditionGroup> SubGroups { get; set; } = new List<ConditionGroup>();
        public ICollection<FormCondition> Conditions { get; set; } = new List<FormCondition>();
    }
}