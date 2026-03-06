using System;
using System.Threading.Tasks;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface ISystemLogService
    {
        Task LogAsync(Domain.Enums.LogLevel level, string source, string message,
            Exception? exception = null, Guid? userId = null,
            Guid? submissionId = null, Guid? workflowInstanceId = null);

        Task LogInfoAsync(string source, string message, Guid? userId = null);
        Task LogWarningAsync(string source, string message, Guid? userId = null);
        Task LogErrorAsync(string source, string message, Exception? exception = null, Guid? userId = null);
    }
}
