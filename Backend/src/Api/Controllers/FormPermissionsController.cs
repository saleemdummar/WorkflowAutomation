using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/forms/{formId}/permissions")]
    [Authorize]
    public class FormPermissionsController : BaseApiController
    {
        private readonly IFormPermissionService _permissionService;

        public FormPermissionsController(IFormPermissionService permissionService)
        {
            _permissionService = permissionService;
        }

        [HttpGet]
        public async Task<IActionResult> GetPermissions(Guid formId)
        {
            var permissions = await _permissionService.GetPermissionsAsync(formId);
            return Ok(permissions);
        }

        [HttpPost]
        [Authorize(Policy = "FormEditAny")]
        public async Task<IActionResult> AddPermission(Guid formId, [FromBody] AddPermissionRequest request)
        {
            try
            {
                var result = await _permissionService.AddPermissionAsync(formId, request, GetUserGuid(), GetUserName(), GetUserEmail());
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPut("{permissionId}")]
        [Authorize(Policy = "FormEditAny")]
        public async Task<IActionResult> UpdatePermission(Guid formId, Guid permissionId, [FromBody] UpdatePermissionRequest request)
        {
            try
            {
                var result = await _permissionService.UpdatePermissionAsync(formId, permissionId, request);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpDelete("{permissionId}")]
        [Authorize(Policy = "FormEditAny")]
        public async Task<IActionResult> RemovePermission(Guid formId, Guid permissionId)
        {
            try
            {
                await _permissionService.RemovePermissionAsync(formId, permissionId, GetUserGuid(), GetUserName(), GetUserEmail());
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }
}
