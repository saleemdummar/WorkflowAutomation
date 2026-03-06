using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.Notifications;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : BaseApiController
    {
        private readonly INotificationStore _notificationStore;

        public NotificationsController(INotificationStore notificationStore)
        {
            _notificationStore = notificationStore;
        }

        [HttpGet("my-notifications")]
        public async Task<IActionResult> GetMyNotifications()
        {
            var notifications = await _notificationStore.GetForUserAsync(GetUserGuid());
            return Ok(notifications);
        }

        [HttpPut("{id:guid}/read")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var updated = await _notificationStore.MarkAsReadAsync(GetUserGuid(), id);
            if (!updated)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpPut("mark-all-read")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            await _notificationStore.MarkAllAsReadAsync(GetUserGuid());
            return NoContent();
        }

        [HttpDelete("clear-all")]
        public async Task<IActionResult> ClearAll()
        {
            await _notificationStore.ClearAllAsync(GetUserGuid());
            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var deleted = await _notificationStore.DeleteAsync(GetUserGuid(), id);
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpGet("preferences")]
        public async Task<IActionResult> GetPreferences()
        {
            var preferences = await _notificationStore.GetPreferencesAsync(GetUserGuid());
            return Ok(preferences);
        }

        [HttpPut("preferences")]
        public async Task<IActionResult> UpdatePreferences([FromBody] NotificationPreferencesDto preferences)
        {
            await _notificationStore.SetPreferencesAsync(GetUserGuid(), preferences);
            return NoContent();
        }
    }
}
