using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Notifications;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Services
{
    public class MemoryNotificationStore : INotificationStore
    {
        private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, Notification>> _notifications = new();
        private readonly ConcurrentDictionary<Guid, NotificationPreferencesDto> _preferences = new();

        public Task<IReadOnlyList<Notification>> GetForUserAsync(Guid userId)
        {
            if (_notifications.TryGetValue(userId, out var userNotifications))
            {
                var list = userNotifications.Values
                    .OrderByDescending(n => n.CreatedAt)
                    .ToList()
                    .AsReadOnly();
                return Task.FromResult<IReadOnlyList<Notification>>(list);
            }

            return Task.FromResult<IReadOnlyList<Notification>>(Array.Empty<Notification>());
        }

        public Task<Notification> AddAsync(Notification notification)
        {
            var userNotifications = _notifications.GetOrAdd(notification.UserId, _ => new ConcurrentDictionary<Guid, Notification>());
            userNotifications[notification.Id] = notification;
            return Task.FromResult(notification);
        }

        public Task<bool> MarkAsReadAsync(Guid userId, Guid notificationId)
        {
            if (_notifications.TryGetValue(userId, out var userNotifications) &&
                userNotifications.TryGetValue(notificationId, out var notification))
            {
                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }

        public Task<int> MarkAllAsReadAsync(Guid userId)
        {
            var count = 0;
            if (_notifications.TryGetValue(userId, out var userNotifications))
            {
                foreach (var notification in userNotifications.Values)
                {
                    if (!notification.IsRead)
                    {
                        notification.IsRead = true;
                        notification.ReadAt = DateTime.UtcNow;
                        count++;
                    }
                }
            }

            return Task.FromResult(count);
        }

        public Task<int> ClearAllAsync(Guid userId)
        {
            if (_notifications.TryRemove(userId, out var userNotifications))
            {
                return Task.FromResult(userNotifications.Count);
            }

            return Task.FromResult(0);
        }

        public Task<bool> DeleteAsync(Guid userId, Guid notificationId)
        {
            if (_notifications.TryGetValue(userId, out var userNotifications) &&
                userNotifications.TryRemove(notificationId, out _))
            {
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }

        public Task<NotificationPreferencesDto> GetPreferencesAsync(Guid userId)
        {
            if (_preferences.TryGetValue(userId, out var preferences))
            {
                return Task.FromResult(preferences.PopulateDetailedFields());
            }

            var defaultPreferences = new NotificationPreferencesDto().PopulateDetailedFields();
            _preferences[userId] = defaultPreferences;
            return Task.FromResult(defaultPreferences);
        }

        public Task SetPreferencesAsync(Guid userId, NotificationPreferencesDto preferences)
        {
            _preferences[userId] = new NotificationPreferencesDto
            {
                RealtimeEnabled = preferences.ResolveRealtimeEnabled(),
                EmailEnabled = preferences.ResolveEmailEnabled(),
                DigestEnabled = preferences.ResolveDigestEnabled()
            }.PopulateDetailedFields();
            return Task.CompletedTask;
        }
    }
}
