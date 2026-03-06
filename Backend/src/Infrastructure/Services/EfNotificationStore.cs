using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Notifications;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Infrastructure.Data;

namespace WorkflowAutomation.Infrastructure.Services
{
    public class EfNotificationStore : INotificationStore
    {
        private readonly ApplicationDbContext _dbContext;

        public EfNotificationStore(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IReadOnlyList<Notification>> GetForUserAsync(Guid userId)
        {
            return await _dbContext.Notifications
                .AsNoTracking()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }

        public async Task<Notification> AddAsync(Notification notification)
        {
            _dbContext.Notifications.Add(notification);
            await _dbContext.SaveChangesAsync();
            return notification;
        }

        public async Task<bool> MarkAsReadAsync(Guid userId, Guid notificationId)
        {
            var notification = await _dbContext.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

            if (notification == null)
            {
                return false;
            }

            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
            return true;
        }

        public async Task<int> MarkAllAsReadAsync(Guid userId)
        {
            var notifications = await _dbContext.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var notification in notifications)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();
            return notifications.Count;
        }

        public async Task<int> ClearAllAsync(Guid userId)
        {
            var notifications = await _dbContext.Notifications
                .Where(n => n.UserId == userId)
                .ToListAsync();

            _dbContext.Notifications.RemoveRange(notifications);
            await _dbContext.SaveChangesAsync();
            return notifications.Count;
        }

        public async Task<bool> DeleteAsync(Guid userId, Guid notificationId)
        {
            var notification = await _dbContext.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

            if (notification == null)
            {
                return false;
            }

            _dbContext.Notifications.Remove(notification);
            await _dbContext.SaveChangesAsync();
            return true;
        }

        public async Task<NotificationPreferencesDto> GetPreferencesAsync(Guid userId)
        {
            var preference = await _dbContext.NotificationPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (preference == null)
            {
                return new NotificationPreferencesDto().PopulateDetailedFields();
            }

            return new NotificationPreferencesDto
            {
                RealtimeEnabled = preference.RealtimeEnabled,
                EmailEnabled = preference.EmailEnabled,
                DigestEnabled = preference.DigestEnabled
            }.PopulateDetailedFields();
        }

        public async Task SetPreferencesAsync(Guid userId, NotificationPreferencesDto preferences)
        {
            var preference = await _dbContext.NotificationPreferences
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (preference == null)
            {
                preference = new NotificationPreference
                {
                    UserId = userId,
                    RealtimeEnabled = preferences.ResolveRealtimeEnabled(),
                    EmailEnabled = preferences.ResolveEmailEnabled(),
                    DigestEnabled = preferences.ResolveDigestEnabled(),
                    UpdatedAt = DateTime.UtcNow
                };

                _dbContext.NotificationPreferences.Add(preference);
            }
            else
            {
                preference.RealtimeEnabled = preferences.ResolveRealtimeEnabled();
                preference.EmailEnabled = preferences.ResolveEmailEnabled();
                preference.DigestEnabled = preferences.ResolveDigestEnabled();
                preference.UpdatedAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();
        }
    }
}
