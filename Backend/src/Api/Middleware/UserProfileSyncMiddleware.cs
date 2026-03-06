using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Middleware
{
    /// <summary>
    /// Automatically syncs the authenticated Better Auth user to a local UserProfile record on each request.
    /// Runs after authentication middleware and before authorization.
    /// Uses in-memory caching in UserProfileSyncService to avoid DB lookups on every request.
    /// </summary>
    public class UserProfileSyncMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<UserProfileSyncMiddleware> _logger;

        public UserProfileSyncMiddleware(RequestDelegate next, ILogger<UserProfileSyncMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IUserProfileSyncService userProfileSyncService)
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                try
                {
                    await userProfileSyncService.EnsureUserProfileExistsAsync(context.User);
                }
                catch (System.Exception ex)
                {
                    // Don't block the request if profile sync fails
                    _logger.LogWarning(ex, "Failed to sync user profile for authenticated user");
                }
            }

            await _next(context);
        }
    }
}
