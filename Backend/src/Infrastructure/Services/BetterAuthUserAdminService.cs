using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.DTOs.Auth;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities.BetterAuth;
using WorkflowAutomation.Infrastructure.Data;

namespace WorkflowAutomation.Infrastructure.Services
{
    /// <summary>
    /// Implements <see cref="IUserAdminService"/> by querying the Better Auth
    /// tables (auth_users, auth_accounts, auth_sessions) directly in the
    /// shared SQL Server database.
    ///
    /// Password hashing uses PBKDF2-HMAC-SHA512 (100 000 iterations, 16-byte salt,
    /// 64-byte key) — the same algorithm configured in the Next.js Better Auth
    /// instance so both sides can create / verify credentials.
    ///
    /// The .NET backend is the single source of truth for roles and permissions;
    /// it reads / writes the <c>auth_users.role</c> field directly.
    /// </summary>
    public class BetterAuthUserAdminService : IUserAdminService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<BetterAuthUserAdminService> _logger;

        // PBKDF2 parameters — must match the Next.js auth.ts config exactly
        private const int PW_ITERATIONS = 100_000;
        private const int PW_KEY_LENGTH = 64;
        private static readonly HashAlgorithmName PW_ALGORITHM = HashAlgorithmName.SHA512;

        // All application roles (source of truth)
        private static readonly List<RoleDto> ApplicationRoles = new()
        {
            new() { Id = "super-admin", Name = "super-admin", Description = "Full system access. Can manage users, roles, and all settings." },
            new() { Id = "admin", Name = "admin", Description = "Administrative access to forms, workflows, categories, templates, and system settings." },
            new() { Id = "form-designer", Name = "form-designer", Description = "Can create, edit, publish, and manage forms and categories." },
            new() { Id = "workflow-designer", Name = "workflow-designer", Description = "Can create, edit, and manage workflows." },
            new() { Id = "approver", Name = "approver", Description = "Can view and act on approval tasks." },
            new() { Id = "submitter", Name = "submitter", Description = "Can submit published forms and view own submissions." },
            new() { Id = "viewer", Name = "viewer", Description = "Read-only access to published forms." },
        };

        public BetterAuthUserAdminService(
            ApplicationDbContext dbContext,
            ILogger<BetterAuthUserAdminService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        #region User Management

        public async Task<List<UserDto>> GetUsersAsync(int first = 0, int max = 50, string? search = null)
        {
            var query = _dbContext.AuthUsers.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(u => (u.Name ?? "").Contains(search) || u.Email.Contains(search));
            }

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip(first)
                .Take(max)
                .Select(u => MapUserToUserDto(u))
                .ToListAsync();

            return users;
        }

        public async Task<UserDto?> GetUserByIdAsync(string userId)
        {
            var user = await _dbContext.AuthUsers.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId);

            return user == null ? null : MapUserToUserDto(user);
        }

        public async Task<string> CreateUserAsync(CreateUserDto dto)
        {
            var userId = Guid.NewGuid().ToString();
            var accountId = Guid.NewGuid().ToString();
            var now = DateTime.UtcNow;
            var passwordHash = HashPassword(dto.Password);
            var displayName = $"{dto.FirstName} {dto.LastName}".Trim();
            var roleStr = dto.Roles.Count > 0 ? string.Join(",", dto.Roles) : "submitter";

            await using var tx = await _dbContext.Database.BeginTransactionAsync();

            try
            {
                var user = new AuthUser
                {
                    Id = userId,
                    Name = displayName,
                    Email = dto.Email,
                    EmailVerified = true,
                    CreatedAt = now,
                    UpdatedAt = now,
                    Role = roleStr,
                    Banned = false,
                };

                var account = new AuthAccount
                {
                    Id = accountId,
                    UserId = userId,
                    AccountId = userId,
                    ProviderId = "credential",
                    Password = passwordHash,
                    CreatedAt = now,
                    UpdatedAt = now,
                };

                _dbContext.AuthUsers.Add(user);
                _dbContext.AuthAccounts.Add(account);
                await _dbContext.SaveChangesAsync();
                await tx.CommitAsync();

                _logger.LogInformation("Created Better Auth user {UserId} ({Email})", userId, dto.Email);
                return userId;
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
            {
                await tx.RollbackAsync();
                throw new HttpRequestException("User with this email already exists",
                    ex, System.Net.HttpStatusCode.Conflict);
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task UpdateUserAsync(string userId, UpdateUserDto dto)
        {
            var user = await _dbContext.AuthUsers.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return;

            if (dto.FirstName != null || dto.LastName != null)
            {
                var currentName = user.Name ?? "";
                var currentParts = currentName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                var first = dto.FirstName ?? (currentParts.Length > 0 ? currentParts[0] : "");
                var last = dto.LastName ?? (currentParts.Length > 1 ? currentParts[1] : "");
                user.Name = $"{first} {last}".Trim();
            }

            if (dto.Email != null)
            {
                user.Email = dto.Email;
            }

            if (dto.Enabled.HasValue)
            {
                user.Banned = !dto.Enabled.Value;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }

        public async Task EnableUserAsync(string userId)
        {
            await SetBannedStatusAsync(userId, false);
        }

        public async Task DisableUserAsync(string userId)
        {
            await SetBannedStatusAsync(userId, true);
        }

        public async Task ResetPasswordAsync(string userId, string newPassword, bool temporary = true)
        {
            var passwordHash = HashPassword(newPassword);

            var account = await _dbContext.AuthAccounts
                .FirstOrDefaultAsync(a => a.UserId == userId && a.ProviderId == "credential");

            if (account == null)
            {
                _logger.LogWarning("No credential account found for user {UserId} to reset password", userId);
                return;
            }

            account.Password = passwordHash;
            account.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }

        #endregion

        #region Role Management

        public async Task<List<string>> GetUserRolesAsync(string userId)
        {
            var roleStr = await _dbContext.AuthUsers.AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => u.Role)
                .FirstOrDefaultAsync();

            if (string.IsNullOrWhiteSpace(roleStr))
                return new List<string>();

            return roleStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();
        }

        public async Task AssignRoleAsync(string userId, string roleName)
        {
            var currentRoles = await GetUserRolesAsync(userId);
            if (currentRoles.Contains(roleName, StringComparer.OrdinalIgnoreCase))
                return;

            currentRoles.Add(roleName);
            await SetUserRoleStringAsync(userId, string.Join(",", currentRoles));
        }

        public async Task RemoveRoleAsync(string userId, string roleName)
        {
            var currentRoles = await GetUserRolesAsync(userId);
            currentRoles.RemoveAll(r => r.Equals(roleName, StringComparison.OrdinalIgnoreCase));
            await SetUserRoleStringAsync(userId, string.Join(",", currentRoles));
        }

        public Task<List<RoleDto>> GetRealmRolesAsync()
        {
            return Task.FromResult(new List<RoleDto>(ApplicationRoles));
        }

        #endregion

        #region Role/Group → User Resolution

        public async Task<List<string>> GetUserIdsByRoleAsync(string roleName)
        {
            var candidates = await _dbContext.AuthUsers.AsNoTracking()
                .Where(u => !u.Banned && (u.Role ?? "").Contains(roleName))
                .ToListAsync();

            return candidates
                .Where(u => !string.IsNullOrWhiteSpace(u.Role) &&
                            u.Role.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                                .Any(r => r.Equals(roleName, StringComparison.OrdinalIgnoreCase)))
                .Select(u => u.Id)
                .ToList();
        }

        public Task<List<string>> GetUserIdsByGroupAsync(string groupId)
        {
            return GetUserIdsByGroupInternalAsync(groupId);
        }

        #endregion

        #region Password Hashing (PBKDF2-HMAC-SHA512)

        /// <summary>
        /// Hashes a password using PBKDF2-HMAC-SHA512.
        /// Output format: <c>{iterations}:{salt_hex}:{key_hex}</c>
        /// This MUST match the hashPassword() function in the Next.js auth.ts.
        /// </summary>
        private static string HashPassword(string password)
        {
            var salt = RandomNumberGenerator.GetBytes(16);
            var key = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                PW_ITERATIONS,
                PW_ALGORITHM,
                PW_KEY_LENGTH);

            return $"{PW_ITERATIONS}:{Convert.ToHexString(salt).ToLowerInvariant()}:{Convert.ToHexString(key).ToLowerInvariant()}";
        }

        #endregion

        #region Private Helpers

        private async Task SetBannedStatusAsync(string userId, bool banned)
        {
            var user = await _dbContext.AuthUsers.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return;

            user.Banned = banned;
            user.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }

        private async Task SetUserRoleStringAsync(string userId, string roleString)
        {
            var user = await _dbContext.AuthUsers.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return;

            user.Role = roleString;
            user.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }

        private static UserDto MapUserToUserDto(AuthUser user)
        {
            var name = user.Name ?? "";
            var nameParts = name.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var roleStr = user.Role ?? "";
            var banned = user.Banned;
            var createdAt = user.CreatedAt;

            return new UserDto
            {
                Id = user.Id,
                Username = user.Email ?? "",
                Email = user.Email ?? "",
                FirstName = nameParts.Length > 0 ? nameParts[0] : "",
                LastName = nameParts.Length > 1 ? nameParts[1] : "",
                Enabled = !banned,
                RealmRoles = string.IsNullOrWhiteSpace(roleStr)
                    ? new List<string>()
                    : roleStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
                CreatedTimestamp = new DateTimeOffset(createdAt, TimeSpan.Zero).ToUnixTimeMilliseconds(),
            };
        }

        private async Task<List<string>> GetUserIdsByGroupInternalAsync(string groupId)
        {
            var normalized = groupId?.Trim();
            if (string.IsNullOrWhiteSpace(normalized))
                return new List<string>();

            if (ApplicationRoles.Any(r => r.Name.Equals(normalized, StringComparison.OrdinalIgnoreCase)))
            {
                return await GetUserIdsByRoleAsync(normalized);
            }

            // Interpret groupId as a department label stored on UserProfiles.
            var ids = await (
                from profile in _dbContext.UserProfiles.AsNoTracking()
                join auth in _dbContext.AuthUsers.AsNoTracking() on profile.SubjectId equals auth.Id
                where profile.Department != null
                      && profile.Department == normalized
                      && !auth.Banned
                select auth.Id
            ).ToListAsync();

            return ids;
        }

        private static bool IsUniqueConstraintViolation(DbUpdateException ex)
        {
            if (ex.InnerException is SqlException sqlEx)
            {
                return sqlEx.Number == 2627 || sqlEx.Number == 2601;
            }

            return false;
        }

        #endregion
    }
}
