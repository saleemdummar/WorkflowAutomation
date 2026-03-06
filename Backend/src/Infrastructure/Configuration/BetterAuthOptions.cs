namespace WorkflowAutomation.Infrastructure.Configuration
{
    /// <summary>
    /// Configuration for the Better Auth session-based authentication.
    /// The .NET backend validates session tokens by reading the auth_sessions
    /// table directly from the shared SQL Server database.
    /// </summary>
    public class BetterAuthOptions
    {
        public const string SectionName = "BetterAuth";

        /// <summary>
        /// The URL of the Better Auth (Next.js) server.
        /// Used when the backend needs to call Better Auth API endpoints
        /// (e.g. for password-related operations).
        /// </summary>
        public string BaseUrl { get; set; } = "http://localhost:3000";
    }
}
