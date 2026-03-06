using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.Auth;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/user-profile")]
    [Authorize]
    public class UserProfileController : BaseApiController
    {
        private readonly IUserProfileSyncService _userProfileSyncService;

        public UserProfileController(IUserProfileSyncService userProfileSyncService)
        {
            _userProfileSyncService = userProfileSyncService;
        }

        /// <summary>
        /// Get the current authenticated user's profile + roles from JWT claims.
        /// </summary>
        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var subjectId = GetUserId();
            var profile = await _userProfileSyncService.GetUserProfileBySubjectIdAsync(subjectId);
            if (profile == null)
            {
                // Auto-sync on first call
                profile = await _userProfileSyncService.EnsureUserProfileExistsAsync(User);
            }

            var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

            var dto = new UserProfileDto
            {
                Id = profile.Id,
                Email = profile.Email,
                FirstName = profile.FirstName,
                LastName = profile.LastName,
                DisplayName = profile.DisplayName,
                Department = profile.Department,
                JobTitle = profile.JobTitle,
                ProfilePictureUrl = profile.ProfilePictureUrl,
                IsActive = profile.IsActive,
                Roles = roles
            };

            return Ok(dto);
        }

        /// <summary>
        /// Update the current user's business-data fields (department, job title, etc.).
        /// </summary>
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateUserProfileDto dto)
        {
            var subjectId = GetUserId();
            var updated = await _userProfileSyncService.UpdateUserProfileAsync(subjectId, dto);

            if (!updated)
                return NotFound(new { message = "User profile not found" });

            return Ok(new { message = "Profile updated successfully" });
        }

        /// <summary>
        /// Search active user profiles (for approver assignment picker, etc.).
        /// </summary>
        [HttpGet("search")]
        public async Task<IActionResult> SearchUsers([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
                return BadRequest(new { message = "Search query must be at least 2 characters" });

            var results = await _userProfileSyncService.SearchUsersAsync(q);
            return Ok(results);
        }
    }
}
