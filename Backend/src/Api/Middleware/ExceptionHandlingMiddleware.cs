using System;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace WorkflowAutomation.Api.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception occurred");
                await HandleExceptionAsync(context, ex);
            }
        }

        private Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            var (statusCode, message) = exception switch
            {
                KeyNotFoundException => ((int)HttpStatusCode.NotFound, "The requested resource was not found."),
                ArgumentException or ArgumentNullException => ((int)HttpStatusCode.BadRequest, "Invalid request parameters."),
                InvalidOperationException => ((int)HttpStatusCode.BadRequest, "The requested operation is not valid."),
                UnauthorizedAccessException => ((int)HttpStatusCode.Forbidden, "You do not have permission to perform this action."),
                _ => ((int)HttpStatusCode.InternalServerError, "An error occurred while processing your request.")
            };

            context.Response.StatusCode = statusCode;

            var env = context.RequestServices.GetService<IWebHostEnvironment>();
            var isDevelopment = env?.EnvironmentName == "Development";

            var response = new
            {
                StatusCode = statusCode,
                Message = message,
                Detailed = isDevelopment ? exception.Message : null,
                StackTrace = isDevelopment ? exception.StackTrace : null
            };

            return context.Response.WriteAsJsonAsync(response);
        }
    }
}
