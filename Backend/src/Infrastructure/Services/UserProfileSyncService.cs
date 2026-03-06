using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.DTOs.Auth;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Infrastructure.Data;

namespace WorkflowAutomation.Infrastructure.Services
{
    /// <summary>
    /// Syncs Better Auth user info to local UserProfile on first API call.
    /// Uses an in-memory cache of known subject IDs to avoid DB lookups on every request.
    /// </summary>
    public class UserProfileSyncService : IUserProfileSyncService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<UserProfileSyncService> _logger;

        // In-memory cache of known subject IDs to avoid DB lookups on every request
        private static readonly ConcurrentDictionary<string, bool> _knownSubjects = new();

        public UserProfileSyncService(
            ApplicationDbContext dbContext,
            ILogger<UserProfileSyncService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<UserProfile> EnsureUserProfileExistsAsync(ClaimsPrincipal user)
        {
            var subjectId = user.FindFirst("sub")?.Value
                ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new InvalidOperationException("User has no subject ID claim");

            // Fast path: if we've already seen this user, just update LastLoginAt periodically
            if (_knownSubjects.ContainsKey(subjectId))
            {
                var existingProfile = await _dbContext.UserProfiles
                    .FirstOrDefaultAsync(u => u.SubjectId == subjectId);

                if (existingProfile != null)
                {
                    // Only update LastLoginAt if it's been more than 5 minutes
                    if (!existingProfile.LastLoginAt.HasValue ||
                        (DateTime.UtcNow - existingProfile.LastLoginAt.Value).TotalMinutes > 5)
                    {
                        existingProfile.LastLoginAt = DateTime.UtcNow;
                        existingProfile.UpdatedAt = DateTime.UtcNow;
                        await _dbContext.SaveChangesAsync();
                    }
                    return existingProfile;
                }
            }

            // Slow path: check DB and create if needed
            var profile = await _dbContext.UserProfiles
                .FirstOrDefaultAsync(u => u.SubjectId == subjectId);

            if (profile == null)
            {
                // Extract claims from the JWT
                var email = user.FindFirst("email")?.Value
                    ?? user.FindFirst(ClaimTypes.Email)?.Value
                    ?? "";
                var firstName = user.FindFirst("given_name")?.Value
                    ?? user.FindFirst(ClaimTypes.GivenName)?.Value
                    ?? "";
                var lastName = user.FindFirst("family_name")?.Value
                    ?? user.FindFirst(ClaimTypes.Surname)?.Value
                    ?? "";
                var displayName = $"{firstName} {lastName}".Trim();
                if (string.IsNullOrEmpty(displayName))
                {
                    displayName = user.FindFirst("preferred_username")?.Value ?? email;
                }

                // Parse subject ID as GUID for the entity ID
                var id = Guid.TryParse(subjectId, out var parsedGuid)
                    ? parsedGuid
                    : Guid.NewGuid();

                profile = new UserProfile
                {
                    Id = id,
                    SubjectId = subjectId,
                    Email = email,
                    FirstName = firstName,
                    LastName = lastName,
                    DisplayName = displayName,
                    IsActive = true,
                    FirstLoginAt = DateTime.UtcNow,
                    LastLoginAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.UserProfiles.Add(profile);

                try
                {
                    await _dbContext.SaveChangesAsync();
                    _logger.LogInformation("Created UserProfile for Better Auth user {SubjectId} ({Email})", subjectId, email);
                }
                catch (DbUpdateException)
                {
                    // Handle race condition: another request may have created the profile
                    _dbContext.Entry(profile).State = EntityState.Detached;
                    profile = await _dbContext.UserProfiles
                        .FirstOrDefaultAsync(u => u.SubjectId == subjectId);

                    if (profile == null)
                        throw;
                }
            }
            else
            {
                // Update LastLoginAt and refresh claims data
                profile.LastLoginAt = DateTime.UtcNow;
                profile.UpdatedAt = DateTime.UtcNow;

                // Refresh name/email from latest token claims
                var email = user.FindFirst("email")?.Value ?? user.FindFirst(ClaimTypes.Email)?.Value;
                var firstName = user.FindFirst("given_name")?.Value ?? user.FindFirst(ClaimTypes.GivenName)?.Value;
                var lastName = user.FindFirst("family_name")?.Value ?? user.FindFirst(ClaimTypes.Surname)?.Value;

                if (!string.IsNullOrEmpty(email)) profile.Email = email;
                if (!string.IsNullOrEmpty(firstName)) profile.FirstName = firstName;
                if (!string.IsNullOrEmpty(lastName)) profile.LastName = lastName;
                if (!string.IsNullOrEmpty(firstName) || !string.IsNullOrEmpty(lastName))
                {
                    profile.DisplayName = $"{profile.FirstName} {profile.LastName}".Trim();
                }

                await _dbContext.SaveChangesAsync();
            }

            // Add to known subjects cache
            _knownSubjects.TryAdd(subjectId, true);

            return profile;
        }

        public async Task<UserProfile?> GetUserProfileBySubjectIdAsync(string subjectId)
        {
            return await _dbContext.UserProfiles
                .FirstOrDefaultAsync(u => u.SubjectId == subjectId);
        }

        public async Task<List<UserProfileDto>> GetAllActiveUsersAsync()
        {
            return await _dbContext.UserProfiles
                .Where(u => u.IsActive)
                .Select(u => new UserProfileDto
                {
                    Id = u.Id,
                    Email = u.Email,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    DisplayName = u.DisplayName,
                    Department = u.Department,
                    JobTitle = u.JobTitle,
                    ProfilePictureUrl = u.ProfilePictureUrl,
                    IsActive = u.IsActive
                })
                .ToListAsync();
        }

        public async Task<List<UserProfileSearchResultDto>> SearchUsersAsync(string query)
        {
            var normalizedQuery = query.ToLower();

            return await _dbContext.UserProfiles
                .Where(u => u.IsActive &&
                    (u.Email.ToLower().Contains(normalizedQuery) ||
                     u.FirstName.ToLower().Contains(normalizedQuery) ||
                     u.LastName.ToLower().Contains(normalizedQuery) ||
                     u.DisplayName.ToLower().Contains(normalizedQuery)))
                .Select(u => new UserProfileSearchResultDto
                {
                    Id = u.Id,
                    Email = u.Email,
                    DisplayName = u.DisplayName,
                    Department = u.Department,
                    JobTitle = u.JobTitle
                })
                .Take(20)
                .ToListAsync();
        }

        public async Task<bool> UpdateUserProfileAsync(string subjectId, UpdateUserProfileDto dto)
        {
            var profile = await _dbContext.UserProfiles
                .FirstOrDefaultAsync(u => u.SubjectId == subjectId);

            if (profile == null)
                return false;

            if (dto.Department != null) profile.Department = dto.Department;
            if (dto.JobTitle != null) profile.JobTitle = dto.JobTitle;
            if (dto.ProfilePictureUrl != null) profile.ProfilePictureUrl = dto.ProfilePictureUrl;
            profile.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();
            return true;
        }
    }
}
