using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class FormSubmissionAttachment : BaseEntity
    {
        public Guid SubmissionId { get; set; }
        public FormSubmission Submission { get; set; }
        public Guid? FieldId { get; set; }
        public FormField Field { get; set; }
        public string FileName { get; set; }
        public long FileSize { get; set; }
        public string FileType { get; set; }
        public string FilePath { get; set; }
        public Guid UploadedBy { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}