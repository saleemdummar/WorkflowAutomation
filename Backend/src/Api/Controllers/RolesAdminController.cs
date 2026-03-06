using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    /// <summary>
    /// Admin endpoints for listing application roles.
    /// Only accessible by SuperAdmin.
    /// </summary>
    [Route("api/admin/roles")]
    [Authorize(Policy = "UserManagement")]
    public class RolesAdminController : BaseApiController
    {
        private readonly IUserAdminService _userAdminService;

        public RolesAdminController(IUserAdminService userAdminService)
        {
            _userAdminService = userAdminService;
        }

        /// <summary>
        /// List all application roles.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var roles = await _userAdminService.GetRealmRolesAsync();
                return Ok(roles);
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Failed to fetch roles" });
            }
        }
    }
}
