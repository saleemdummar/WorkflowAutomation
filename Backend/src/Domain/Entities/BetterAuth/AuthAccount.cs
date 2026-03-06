using System;

namespace WorkflowAutomation.Domain.Entities.BetterAuth
{
    /// <summary>
    /// Entity representing the Better Auth 'auth_accounts' table.
    /// Links users to authentication providers (e.g., 'credential' for email/password).
    /// </summary>
    public class AuthAccount
    {
        /// <summary>
        /// Primary key - UUID string.
        /// </summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// Foreign key to auth_users.
        /// </summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Account identifier at the provider (often same as UserId for credential).
        /// </summary>
        public string AccountId { get; set; } = string.Empty;

        /// <summary>
        /// Provider identifier (e.g., "credential", "google", "github").
        /// </summary>
        public string ProviderId { get; set; } = string.Empty;

        /// <summary>
        /// OAuth access token (null for credential provider).
        /// </summary>
        public string? AccessToken { get; set; }

        /// <summary>
        /// OAuth refresh token (null for credential provider).
        /// </summary>
        public string? RefreshToken { get; set; }

        /// <summary>
        /// When the access token expires.
        /// </summary>
        public DateTime? AccessTokenExpiresAt { get; set; }

        /// <summary>
        /// When the refresh token expires.
        /// </summary>
        public DateTime? RefreshTokenExpiresAt { get; set; }

        /// <summary>
        /// OAuth scope.
        /// </summary>
        public string? Scope { get; set; }

        /// <summary>
        /// OAuth ID token.
        /// </summary>
        public string? IdToken { get; set; }

        /// <summary>
        /// Hashed password (for credential provider only).
        /// Format: "{iterations}:{salt_hex}:{key_hex}" using PBKDF2-HMAC-SHA512.
        /// </summary>
        public string? Password { get; set; }

        /// <summary>
        /// When the account was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the account was last updated.
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual AuthUser? User { get; set; }
    }
}
