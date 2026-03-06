using System;
using WorkflowAutomation.Domain.Enums;

namespace WorkflowAutomation.Application.DTOs.Approvals
{
    public class ApprovalTaskDto
    {
        public Guid Id { get; set; }
        public Guid WorkflowInstanceId { get; set; }
        public string AssignedTo { get; set; }
        public ApprovalTaskStatus Status { get; set; }
        public DateTime? DueDate { get; set; }
        public DateTime CreatedDate { get; set; }
    }
}
