using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Forms;

namespace WorkflowAutomation.Application.Interfaces
{
    /// <summary>
    /// Manages form lifecycle operations: publishing, archiving, expiration, and scheduled publishing.
    /// Extracted from IFormService to separate lifecycle concerns from CRUD/definition logic.
    /// </summary>
    public interface IFormLifecycleService
    {
        Task PublishFormAsync(Guid formId, string userId);
        Task UnpublishFormAsync(Guid formId, string userId);
        Task ArchiveFormAsync(Guid formId, string userId, string? reason = null);
        Task RestoreFormAsync(Guid formId, string userId, string? reason = null);
        Task SetFormExpirationAsync(Guid formId, DateTime? expirationDate, string userId, string? reason = null);
        Task ScheduleFormPublishingAsync(Guid formId, DateTime? publishDate, DateTime? unpublishDate, string userId, string? reason = null);
        Task<FormLifecycleStatusDto> GetFormLifecycleStatusAsync(Guid formId);
        Task<IEnumerable<FormDto>> GetArchivedFormsAsync();
        Task<IEnumerable<FormDto>> GetExpiredFormsAsync();

        /// <summary>
        /// Processes scheduled publish/unpublish dates and auto-archives expired forms.
        /// Called periodically by Hangfire.
        /// </summary>
        Task ProcessScheduledPublishingAsync();
    }
}
