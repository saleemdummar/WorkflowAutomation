using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.Auth;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    /// <summary>
    /// Admin endpoints for managing users, roles, and credentials
    /// stored in the Better Auth tables.
    /// Only accessible by SuperAdmin.
    /// </summary>
    [Route("api/admin/users")]
    [Authorize(Policy = "UserManagement")]
    public class UsersAdminController : BaseApiController
    {
        private readonly IUserAdminService _userAdminService;

        public UsersAdminController(IUserAdminService userAdminService)
        {
            _userAdminService = userAdminService;
        }

        /// <summary>
        /// List all users with optional search and pagination.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int first = 0,
            [FromQuery] int max = 50,
            [FromQuery] string? search = null)
        {
            try
            {
                var users = await _userAdminService.GetUsersAsync(first, max, search);
                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Failed to fetch users", details = ex.Message });
            }
        }

        /// <summary>
        /// Get a specific user by ID.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var user = await _userAdminService.GetUserByIdAsync(id);
                if (user == null) return NotFound();
                return Ok(user);
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Failed to fetch user", details = ex.Message });
            }
        }

        /// <summary>
        /// Create a new user.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
        {
            try
            {
                var userId = await _userAdminService.CreateUserAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = userId }, new { id = userId, message = "User created successfully" });
            }
            catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
            {
                return Conflict(new { message = "User with this username or email already exists" });
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Failed to create user", details = ex.Message });
            }
        }

        /// <summary>
        /// Update a user.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateUserDto dto)
        {
            try
            {
                await _userAdminService.UpdateUserAsync(id, dto);
                return Ok(new { message = "User updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Failed to update user", details = ex.Message });
            }
        }

        /// <summary>
        /// Enable a user.
        /// </summary>
        [HttpPost("{id}/enable")]
        public async Task<IActionResult> Enable(string id)
        {
            try
            {
                await _userAdminService.EnableUserAsync(id);
                return Ok(new { message = "User enabled successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Failed to enable user", details = ex.Message });
            }
        }

        /// <summary>
        /// Disable a user.
        /// </summary>
        [HttpPost("{id}/disable")]
        public async Task<IActionResult> Disable(string id)
        {
            try
            {
                await _userAdminService.DisableUserAsync(id);
                return Ok(new { message = "User disabled successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Failed to disable user", details = ex.Message });
            }
        }

        /// <summary>
        /// Get a user's roles.
        /// </summary>
        [HttpGet("{id}/roles")]
        public async Task<IActionResult> GetRoles(string id)
        {
            try
            {
                var roles = await _userAdminService.GetUserRolesAsync(id);
                return Ok(roles);
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Failed to fetch user roles", details = ex.Message });
            }
        }

        /// <summary>
        /// Assign a role to a user.
        /// </summary>
        [HttpPost("{id}/roles")]
        public async Task<IActionResult> AssignRole(string id, [FromBody] AssignRoleDto dto)
        {
            try
            {
                await _userAdminService.AssignRoleAsync(id, dto.RoleName);
                return Ok(new { message = $"Role '{dto.RoleName}' assigned successfully" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Failed to assign role", details = ex.Message });
            }
        }

        /// <summary>
        /// Remove a role from a user.
        /// </summary>
        [HttpDelete("{id}/roles/{role}")]
        public async Task<IActionResult> RemoveRole(string id, string role)
        {
            try
            {
                await _userAdminService.RemoveRoleAsync(id, role);
                return Ok(new { message = $"Role '{role}' removed successfully" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Failed to remove role", details = ex.Message });
            }
        }

        /// <summary>
        /// Reset a user's password.
        /// </summary>
        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordDto dto)
        {
            try
            {
                await _userAdminService.ResetPasswordAsync(id, dto.Password, dto.Temporary);
                return Ok(new { message = "Password reset successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Failed to reset password", details = ex.Message });
            }
        }
    }
}
