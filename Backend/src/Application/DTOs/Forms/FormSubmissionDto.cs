using System;

namespace WorkflowAutomation.Application.DTOs.Forms
{
    public class FormSubmissionDto
    {
        public Guid? FormId { get; set; }
        public string? SubmittedBy { get; set; }
        public string SubmissionData { get; set; } = string.Empty;
        public string? DraftId { get; set; }
    }
}
