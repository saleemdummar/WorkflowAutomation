using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class FormSubmissionData : BaseAuditableEntity
    {
        public Guid SubmissionId { get; set; }
        public FormSubmission Submission { get; set; }
        public Guid FieldId { get; set; }
        public FormField Field { get; set; }
        public string FieldValue { get; set; }
        public string FieldValueType { get; set; } // String, Number, Boolean, Date, File, JSON
    }
}