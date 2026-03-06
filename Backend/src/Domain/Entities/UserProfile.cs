using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    /// <summary>
    /// Thin business-data-only user profile synced from Better Auth on first login.
    /// This is NOT for authentication — just for FK references and display names.
    /// The Id matches the Better Auth user "id" (a GUID).
    /// </summary>
    public class UserProfile : BaseEntity
    {
        /// <summary>
        /// Better Auth user id ("sub" claim) stored as string for queries.
        /// </summary>
        public string SubjectId { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string? JobTitle { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime FirstLoginAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
