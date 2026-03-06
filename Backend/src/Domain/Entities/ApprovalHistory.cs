using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class ApprovalHistory : BaseEntity
    {
        public Guid TaskId { get; set; }
        public ApprovalTask Task { get; set; }
        public Guid SubmissionId { get; set; }
        public FormSubmission Submission { get; set; }
        public Guid ApprovedBy { get; set; }
        public string Action { get; set; } // Approved, Rejected, Returned
        public string Comments { get; set; }
        public DateTime ActionAt { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
