using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.Validation;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/[controller]")]
    [Authorize]
    public class CrossFieldValidationController : BaseApiController
    {
        private readonly ICrossFieldValidationService _validationService;

        public CrossFieldValidationController(ICrossFieldValidationService validationService)
        {
            _validationService = validationService;
        }

        /// <summary>
        /// Create a new cross-field validation rule
        /// </summary>
        [HttpPost]
        [Authorize(Policy = "CrossFieldValidation")]
        public async Task<ActionResult<CrossFieldValidationRuleDto>> CreateRule([FromBody] CreateCrossFieldValidationRuleDto dto)
        {
            try
            {
                var userId = GetUserId();
                var rule = await _validationService.CreateRuleAsync(dto, userId);
                return CreatedAtAction(nameof(GetRule), new { ruleId = rule.Id }, rule);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while creating the validation rule" });
            }
        }

        /// <summary>
        /// Get a specific validation rule
        /// </summary>
        [HttpGet("{ruleId}")]
        public async Task<ActionResult<CrossFieldValidationRuleDto>> GetRule(Guid ruleId)
        {
            try
            {
                var rule = await _validationService.GetRuleAsync(ruleId);
                return Ok(rule);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving the validation rule" });
            }
        }

        /// <summary>
        /// Get all validation rules for a form
        /// </summary>
        [HttpGet("form/{formId}")]
        public async Task<ActionResult<IEnumerable<CrossFieldValidationRuleDto>>> GetFormRules(Guid formId)
        {
            try
            {
                var rules = await _validationService.GetFormRulesAsync(formId);
                return Ok(rules);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving validation rules" });
            }
        }

        /// <summary>
        /// Update a validation rule
        /// </summary>
        [HttpPut("{ruleId}")]
        [Authorize(Policy = "CrossFieldValidation")]
        public async Task<IActionResult> UpdateRule(Guid ruleId, [FromBody] UpdateCrossFieldValidationRuleDto dto)
        {
            try
            {
                var userId = GetUserId();
                await _validationService.UpdateRuleAsync(ruleId, dto, userId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating the validation rule" });
            }
        }

        /// <summary>
        /// Delete a validation rule
        /// </summary>
        [HttpDelete("{ruleId}")]
        [Authorize(Policy = "CrossFieldValidation")]
        public async Task<IActionResult> DeleteRule(Guid ruleId)
        {
            try
            {
                await _validationService.DeleteRuleAsync(ruleId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while deleting the validation rule" });
            }
        }

        /// <summary>
        /// Validate form field values against cross-field rules
        /// </summary>
        [HttpPost("validate/form/{formId}")]
        public async Task<ActionResult<CrossFieldValidationResult>> ValidateFormSubmission(
            Guid formId,
            [FromBody] Dictionary<string, object> fieldValues)
        {
            try
            {
                var result = await _validationService.ValidateFormSubmissionAsync(formId, fieldValues);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during validation" });
            }
        }
    }
}
