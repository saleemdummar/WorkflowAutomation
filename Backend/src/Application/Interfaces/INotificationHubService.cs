using System.Threading.Tasks;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface INotificationHubService
    {
        Task SendNotificationToUserAsync(string userId, string title, string message, string type = "info");
        Task SendApprovalTaskNotificationAsync(string userId, Guid taskId, string formName, string action);
        Task SendWorkflowStatusUpdateAsync(string userId, Guid instanceId, string status, string message);
        Task SendFormSubmissionUpdateAsync(string userId, Guid submissionId, string status, string message);
        Task BroadcastSystemNotificationAsync(string title, string message, string type = "warning");

        // New methods for background jobs
        Task SendApprovalReminderAsync(string taskId);
        Task SendNotificationAsync(string userId, string title, string message, string type);
    }
}
