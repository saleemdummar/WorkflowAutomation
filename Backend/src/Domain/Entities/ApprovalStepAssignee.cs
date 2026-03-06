using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class ApprovalStepAssignee : BaseAuditableEntity
    {
        public Guid StepId { get; set; }
        public ApprovalStep Step { get; set; }
        public Guid? UserId { get; set; }
        public Guid? RoleId { get; set; }
        public string AssignmentType { get; set; } // User, Role, Dynamic
    }
}