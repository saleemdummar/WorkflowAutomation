using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace WorkflowAutomation.Api.Controllers
{
    /// <summary>
    /// Base controller providing shared helpers for all API controllers.
    /// Eliminates the duplicated GetUserId() / GetUserGuid() pattern.
    /// </summary>
    [ApiController]
    public abstract class BaseApiController : ControllerBase
    {
        /// <summary>
        /// Extracts the authenticated user's string ID from JWT claims.
        /// Checks "sub" claim first, then falls back to NameIdentifier.
        /// </summary>
        protected string GetUserId() =>
            User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("User not authenticated");

        /// <summary>
        /// Extracts the authenticated user's ID as a Guid.
        /// Throws InvalidOperationException if the ID is not a valid GUID.
        /// </summary>
        protected Guid GetUserGuid()
        {
            var userId = GetUserId();
            if (!Guid.TryParse(userId, out var guid))
                throw new InvalidOperationException($"Invalid user ID format: {userId}");
            return guid;
        }

        /// <summary>
        /// Gets the user's display name from claims, with fallback to "Unknown".
        /// </summary>
        protected string GetUserName() =>
            User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

        /// <summary>
        /// Gets the user's email from claims, with fallback to empty string.
        /// </summary>
        protected string GetUserEmail() =>
            User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;

        /// <summary>
        /// Checks whether the current user has admin or super-admin role.
        /// </summary>
        protected bool IsAdmin =>
            User.IsInRole("super-admin") || User.IsInRole("admin");
    }
}
