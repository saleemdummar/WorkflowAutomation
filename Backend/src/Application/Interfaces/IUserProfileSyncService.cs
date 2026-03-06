using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Auth;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IUserProfileSyncService
    {
        /// <summary>
        /// Ensures a UserProfile record exists for the authenticated user.
        /// Creates one on first login, updates LastLoginAt on subsequent calls.
        /// </summary>
        Task<UserProfile> EnsureUserProfileExistsAsync(ClaimsPrincipal user);

        /// <summary>
        /// Gets a UserProfile by subject ID.
        /// </summary>
        Task<UserProfile?> GetUserProfileBySubjectIdAsync(string subjectId);

        /// <summary>
        /// Gets all active user profiles.
        /// </summary>
        Task<List<UserProfileDto>> GetAllActiveUsersAsync();

        /// <summary>
        /// Search user profiles by name or email.
        /// </summary>
        Task<List<UserProfileSearchResultDto>> SearchUsersAsync(string query);

        /// <summary>
        /// Updates business-data fields (department, job title, profile picture) for a user profile.
        /// </summary>
        Task<bool> UpdateUserProfileAsync(string subjectId, UpdateUserProfileDto dto);
    }
}
