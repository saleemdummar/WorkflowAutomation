using System;

namespace WorkflowAutomation.Application.DTOs.Forms
{
    public class SubmissionDto
    {
        public Guid Id { get; set; }
        public Guid FormId { get; set; }
        public string FormName { get; set; }
        public string SubmittedBy { get; set; }
        public string SubmitterName { get; set; }
        public string SubmissionData { get; set; }
        public string Status { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? CreatedDate { get; set; }
        public DateTime? LastModifiedDate { get; set; }
    }
}