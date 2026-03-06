using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.Workflows;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/[controller]")]
    [Authorize]
    public class WorkflowsController : BaseApiController
    {
        private readonly IWorkflowService _workflowService;
        private readonly IWorkflowEngine _workflowEngine;

        public WorkflowsController(
            IWorkflowService workflowService,
            IWorkflowEngine workflowEngine)
        {
            _workflowService = workflowService;
            _workflowEngine = workflowEngine;
        }

        [HttpPost]
        [Authorize(Policy = "WorkflowCreate")]
        public async Task<IActionResult> CreateWorkflow([FromBody] CreateWorkflowDto dto)
        {
            var userId = GetUserId();
            var result = await _workflowService.CreateWorkflowAsync(dto, userId);
            return CreatedAtAction(nameof(GetWorkflow), new { id = result.Id }, result);
        }

        [HttpGet("{id}")]
        [Authorize(Policy = "WorkflowView")]
        public async Task<IActionResult> GetWorkflow(Guid id)
        {
            var result = await _workflowService.GetWorkflowByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpGet]
        [Authorize(Policy = "WorkflowView")]
        public async Task<IActionResult> GetAllWorkflows()
        {
            var result = await _workflowService.GetAllWorkflowsAsync();
            return Ok(result);
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "WorkflowEdit")]
        public async Task<IActionResult> UpdateWorkflow(Guid id, [FromBody] CreateWorkflowDto dto)
        {
            try
            {
                var userId = GetUserId();
                var result = await _workflowService.UpdateWorkflowAsync(id, dto, userId);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "WorkflowDelete")]
        public async Task<IActionResult> DeleteWorkflow(Guid id)
        {
            try
            {
                await _workflowService.DeleteWorkflowAsync(id, GetUserId());
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // Version management endpoints
        [HttpGet("{id}/versions")]
        [Authorize(Policy = "WorkflowView")]
        public async Task<IActionResult> GetWorkflowVersions(Guid id)
        {
            var result = await _workflowService.GetWorkflowVersionsAsync(id);
            return Ok(result);
        }

        [HttpGet("{id}/versions/{versionId}")]
        [Authorize(Policy = "WorkflowView")]
        public async Task<IActionResult> GetWorkflowVersion(Guid id, Guid versionId)
        {
            var result = await _workflowService.GetVersionByIdAsync(versionId);
            if (result == null || result.WorkflowId != id) return NotFound();
            return Ok(result);
        }

        [HttpPost("{id}/versions/{versionNumber}/rollback")]
        [Authorize(Policy = "WorkflowEdit")]
        public async Task<IActionResult> RollbackToVersion(Guid id, int versionNumber)
        {
            try
            {
                var result = await _workflowService.RollbackToVersionAsync(id, versionNumber, GetUserId());
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("{id}/versions/compare/{version1}/{version2}")]
        [Authorize(Policy = "WorkflowView")]
        public async Task<IActionResult> CompareVersions(Guid id, int version1, int version2)
        {
            try
            {
                var result = await _workflowService.CompareVersionsAsync(id, version1, version2);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/clone")]
        [Authorize(Policy = "WorkflowCreate")]
        public async Task<IActionResult> CloneWorkflow(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var result = await _workflowService.CloneWorkflowAsync(id, userId);
                return CreatedAtAction(nameof(GetWorkflow), new { id = result.Id }, result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpGet("executions")]
        [Authorize(Policy = "WorkflowView")]
        public async Task<IActionResult> GetExecutions()
        {
            var result = await _workflowService.GetExecutionsAsync();
            return Ok(result);
        }

        [HttpGet("executions/{id}")]
        [Authorize(Policy = "WorkflowView")]
        public async Task<IActionResult> GetExecutionDetail(Guid id)
        {
            var result = await _workflowService.GetExecutionDetailAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>
        /// Dry-run/test a workflow without persisting any data.
        /// Simulates execution and validates workflow logic.
        /// </summary>
        [HttpPost("{id}/test")]
        [Authorize(Policy = "WorkflowEdit")]
        public async Task<IActionResult> TestWorkflow(Guid id, [FromBody] WorkflowTestRequest request)
        {
            try
            {
                var result = await _workflowService.TestWorkflowAsync(id, request);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Workflow not found" });
            }
        }

        [HttpPost("executions/{id}/retry")]
        [Authorize(Policy = "WorkflowEdit")]
        public async Task<IActionResult> RetryExecution(Guid id)
        {
            await _workflowEngine.RetryWorkflowInstanceAsync(id, GetUserId());
            return Ok(new { message = "Retry scheduled" });
        }

        [HttpPost("executions/{id}/cancel")]
        [Authorize(Policy = "WorkflowEdit")]
        public async Task<IActionResult> CancelExecution(Guid id)
        {
            await _workflowEngine.CancelWorkflowInstanceAsync(id, GetUserId());
            return Ok(new { message = "Execution cancelled" });
        }

        [HttpGet("analytics")]
        [Authorize(Policy = "WorkflowView")]
        public async Task<IActionResult> GetAnalytics()
        {
            var result = await _workflowService.GetAnalyticsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Export a workflow as a portable JSON document.
        /// </summary>
        [HttpGet("{id}/export")]
        [Authorize(Policy = "WorkflowView")]
        public async Task<IActionResult> ExportWorkflow(Guid id)
        {
            try
            {
                var result = await _workflowService.ExportWorkflowAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Workflow not found" });
            }
        }

        /// <summary>
        /// Import a workflow from a previously exported JSON document.
        /// </summary>
        [HttpPost("import")]
        [Authorize(Policy = "WorkflowCreate")]
        public async Task<IActionResult> ImportWorkflow([FromBody] WorkflowImportDto dto)
        {
            try
            {
                var userId = GetUserId();
                var result = await _workflowService.ImportWorkflowAsync(dto, userId);
                return CreatedAtAction(nameof(GetWorkflow), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
