using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/[controller]")]
    [Authorize(Policy = "FormCreate")]
    [EnableRateLimiting("heavy")]
    public class ExpressionController : BaseApiController
    {
        private readonly IJintExecutionService _jintService;

        public ExpressionController(IJintExecutionService jintService)
        {
            _jintService = jintService;
        }

        public class EvaluateRequest
        {
            public string Expression { get; set; } = string.Empty;
            public Dictionary<string, object> Variables { get; set; } = new();
        }

        [HttpPost("evaluate")]
        public IActionResult Evaluate([FromBody] EvaluateRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Expression))
                {
                    return BadRequest(new { error = "Expression is required." });
                }

                if (request.Expression.Length > 2000)
                {
                    return BadRequest(new { error = "Expression exceeds maximum length." });
                }

                if (!_jintService.ValidateJavaScriptSyntax(request.Expression))
                {
                    return BadRequest(new { error = "Expression has invalid JavaScript syntax." });
                }

                var result = _jintService.ExecuteJavaScript(request.Expression, request.Variables);
                return Ok(new { result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "Expression evaluation failed." });
            }
        }
    }
}