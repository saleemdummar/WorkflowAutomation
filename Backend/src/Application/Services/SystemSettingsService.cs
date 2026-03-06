using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.SystemSettings;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    public class SystemSettingsService : ISystemSettingsService
    {
        private readonly IRepository<SystemSetting> _settingsRepository;
        private readonly IRepository<Form> _formRepository;
        private readonly IRepository<Workflow> _workflowRepository;
        private readonly IRepository<FormSubmission> _submissionRepository;
        private readonly IRepository<WorkflowInstance> _instanceRepository;
        private readonly IRepository<ApprovalTask> _approvalRepository;
        private readonly IUnitOfWork _unitOfWork;
        private static readonly DateTime _startTime = Process.GetCurrentProcess().StartTime.ToUniversalTime();

        public SystemSettingsService(
            IRepository<SystemSetting> settingsRepository,
            IRepository<Form> formRepository,
            IRepository<Workflow> workflowRepository,
            IRepository<FormSubmission> submissionRepository,
            IRepository<WorkflowInstance> instanceRepository,
            IRepository<ApprovalTask> approvalRepository,
            IUnitOfWork unitOfWork)
        {
            _settingsRepository = settingsRepository;
            _formRepository = formRepository;
            _workflowRepository = workflowRepository;
            _submissionRepository = submissionRepository;
            _instanceRepository = instanceRepository;
            _approvalRepository = approvalRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<SystemSettingDto>> GetAllSettingsAsync()
        {
            var settings = await _settingsRepository.GetAllAsync();
            return settings.Select(MapToDto);
        }

        public async Task<SystemSettingDto> GetSettingByKeyAsync(string key)
        {
            var matches = await _settingsRepository.FindAsync(s => s.SettingKey == key);
            var setting = matches.FirstOrDefault();
            return setting != null ? MapToDto(setting) : null;
        }

        public async Task<IEnumerable<SystemSettingDto>> GetSettingsByCategoryAsync(string category)
        {
            var settings = await _settingsRepository.FindAsync(s => s.Category == category);
            return settings.Select(MapToDto);
        }

        public async Task<SystemSettingDto> CreateSettingAsync(CreateSystemSettingDto dto, string userId)
        {
            var setting = new SystemSetting
            {
                SettingKey = dto.SettingKey,
                SettingValue = dto.SettingValue,
                SettingType = dto.SettingType,
                Description = dto.Description,
                Category = dto.Category ?? "General",
                IsEditable = dto.IsEditable,
                UpdatedBy = Guid.TryParse(userId, out var uid) ? uid : null,
                UpdatedAt = DateTime.UtcNow
            };

            await _settingsRepository.AddAsync(setting);
            await _unitOfWork.CompleteAsync();

            return MapToDto(setting);
        }

        public async Task<SystemSettingDto> UpdateSettingAsync(string key, UpdateSystemSettingDto dto, string userId)
        {
            var matches = await _settingsRepository.FindAsync(s => s.SettingKey == key);
            var setting = matches.FirstOrDefault();

            if (setting == null)
                throw new KeyNotFoundException($"Setting with key '{key}' not found");

            if (!setting.IsEditable)
                throw new InvalidOperationException($"Setting '{key}' is not editable");

            var oldValue = setting.SettingValue;
            setting.SettingValue = dto.SettingValue;
            if (!string.IsNullOrEmpty(dto.Description))
                setting.Description = dto.Description;
            setting.UpdatedBy = Guid.TryParse(userId, out var uid) ? uid : null;
            setting.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.CompleteAsync();

            return MapToDto(setting);
        }

        public async Task DeleteSettingAsync(string key)
        {
            var matches = await _settingsRepository.FindAsync(s => s.SettingKey == key);
            var setting = matches.FirstOrDefault();

            if (setting == null)
                throw new KeyNotFoundException($"Setting with key '{key}' not found");

            await _settingsRepository.DeleteAsync(setting);
            await _unitOfWork.CompleteAsync();
        }

        public async Task<PerformanceMetricsDto> GetPerformanceMetricsAsync()
        {
            // Use CountAsync to avoid loading all entities into memory
            var totalForms = await _formRepository.CountAsync();
            var totalWorkflows = await _workflowRepository.CountAsync();
            var totalSubmissions = await _submissionRepository.CountAsync();

            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var weekAgo = today.AddDays(-7);

            // Load only what's needed for calculations
            var runningCount = await _instanceRepository.CountAsync(i => i.InstanceStatus == WorkflowInstanceStatus.Running);
            var completedCount = await _instanceRepository.CountAsync(i => i.InstanceStatus == WorkflowInstanceStatus.Completed);
            var failedCount = await _instanceRepository.CountAsync(i => i.InstanceStatus == WorkflowInstanceStatus.Failed);
            var pendingCount = await _instanceRepository.CountAsync(i => i.InstanceStatus == WorkflowInstanceStatus.Pending);
            var todaySubmissions = await _submissionRepository.CountAsync(s => s.CreatedDate >= today && s.CreatedDate < tomorrow);
            var approvals = await _approvalRepository.FindAsync(a => a.CompletedAt != null && a.CompletedAt >= today && a.CompletedAt < tomorrow);
            var todayApprovals = approvals.Count;

            // Calculate submission trend for last 7 days
            var recentSubmissions = await _submissionRepository.FindAsync(s => s.CreatedDate >= weekAgo);
            var trend = Enumerable.Range(0, 7)
                .Select(i => today.AddDays(-i))
                .Select(date => new SubmissionTrendDto
                {
                    Date = date.ToString("MM/dd"),
                    Count = recentSubmissions.Count(s => s.CreatedDate.Date == date)
                })
                .Reverse()
                .ToArray();

            // Workflow status summary
            var statusSummary = new WorkflowStatusSummaryDto
            {
                Running = runningCount,
                Completed = completedCount,
                Failed = failedCount,
                Pending = pendingCount
            };

            // Calculate average execution time for completed workflows
            var completedInstances = (await _instanceRepository.FindAsync(i => i.InstanceStatus == WorkflowInstanceStatus.Completed && i.CompletedAt.HasValue)).ToList();
            double avgExecutionTime = 0;
            if (completedInstances.Any())
            {
                avgExecutionTime = completedInstances
                    .Average(i => (i.CompletedAt.Value - i.StartedAt).TotalSeconds);
            }

            var pendingApprovals = await _approvalRepository.CountAsync(a => a.TaskStatus == ApprovalTaskStatus.Pending);

            return new PerformanceMetricsDto
            {
                TotalForms = totalForms,
                TotalWorkflows = totalWorkflows,
                TotalSubmissions = totalSubmissions,
                ActiveWorkflowInstances = runningCount,
                PendingApprovals = pendingApprovals,
                TodaySubmissions = todaySubmissions,
                TodayApprovals = todayApprovals,
                AverageWorkflowExecutionTime = Math.Round(avgExecutionTime, 2),
                SystemUptime = (DateTime.UtcNow - _startTime).TotalHours,
                LastUpdated = DateTime.UtcNow,
                SubmissionTrend = trend,
                WorkflowStatusSummary = statusSummary
            };
        }

        private static SystemSettingDto MapToDto(SystemSetting setting)
        {
            return new SystemSettingDto
            {
                Id = setting.Id,
                SettingKey = setting.SettingKey,
                SettingValue = setting.SettingValue,
                SettingType = setting.SettingType,
                Description = setting.Description,
                Category = setting.Category,
                IsEditable = setting.IsEditable,
                UpdatedBy = setting.UpdatedBy,
                UpdatedAt = setting.UpdatedAt
            };
        }
    }
}
