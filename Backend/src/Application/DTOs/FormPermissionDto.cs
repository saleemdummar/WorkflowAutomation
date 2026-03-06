using System;

namespace WorkflowAutomation.Application.DTOs
{
    public class FormPermissionDto
    {
        public Guid Id { get; set; }
        public Guid FormId { get; set; }
        public Guid? UserId { get; set; }
        public string? UserName { get; set; }
        public string? RoleName { get; set; }
        public string PermissionLevel { get; set; } = "View";
        public Guid GrantedBy { get; set; }
        public DateTime GrantedAt { get; set; }
    }
}
