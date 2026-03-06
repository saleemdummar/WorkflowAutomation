using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    /// <summary>
    /// Form-level access control permission entry.
    /// Grants specific users or roles access to individual forms.
    /// </summary>
    public class FormPermission : BaseEntity
    {
        public Guid FormId { get; set; }
        public Form Form { get; set; } = null!;

        /// <summary>
        /// The subject ID of the user (null if role-based).
        /// </summary>
        public Guid? UserId { get; set; }

        /// <summary>
        /// The role name (null if user-based).
        /// </summary>
        public string? RoleName { get; set; }

        /// <summary>
        /// Permission level: View, Submit, Edit, Admin
        /// </summary>
        public string PermissionLevel { get; set; } = "View";

        public Guid GrantedBy { get; set; }
        public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
    }
}
