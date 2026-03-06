using System;

namespace WorkflowAutomation.Application.DTOs.Approvals
{
    public class ApprovalActionRequest
    {
        public string Action { get; set; } = string.Empty;
        public string Comments { get; set; } = string.Empty;
    }

    public class ApprovalDecisionRequest
    {
        public bool Approved { get; set; }
        public string? Comments { get; set; }
    }

    public class EnrichedApprovalTaskDto
    {
        public Guid Id { get; set; }
        public Guid WorkflowInstanceId { get; set; }
        public string? AssignedTo { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public DateTime CreatedDate { get; set; }
        public string? Comments { get; set; }
        public DateTime? CompletedAt { get; set; }
        public Guid? FormId { get; set; }
        public string FormName { get; set; } = "Unknown Form";
        public Guid? SubmissionId { get; set; }
        public string? SubmittedBy { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public bool IsOverdue { get; set; }
        public string Priority { get; set; } = "normal";
    }

    public class ApprovalTaskDetailDto
    {
        public Guid Id { get; set; }
        public Guid WorkflowInstanceId { get; set; }
        public string? AssignedTo { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public DateTime CreatedDate { get; set; }
        public string? Comments { get; set; }
        public DateTime? CompletedAt { get; set; }
        public Guid? FormId { get; set; }
        public string FormName { get; set; } = "Unknown Form";
        public string? FormDefinition { get; set; }
        public Guid? SubmissionId { get; set; }
        public string? SubmittedBy { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public string? SubmissionStatus { get; set; }
        public object? SubmissionData { get; set; }
        public bool IsOverdue { get; set; }
        public string Priority { get; set; } = "normal";
    }

    public class ApprovalHistoryEntryDto
    {
        public string Decision { get; set; } = "Unknown";
        public string? DecidedBy { get; set; }
        public DateTime DecidedAt { get; set; }
        public string? Comments { get; set; }
    }
}
