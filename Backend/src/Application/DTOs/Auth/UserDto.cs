using System;
using System.Collections.Generic;

namespace WorkflowAutomation.Application.DTOs.Auth
{
    public class UserDto
    {
        public string Id { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public bool Enabled { get; set; }
        public List<string> RealmRoles { get; set; } = new();
        public long? CreatedTimestamp { get; set; }
    }

    public class RoleDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool Composite { get; set; }
        public bool ClientRole { get; set; }
    }
}
