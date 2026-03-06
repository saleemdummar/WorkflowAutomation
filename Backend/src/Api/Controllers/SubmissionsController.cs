using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/forms/{formId}/[controller]")]
    [Authorize]
    public class SubmissionsController : BaseApiController
    {
        private readonly ISubmissionService _submissionService;
        private readonly ILogger<SubmissionsController> _logger;

        public SubmissionsController(ISubmissionService submissionService, ILogger<SubmissionsController> logger)
        {
            _submissionService = submissionService;
            _logger = logger;
        }

        [HttpPost]
        [Authorize(Policy = "FormSubmit")]
        public async Task<IActionResult> SubmitForm(Guid formId, [FromBody] FormSubmissionDto dto)
        {
            try
            {
                var userId = GetUserId();
                var userGuid = GetUserGuid();

                var result = await _submissionService.SubmitFormAsync(formId, dto, userId, userGuid);

                if (!result.Success)
                {
                    return BadRequest(new { errors = result.Errors });
                }

                return Ok(new { submissionId = result.SubmissionId, message = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SubmitForm controller for form {FormId}", formId);
                throw;
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSubmission(Guid id)
        {
            var userId = GetUserId();
            var userGuid = GetUserGuid();
            var isAdmin = User.IsInRole("super-admin") || User.IsInRole("admin");

            var submission = await _submissionService.GetSubmissionByIdAsync(id, userId, userGuid, isAdmin);
            if (submission == null)
                return NotFound();

            return Ok(submission);
        }

        [HttpGet]
        public async Task<IActionResult> GetSubmissionsByForm(Guid formId)
        {
            var userId = GetUserId();
            var userGuid = GetUserGuid();
            var isAdmin = User.IsInRole("super-admin") || User.IsInRole("admin");

            var submissions = await _submissionService.GetSubmissionsByFormAsync(formId, userId, userGuid, isAdmin);
            return Ok(submissions);
        }

        [HttpPost("draft")]
        public async Task<IActionResult> SaveDraft(Guid formId, [FromBody] FormSubmissionDto dto)
        {
            var userId = GetUserId();
            var userGuid = GetUserGuid();

            var result = await _submissionService.SaveDraftAsync(formId, dto, userId, userGuid);

            if (!result.Success)
            {
                return BadRequest(new { errors = result.Errors });
            }

            return Ok(new
            {
                id = result.SubmissionId,
                message = result.Message,
                draftSavedAt = DateTime.UtcNow
            });
        }

        [HttpGet("drafts")]
        public async Task<IActionResult> GetMyDrafts(Guid formId)
        {
            var userId = GetUserId();
            var userGuid = GetUserGuid();

            var drafts = await _submissionService.GetMyDraftsAsync(formId, userId, userGuid);
            return Ok(drafts);
        }

        [HttpGet("draft/{draftId}")]
        public async Task<IActionResult> GetDraft(Guid formId, Guid draftId)
        {
            var userId = GetUserId();
            var userGuid = GetUserGuid();

            var result = await _submissionService.GetDraftAsync(formId, draftId, userId, userGuid);

            if (!result.Success)
            {
                return NotFound(result.Message);
            }

            return Ok(new
            {
                id = result.Id,
                formId = formId,
                draftSavedAt = result.DraftSavedAt,
                submissionData = result.SubmissionData
            });
        }

        [HttpDelete("draft/{draftId}")]
        public async Task<IActionResult> DeleteDraft(Guid formId, Guid draftId)
        {
            var userId = GetUserId();
            var userGuid = GetUserGuid();
            var result = await _submissionService.DeleteDraftAsync(formId, draftId, userId, userGuid);

            if (!result.Success)
            {
                return NotFound(result.Message);
            }

            return Ok(new { message = result.Message });
        }

        [HttpPost("draft/{draftId}/submit")]
        public async Task<IActionResult> SubmitDraft(Guid formId, Guid draftId)
        {
            var userId = GetUserId();
            var userGuid = GetUserGuid();

            var result = await _submissionService.SubmitDraftAsync(formId, draftId, userId, userGuid);

            if (!result.Success)
            {
                return BadRequest(new { errors = result.Errors });
            }

            return Ok(new
            {
                id = result.SubmissionId,
                message = result.Message
            });
        }

        [HttpGet("/api/submissions/my-submissions")]
        public async Task<IActionResult> GetMySubmissions()
        {
            var userGuid = GetUserGuid();
            var submissions = await _submissionService.GetMySubmissionsAsync(userGuid);
            return Ok(submissions);
        }

        [HttpGet("/api/submissions/{id}")]
        public async Task<IActionResult> GetSubmissionById(Guid id)
        {
            var userId = GetUserId();
            var userGuid = GetUserGuid();
            var isAdmin = User.IsInRole("super-admin") || User.IsInRole("admin");

            var submission = await _submissionService.GetSubmissionByIdAsync(id, userId, userGuid, isAdmin);
            if (submission == null)
            {
                return NotFound();
            }

            return Ok(submission);
        }

        [HttpGet("/api/submissions")]
        [Authorize(Policy = "SubmissionViewAll")]
        public async Task<IActionResult> GetAllSubmissions()
        {
            var submissions = await _submissionService.GetAllSubmissionsAsync();
            return Ok(submissions);
        }

        [HttpGet("/api/submissions/drafts")]
        public async Task<IActionResult> GetAllDrafts()
        {
            var userId = GetUserId();
            var userGuid = GetUserGuid();

            var drafts = await _submissionService.GetAllDraftsAsync(userId, userGuid);
            return Ok(drafts);
        }
    }
}
