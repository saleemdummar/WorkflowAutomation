using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/[controller]")]
    [Authorize]
    public class FormsController : BaseApiController
    {
        private readonly IFormService _formService;
        private readonly IFormLifecycleService _lifecycleService;

        public FormsController(IFormService formService, IFormLifecycleService lifecycleService)
        {
            _formService = formService;
            _lifecycleService = lifecycleService;
        }

        [HttpPost]
        [Authorize(Policy = "FormCreate")]
        public async Task<IActionResult> CreateForm([FromBody] CreateFormDto dto)
        {
            try
            {
                var userId = GetUserId();
                var result = await _formService.CreateFormAsync(dto, userId);
                return CreatedAtAction(nameof(GetForm), new { id = result.Id }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { errors = ex.Message.Split('\n') });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetForm(Guid id)
        {
            var result = await _formService.GetFormByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllForms([FromQuery] Guid? categoryId = null)
        {
            var result = await _formService.GetAllFormsAsync(categoryId);
            return Ok(result);
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "FormCreate")]
        public async Task<IActionResult> UpdateForm(Guid id, [FromBody] CreateFormDto dto)
        {
            try
            {
                var userId = GetUserId();
                var result = await _formService.UpdateFormAsync(id, dto, userId);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Form not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { errors = ex.Message.Split('\n').Where(e => !string.IsNullOrWhiteSpace(e)).ToArray() });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An unexpected error occurred" });
            }
        }

        [HttpPost("{id}/sync-fields")]
        [Authorize(Policy = "FormCreate")]
        public async Task<IActionResult> SyncFormFields(Guid id)
        {
            try
            {
                var userId = GetUserId();
                await _formService.SyncFormFieldsAsync(id, userId);
                return Ok(new { message = "Form fields synchronized successfully" });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Form not found" });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An unexpected error occurred" });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "FormDelete")]
        public async Task<IActionResult> DeleteForm(Guid id, [FromQuery] string? reason = null)
        {
            try
            {
                var userId = GetUserId();
                await _formService.DeleteFormAsync(id, userId, reason);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpGet("{id}/fields")]
        public async Task<IActionResult> GetFormFields(Guid id)
        {
            try
            {
                var result = await _formService.GetFormFieldsAsync(id);
                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception)
            {
                return NotFound();
            }
        }

        [HttpPatch("{id}/publish")]
        [Authorize(Policy = "FormPublish")]
        public async Task<IActionResult> PublishForm(Guid id)
        {
            try
            {
                var userId = GetUserId();
                await _lifecycleService.PublishFormAsync(id, userId);
                return Ok(new { message = "Form published successfully" });
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { errors = ex.Message.Split('\n') });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpPatch("{id}/unpublish")]
        [Authorize(Policy = "FormPublish")]
        public async Task<IActionResult> UnpublishForm(Guid id)
        {
            try
            {
                var userId = GetUserId();
                await _lifecycleService.UnpublishFormAsync(id, userId);
                return Ok(new { message = "Form unpublished successfully" });
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpGet("{id}/export")]
        public async Task<IActionResult> ExportForm(Guid id)
        {
            try
            {
                var export = await _formService.ExportFormAsync(id);
                return Ok(export);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpPost("import")]
        [Authorize(Policy = "FormCreate")]
        public async Task<IActionResult> ImportForm([FromBody] ImportFormDto dto)
        {
            try
            {
                var userId = GetUserId();
                var result = await _formService.ImportFormAsync(dto, userId);
                return CreatedAtAction(nameof(GetForm), new { id = result.Id }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { errors = ex.Message.Split('\n') });
            }
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchForms([FromQuery] string query)
        {
            var result = await _formService.SearchFormsAsync(query);
            return Ok(result);
        }

        [HttpPost("{id}/transfer-ownership")]
        [Authorize(Policy = "FormEditAny")]
        public async Task<IActionResult> TransferFormOwnership(Guid id, [FromBody] TransferOwnershipDto dto)
        {
            try
            {
                var currentUserId = GetUserId();
                await _formService.TransferFormOwnershipAsync(id, dto.NewOwnerId, currentUserId);
                return Ok(new { message = "Form ownership transferred successfully" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpPost("{id}/archive")]
        [Authorize(Policy = "FormEditAny")]
        public async Task<IActionResult> ArchiveForm(Guid id, [FromBody] ArchiveFormDto? dto = null)
        {
            try
            {
                var userId = GetUserId();
                await _lifecycleService.ArchiveFormAsync(id, userId, dto?.ArchiveReason);
                return Ok(new { message = "Form archived successfully" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpPost("{id}/restore")]
        [Authorize(Policy = "FormEditAny")]
        public async Task<IActionResult> RestoreForm(Guid id, [FromBody] RestoreFormDto? dto = null)
        {
            try
            {
                var userId = GetUserId();
                await _lifecycleService.RestoreFormAsync(id, userId, dto?.RestoreReason);
                return Ok(new { message = "Form restored successfully" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/expiration")]
        [Authorize(Policy = "FormEditAny")]
        public async Task<IActionResult> SetFormExpiration(Guid id, [FromBody] SetFormExpirationDto dto)
        {
            try
            {
                var userId = GetUserId();
                await _lifecycleService.SetFormExpirationAsync(id, dto.ExpirationDate, userId, dto.ExpirationReason);
                return Ok(new { message = "Form expiration set successfully" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpPost("{id}/schedule")]
        [Authorize(Policy = "FormPublish")]
        public async Task<IActionResult> ScheduleFormPublishing(Guid id, [FromBody] ScheduleFormPublishingDto dto)
        {
            try
            {
                var userId = GetUserId();
                await _lifecycleService.ScheduleFormPublishingAsync(id, dto.PublishDate, dto.UnpublishDate, userId, dto.ScheduleReason);
                return Ok(new { message = "Form publishing scheduled successfully" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        [HttpGet("{id}/lifecycle-status")]
        public async Task<IActionResult> GetFormLifecycleStatus(Guid id)
        {
            try
            {
                var status = await _lifecycleService.GetFormLifecycleStatusAsync(id);
                return Ok(status);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("archived")]
        public async Task<IActionResult> GetArchivedForms()
        {
            var forms = await _lifecycleService.GetArchivedFormsAsync();
            return Ok(forms);
        }

        [HttpGet("expired")]
        public async Task<IActionResult> GetExpiredForms()
        {
            var forms = await _lifecycleService.GetExpiredFormsAsync();
            return Ok(forms);
        }
    }

    public class TransferOwnershipDto
    {
        public string NewOwnerId { get; set; } = string.Empty;
    }
}
