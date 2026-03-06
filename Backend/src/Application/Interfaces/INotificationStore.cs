using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Notifications;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface INotificationStore
    {
        Task<IReadOnlyList<Notification>> GetForUserAsync(Guid userId);
        Task<Notification> AddAsync(Notification notification);
        Task<bool> MarkAsReadAsync(Guid userId, Guid notificationId);
        Task<int> MarkAllAsReadAsync(Guid userId);
        Task<bool> DeleteAsync(Guid userId, Guid notificationId);
        Task<int> ClearAllAsync(Guid userId);
        Task<NotificationPreferencesDto> GetPreferencesAsync(Guid userId);
        Task SetPreferencesAsync(Guid userId, NotificationPreferencesDto preferences);
    }
}
