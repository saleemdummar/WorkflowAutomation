using System;
using System.Collections.Generic;

namespace WorkflowAutomation.Application.DTOs.Auth
{
    public class UserProfileDto
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string? JobTitle { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public bool IsActive { get; set; }
        public List<string> Roles { get; set; } = new();
    }

    public class UpdateUserProfileDto
    {
        public string? Department { get; set; }
        public string? JobTitle { get; set; }
        public string? ProfilePictureUrl { get; set; }
    }

    public class UserProfileSearchResultDto
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string? JobTitle { get; set; }
    }
}
