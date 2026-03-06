using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/forms/{formId}/[controller]")]
    [Authorize]
    public class FormVersionsController : BaseApiController
    {
        private readonly IFormVersionService _versionService;

        public FormVersionsController(IFormVersionService versionService)
        {
            _versionService = versionService;
        }

        [HttpGet]
        public async Task<IActionResult> GetFormVersions(Guid formId)
        {
            var result = await _versionService.GetFormVersionsAsync(formId);
            return Ok(result);
        }

        [HttpGet("{versionId}")]
        public async Task<IActionResult> GetVersion(Guid formId, Guid versionId)
        {
            var result = await _versionService.GetVersionByIdAsync(versionId);
            if (result == null || result.FormId != formId) return NotFound();
            return Ok(result);
        }

        [HttpGet("latest")]
        public async Task<IActionResult> GetLatestVersion(Guid formId)
        {
            var result = await _versionService.GetLatestVersionAsync(formId);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost("{versionNumber}/rollback")]
        [Authorize(Policy = "FormEditAny")]
        public async Task<IActionResult> RollbackToVersion(Guid formId, int versionNumber)
        {
            try
            {
                var result = await _versionService.RollbackToVersionAsync(formId, versionNumber, GetUserId());
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpGet("compare/{version1}/{version2}")]
        public async Task<IActionResult> CompareVersions(Guid formId, int version1, int version2)
        {
            try
            {
                var result = await _versionService.CompareVersionsAsync(formId, version1, version2);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpGet("preview/{versionNumber}")]
        public async Task<IActionResult> PreviewVersion(Guid formId, int versionNumber)
        {
            try
            {
                var versions = await _versionService.GetFormVersionsAsync(formId);
                var version = versions.FirstOrDefault(v => v.VersionNumber == versionNumber);
                if (version == null) return NotFound();
                return Ok(version);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }
}