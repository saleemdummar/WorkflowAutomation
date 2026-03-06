using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace WorkflowAutomation.Infrastructure.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        private readonly ILogger<NotificationHub> _logger;

        public NotificationHub(ILogger<NotificationHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst("sub")?.Value
                ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
                _logger.LogInformation("User {UserId} connected to NotificationHub with ConnectionId {ConnectionId}", userId, Context.ConnectionId);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst("sub")?.Value
                ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
                _logger.LogInformation("User {UserId} disconnected from NotificationHub", userId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Send notification to specific user
        /// </summary>
        public async Task SendNotificationToUser(string userId, string title, string message, string type = "info")
        {
            EnsureCanTargetUser(userId);

            await Clients.Group($"user_{userId}").SendAsync("ReceiveNotification", new
            {
                title,
                message,
                type,
                timestamp = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Send approval task notification
        /// </summary>
        public async Task SendApprovalTaskNotification(string userId, Guid taskId, string formName, string action)
        {
            EnsureCanTargetUser(userId);

            await Clients.Group($"user_{userId}").SendAsync("ReceiveApprovalTask", new
            {
                taskId,
                formName,
                action,
                timestamp = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Send workflow status update
        /// </summary>
        public async Task SendWorkflowStatusUpdate(string userId, Guid instanceId, string status, string message)
        {
            EnsureCanTargetUser(userId);

            await Clients.Group($"user_{userId}").SendAsync("ReceiveWorkflowStatusUpdate", new
            {
                instanceId,
                status,
                message,
                timestamp = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Send form submission update
        /// </summary>
        public async Task SendFormSubmissionUpdate(string userId, Guid submissionId, string status, string message)
        {
            EnsureCanTargetUser(userId);

            await Clients.Group($"user_{userId}").SendAsync("ReceiveFormSubmissionUpdate", new
            {
                submissionId,
                status,
                message,
                timestamp = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Broadcast system-wide notification (for admins)
        /// </summary>
        public async Task BroadcastSystemNotification(string title, string message, string type = "warning")
        {
            EnsureAdmin();

            await Clients.All.SendAsync("ReceiveSystemNotification", new
            {
                title,
                message,
                type,
                timestamp = DateTime.UtcNow
            });
        }

        private void EnsureCanTargetUser(string targetUserId)
        {
            var callerUserId = Context.User?.FindFirst("sub")?.Value
                ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var isAdmin = Context.User?.IsInRole("super-admin") == true || Context.User?.IsInRole("admin") == true;

            if (!isAdmin && !string.Equals(callerUserId, targetUserId, StringComparison.OrdinalIgnoreCase))
            {
                throw new HubException("Not authorized to send notifications to other users.");
            }
        }

        private void EnsureAdmin()
        {
            var isAdmin = Context.User?.IsInRole("super-admin") == true || Context.User?.IsInRole("admin") == true;
            if (!isAdmin)
            {
                throw new HubException("Admin role required.");
            }
        }
    }
}
