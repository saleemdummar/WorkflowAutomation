using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/[controller]")]
    [Authorize(Policy = "AuditLogs")]
    public class AuditLogsController : BaseApiController
    {
        private readonly IAuditLogService _auditLogService;

        public AuditLogsController(IAuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? entityType = null,
            [FromQuery] string? action = null,
            [FromQuery] Guid? userId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? search = null)
        {
            var (items, totalCount) = await _auditLogService.GetLogsAsync(
                page, pageSize, entityType, action, userId, fromDate, toDate, search);

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var log = await _auditLogService.GetByIdAsync(id);
            if (log == null) return NotFound();
            return Ok(log);
        }

        [HttpGet("entity-types")]
        public async Task<IActionResult> GetEntityTypes()
        {
            var types = await _auditLogService.GetDistinctEntityTypesAsync();
            return Ok(types);
        }

        [HttpGet("actions")]
        public async Task<IActionResult> GetActions()
        {
            var actions = await _auditLogService.GetDistinctActionsAsync();
            return Ok(actions);
        }
    }
}
