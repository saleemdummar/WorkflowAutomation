using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkflowAutomation.Application.DTOs;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Infrastructure.Data;

namespace WorkflowAutomation.Infrastructure.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly ApplicationDbContext _context;

        public AuditLogService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(string action, string entityType, Guid? entityId, string entityName,
            Guid userId, string userName, string userEmail,
            string? oldValues = null, string? newValues = null,
            string? ipAddress = null, string? userAgent = null,
            string? additionalInfo = null)
        {
            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                EntityName = entityName,
                UserId = userId,
                UserName = userName,
                UserEmail = userEmail,
                OldValues = oldValues,
                NewValues = newValues,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                AdditionalInfo = additionalInfo,
                Timestamp = DateTime.UtcNow
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }

        public async Task<(IEnumerable<AuditLogDto> Items, int TotalCount)> GetLogsAsync(
            int page = 1, int pageSize = 50,
            string? entityType = null, string? action = null,
            Guid? userId = null, DateTime? fromDate = null, DateTime? toDate = null,
            string? searchQuery = null)
        {
            var query = _context.AuditLogs.AsQueryable();

            if (!string.IsNullOrEmpty(entityType))
                query = query.Where(a => a.EntityType == entityType);

            if (!string.IsNullOrEmpty(action))
                query = query.Where(a => a.Action == action);

            if (userId.HasValue)
                query = query.Where(a => a.UserId == userId.Value);

            if (fromDate.HasValue)
                query = query.Where(a => a.Timestamp >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(a => a.Timestamp <= toDate.Value);

            if (!string.IsNullOrEmpty(searchQuery))
            {
                var search = searchQuery.ToLower();
                query = query.Where(a =>
                    a.EntityName.ToLower().Contains(search) ||
                    a.UserName.ToLower().Contains(search) ||
                    a.UserEmail.ToLower().Contains(search) ||
                    a.Action.ToLower().Contains(search));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AuditLogDto
                {
                    Id = a.Id,
                    Action = a.Action,
                    EntityType = a.EntityType,
                    EntityId = a.EntityId,
                    EntityName = a.EntityName,
                    UserId = a.UserId,
                    UserName = a.UserName,
                    UserEmail = a.UserEmail,
                    OldValues = a.OldValues,
                    NewValues = a.NewValues,
                    IpAddress = a.IpAddress,
                    AdditionalInfo = a.AdditionalInfo,
                    Timestamp = a.Timestamp
                })
                .ToListAsync();

            return (items, totalCount);
        }

        public async Task<AuditLogDto?> GetByIdAsync(Guid id)
        {
            var log = await _context.AuditLogs.FindAsync(id);
            if (log == null) return null;

            return new AuditLogDto
            {
                Id = log.Id,
                Action = log.Action,
                EntityType = log.EntityType,
                EntityId = log.EntityId,
                EntityName = log.EntityName,
                UserId = log.UserId,
                UserName = log.UserName,
                UserEmail = log.UserEmail,
                OldValues = log.OldValues,
                NewValues = log.NewValues,
                IpAddress = log.IpAddress,
                AdditionalInfo = log.AdditionalInfo,
                Timestamp = log.Timestamp
            };
        }

        public async Task<List<string>> GetDistinctEntityTypesAsync()
        {
            return await _context.AuditLogs
                .Select(a => a.EntityType)
                .Where(t => t != null)
                .Distinct()
                .OrderBy(t => t)
                .ToListAsync();
        }

        public async Task<List<string>> GetDistinctActionsAsync()
        {
            return await _context.AuditLogs
                .Select(a => a.Action)
                .Where(a => a != null)
                .Distinct()
                .OrderBy(a => a)
                .ToListAsync();
        }
    }
}
