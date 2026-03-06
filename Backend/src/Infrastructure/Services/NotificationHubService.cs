using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;
using WorkflowAutomation.Infrastructure.Hubs;

namespace WorkflowAutomation.Infrastructure.Services
{
    public class NotificationHubService : INotificationHubService
    {
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<NotificationHubService> _logger;
        private readonly INotificationStore _notificationStore;
        private readonly IRepository<ApprovalTask> _approvalTaskRepository;

        public NotificationHubService(
            IHubContext<NotificationHub> hubContext,
            ILogger<NotificationHubService> logger,
            INotificationStore notificationStore,
            IRepository<ApprovalTask> approvalTaskRepository)
        {
            _hubContext = hubContext;
            _logger = logger;
            _notificationStore = notificationStore;
            _approvalTaskRepository = approvalTaskRepository;
        }

        public async Task SendNotificationToUserAsync(string userId, string title, string message, string type = "info")
        {
            try
            {
                await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveNotification", new
                {
                    title,
                    message,
                    type,
                    timestamp = DateTime.UtcNow
                });

                if (Guid.TryParse(userId, out var parsedUserId))
                {
                    await _notificationStore.AddAsync(new Domain.Entities.Notification
                    {
                        UserId = parsedUserId,
                        NotificationType = type,
                        Subject = title,
                        Message = message,
                        RelatedEntityType = "Notification",
                        IsRead = false,
                        IsSent = true,
                        SentAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                _logger.LogInformation("Notification sent to user {UserId}: {Title}", userId, title);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send notification to user {UserId}", userId);
            }
        }

        public async Task SendApprovalTaskNotificationAsync(string userId, Guid taskId, string formName, string action)
        {
            try
            {
                await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveApprovalTask", new
                {
                    taskId,
                    formName,
                    action,
                    timestamp = DateTime.UtcNow
                });

                if (Guid.TryParse(userId, out var parsedUserId))
                {
                    await _notificationStore.AddAsync(new Domain.Entities.Notification
                    {
                        UserId = parsedUserId,
                        NotificationType = "ApprovalTask",
                        Subject = $"Approval task: {formName}",
                        Message = action,
                        RelatedEntityType = "ApprovalTask",
                        RelatedEntityId = taskId,
                        IsRead = false,
                        IsSent = true,
                        SentAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                _logger.LogInformation("Approval task notification sent to user {UserId}: {TaskId}", userId, taskId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send approval task notification to user {UserId}", userId);
            }
        }

        public async Task SendWorkflowStatusUpdateAsync(string userId, Guid instanceId, string status, string message)
        {
            try
            {
                await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveWorkflowStatusUpdate", new
                {
                    instanceId,
                    status,
                    message,
                    timestamp = DateTime.UtcNow
                });

                if (Guid.TryParse(userId, out var parsedUserId))
                {
                    await _notificationStore.AddAsync(new Domain.Entities.Notification
                    {
                        UserId = parsedUserId,
                        NotificationType = "WorkflowStatus",
                        Subject = $"Workflow status: {status}",
                        Message = message,
                        RelatedEntityType = "WorkflowInstance",
                        RelatedEntityId = instanceId,
                        IsRead = false,
                        IsSent = true,
                        SentAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                _logger.LogInformation("Workflow status update sent to user {UserId}: {InstanceId} - {Status}", userId, instanceId, status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send workflow status update to user {UserId}", userId);
            }
        }

        public async Task SendFormSubmissionUpdateAsync(string userId, Guid submissionId, string status, string message)
        {
            try
            {
                await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveFormSubmissionUpdate", new
                {
                    submissionId,
                    status,
                    message,
                    timestamp = DateTime.UtcNow
                });

                if (Guid.TryParse(userId, out var parsedUserId))
                {
                    await _notificationStore.AddAsync(new Domain.Entities.Notification
                    {
                        UserId = parsedUserId,
                        NotificationType = "FormSubmission",
                        Subject = $"Submission status: {status}",
                        Message = message,
                        RelatedEntityType = "FormSubmission",
                        RelatedEntityId = submissionId,
                        IsRead = false,
                        IsSent = true,
                        SentAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                _logger.LogInformation("Form submission update sent to user {UserId}: {SubmissionId} - {Status}", userId, submissionId, status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send form submission update to user {UserId}", userId);
            }
        }

        public async Task BroadcastSystemNotificationAsync(string title, string message, string type = "warning")
        {
            try
            {
                await _hubContext.Clients.All.SendAsync("ReceiveSystemNotification", new
                {
                    title,
                    message,
                    type,
                    timestamp = DateTime.UtcNow
                });
                _logger.LogInformation("System notification broadcast: {Title}", title);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to broadcast system notification");
            }
        }

        public async Task SendApprovalReminderAsync(string taskId)
        {
            try
            {
                if (!Guid.TryParse(taskId, out var parsedTaskId))
                {
                    _logger.LogWarning("Invalid task ID for approval reminder: {TaskId}", taskId);
                    return;
                }

                // Look up the actual approval task to find the assigned user
                var task = await _approvalTaskRepository.GetByIdAsync(parsedTaskId);
                if (task == null)
                {
                    _logger.LogWarning("Approval task not found for reminder: {TaskId}", taskId);
                    return;
                }

                var assignedUserId = task.AssignedTo;
                if (string.IsNullOrEmpty(assignedUserId))
                {
                    _logger.LogWarning("Approval task {TaskId} has no assigned user", taskId);
                    return;
                }

                _logger.LogInformation("Sending approval reminder for task {TaskId} to user {UserId}", taskId, assignedUserId);

                // Send targeted notification to the assigned user only
                await _hubContext.Clients.Group($"user_{assignedUserId}").SendAsync("ReceiveApprovalReminder", new
                {
                    taskId = parsedTaskId,
                    message = "You have a pending approval task that requires your attention.",
                    timestamp = DateTime.UtcNow
                });

                // Also persist as a notification
                if (Guid.TryParse(assignedUserId, out var parsedUserId))
                {
                    await _notificationStore.AddAsync(new Notification
                    {
                        UserId = parsedUserId,
                        NotificationType = "ApprovalReminder",
                        Subject = "Approval Reminder",
                        Message = "You have a pending approval task that requires your attention.",
                        RelatedEntityType = "ApprovalTask",
                        RelatedEntityId = parsedTaskId,
                        IsRead = false,
                        IsSent = true,
                        SentAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send approval reminder for task {TaskId}", taskId);
            }
        }

        public async Task SendNotificationAsync(string userId, string title, string message, string type)
        {
            await SendNotificationToUserAsync(userId, title, message, type);
        }
    }
}
