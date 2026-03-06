using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Infrastructure.Data;

namespace WorkflowAutomation.Infrastructure.Services
{
    public class SystemLogService : ISystemLogService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<SystemLogService> _logger;

        public SystemLogService(ApplicationDbContext dbContext, ILogger<SystemLogService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task LogAsync(Domain.Enums.LogLevel level, string source, string message,
            Exception? exception = null, Guid? userId = null,
            Guid? submissionId = null, Guid? workflowInstanceId = null)
        {
            try
            {
                var log = new SystemLog
                {
                    LogLevel = level,
                    Source = source,
                    Message = message,
                    Exception = exception?.Message,
                    StackTrace = exception?.StackTrace,
                    UserId = userId,
                    SubmissionId = submissionId,
                    WorkflowInstanceId = workflowInstanceId,
                    Timestamp = DateTime.UtcNow
                };

                await _dbContext.SystemLogs.AddAsync(log);
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Fallback to standard logger if DB logging fails
                _logger.LogError(ex, "Failed to write system log to database. Original message: {Message}", message);
            }
        }

        public Task LogInfoAsync(string source, string message, Guid? userId = null)
            => LogAsync(Domain.Enums.LogLevel.Info, source, message, userId: userId);

        public Task LogWarningAsync(string source, string message, Guid? userId = null)
            => LogAsync(Domain.Enums.LogLevel.Warning, source, message, userId: userId);

        public Task LogErrorAsync(string source, string message, Exception? exception = null, Guid? userId = null)
            => LogAsync(Domain.Enums.LogLevel.Error, source, message, exception, userId);
    }
}
