using System;

namespace WorkflowAutomation.Application.DTOs
{
    public class AddPermissionRequest
    {
        public Guid? UserId { get; set; }
        public string? RoleName { get; set; }
        public string? PermissionLevel { get; set; }
    }

    public class UpdatePermissionRequest
    {
        public string? PermissionLevel { get; set; }
    }
}
