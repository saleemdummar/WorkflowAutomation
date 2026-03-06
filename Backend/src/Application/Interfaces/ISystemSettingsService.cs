using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.SystemSettings;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface ISystemSettingsService
    {
        Task<IEnumerable<SystemSettingDto>> GetAllSettingsAsync();
        Task<SystemSettingDto> GetSettingByKeyAsync(string key);
        Task<SystemSettingDto> UpdateSettingAsync(string key, UpdateSystemSettingDto dto, string userId);
        Task<SystemSettingDto> CreateSettingAsync(CreateSystemSettingDto dto, string userId);
        Task DeleteSettingAsync(string key);
        Task<IEnumerable<SystemSettingDto>> GetSettingsByCategoryAsync(string category);
        Task<PerformanceMetricsDto> GetPerformanceMetricsAsync();
    }
}
