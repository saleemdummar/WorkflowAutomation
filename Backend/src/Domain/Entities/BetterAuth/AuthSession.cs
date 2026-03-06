using System;

namespace WorkflowAutomation.Domain.Entities.BetterAuth
{
    /// <summary>
    /// Entity representing the Better Auth 'auth_sessions' table.
    /// Stores active user sessions for token-based authentication.
    /// </summary>
    public class AuthSession
    {
        /// <summary>
        /// Primary key - UUID string.
        /// </summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// The session token (used as Bearer token for API calls).
        /// </summary>
        public string Token { get; set; } = string.Empty;

        /// <summary>
        /// When the session expires.
        /// </summary>
        public DateTime ExpiresAt { get; set; }

        /// <summary>
        /// IP address of the client that created the session.
        /// </summary>
        public string? IpAddress { get; set; }

        /// <summary>
        /// User agent string of the client.
        /// </summary>
        public string? UserAgent { get; set; }

        /// <summary>
        /// Foreign key to auth_users.
        /// </summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// When the session was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the session was last updated (e.g., token refresh).
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual AuthUser? User { get; set; }
    }
}
