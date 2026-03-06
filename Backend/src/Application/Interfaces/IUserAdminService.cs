using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Auth;

namespace WorkflowAutomation.Application.Interfaces
{
    /// <summary>
    /// Admin service for managing users, roles, and credentials
    /// stored in the Better Auth tables (auth_users, auth_accounts).
    /// </summary>
    public interface IUserAdminService
    {
        // User management
        Task<List<UserDto>> GetUsersAsync(int first = 0, int max = 50, string? search = null);
        Task<UserDto?> GetUserByIdAsync(string userId);
        Task<string> CreateUserAsync(CreateUserDto dto);
        Task UpdateUserAsync(string userId, UpdateUserDto dto);
        Task EnableUserAsync(string userId);
        Task DisableUserAsync(string userId);
        Task ResetPasswordAsync(string userId, string newPassword, bool temporary = true);

        // Role management
        Task<List<string>> GetUserRolesAsync(string userId);
        Task AssignRoleAsync(string userId, string roleName);
        Task RemoveRoleAsync(string userId, string roleName);
        Task<List<RoleDto>> GetRealmRolesAsync();

        // Role/Group → User resolution (for workflow approvals)
        Task<List<string>> GetUserIdsByRoleAsync(string roleName);
        Task<List<string>> GetUserIdsByGroupAsync(string groupId);
    }
}
