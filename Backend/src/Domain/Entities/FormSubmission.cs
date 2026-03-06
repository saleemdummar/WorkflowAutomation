using System;
using System.Collections.Generic;
using WorkflowAutomation.Domain.Common;
using WorkflowAutomation.Domain.Enums;

namespace WorkflowAutomation.Domain.Entities
{
    public class FormSubmission : BaseAuditableEntity
    {
        public Guid FormId { get; set; }
        public Form Form { get; set; }
        public Guid? WorkflowId { get; set; }
        public Workflow Workflow { get; set; }
        public SubmissionStatus SubmissionStatus { get; set; }
        public Guid? CurrentWorkflowNodeId { get; set; }
        public WorkflowNode CurrentWorkflowNode { get; set; }
        public Guid SubmittedBy { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public bool IsDraft { get; set; }
        public DateTime? DraftSavedAt { get; set; }

        public ICollection<FormSubmissionData> SubmissionData { get; set; } = new List<FormSubmissionData>();
        public ICollection<FormSubmissionAttachment> Attachments { get; set; } = new List<FormSubmissionAttachment>();
        public ICollection<WorkflowInstance> WorkflowInstances { get; set; } = new List<WorkflowInstance>();
        public ICollection<ApprovalTask> ApprovalTasks { get; set; } = new List<ApprovalTask>();
        public ICollection<ApprovalHistory> ApprovalHistory { get; set; } = new List<ApprovalHistory>();
    }
}
