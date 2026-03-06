using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IAuditLogService
    {
        Task LogAsync(string action, string entityType, Guid? entityId, string entityName,
            Guid userId, string userName, string userEmail,
            string? oldValues = null, string? newValues = null,
            string? ipAddress = null, string? userAgent = null,
            string? additionalInfo = null);

        Task<(IEnumerable<AuditLogDto> Items, int TotalCount)> GetLogsAsync(
            int page = 1, int pageSize = 50,
            string? entityType = null, string? action = null,
            Guid? userId = null, DateTime? fromDate = null, DateTime? toDate = null,
            string? searchQuery = null);

        Task<AuditLogDto?> GetByIdAsync(Guid id);

        Task<List<string>> GetDistinctEntityTypesAsync();

        Task<List<string>> GetDistinctActionsAsync();
    }
}
