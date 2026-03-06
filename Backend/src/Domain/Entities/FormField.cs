using System;
using System.Collections.Generic;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class FormField : BaseAuditableEntity
    {
        public Guid FormId { get; set; }
        public Form Form { get; set; }
        public string FieldName { get; set; }
        public string FieldLabel { get; set; }
        public string FieldType { get; set; }
        public string FieldConfigJson { get; set; }
        public bool IsRequired { get; set; }
        public int DisplayOrder { get; set; }
        public Guid? ParentFieldId { get; set; }
        public FormField ParentField { get; set; }
        public Guid? ConditionGroupId { get; set; }
        public ConditionGroup ConditionGroup { get; set; }

        public ICollection<FormField> ChildFields { get; set; }
        public ICollection<FormCondition> TriggerConditions { get; set; }
        public ICollection<ConditionAction> TargetActions { get; set; }
        public ICollection<FormSubmissionData> SubmissionData { get; set; }
    }
}
