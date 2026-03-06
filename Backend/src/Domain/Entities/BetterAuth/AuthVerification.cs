using System;

namespace WorkflowAutomation.Domain.Entities.BetterAuth
{
    /// <summary>
    /// Entity representing the Better Auth 'auth_verifications' table.
    /// Stores email verification tokens and password reset tokens.
    /// </summary>
    public class AuthVerification
    {
        /// <summary>
        /// Primary key - UUID string.
        /// </summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// Identifier (usually email or user ID).
        /// </summary>
        public string Identifier { get; set; } = string.Empty;

        /// <summary>
        /// The verification value/token.
        /// </summary>
        public string Value { get; set; } = string.Empty;

        /// <summary>
        /// When this verification expires.
        /// </summary>
        public DateTime ExpiresAt { get; set; }

        /// <summary>
        /// When the verification was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the verification was last updated.
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
