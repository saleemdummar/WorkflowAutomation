using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.SystemSettings;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/[controller]")]
    [Authorize(Policy = "SystemSettings")]
    public class SystemSettingsController : BaseApiController
    {
        private readonly ISystemSettingsService _settingsService;

        public SystemSettingsController(ISystemSettingsService settingsService)
        {
            _settingsService = settingsService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllSettings()
        {
            var settings = await _settingsService.GetAllSettingsAsync();
            return Ok(settings);
        }

        [HttpGet("{key}")]
        public async Task<IActionResult> GetSettingByKey(string key)
        {
            var setting = await _settingsService.GetSettingByKeyAsync(key);
            if (setting == null)
                return NotFound(new { message = $"Setting '{key}' not found" });
            return Ok(setting);
        }

        [HttpGet("category/{category}")]
        public async Task<IActionResult> GetSettingsByCategory(string category)
        {
            var settings = await _settingsService.GetSettingsByCategoryAsync(category);
            return Ok(settings);
        }

        [HttpPost]
        public async Task<IActionResult> CreateSetting([FromBody] CreateSystemSettingDto dto)
        {
            try
            {
                var userId = GetUserId();
                var setting = await _settingsService.CreateSettingAsync(dto, userId);
                return CreatedAtAction(nameof(GetSettingByKey), new { key = setting.SettingKey }, setting);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{key}")]
        public async Task<IActionResult> UpdateSetting(string key, [FromBody] UpdateSystemSettingDto dto)
        {
            try
            {
                var userId = GetUserId();
                var setting = await _settingsService.UpdateSettingAsync(key, dto, userId);
                return Ok(setting);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Setting '{key}' not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{key}")]
        public async Task<IActionResult> DeleteSetting(string key)
        {
            try
            {
                await _settingsService.DeleteSettingAsync(key);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Setting '{key}' not found" });
            }
        }

        [HttpGet("metrics")]
        public async Task<IActionResult> GetPerformanceMetrics()
        {
            var metrics = await _settingsService.GetPerformanceMetricsAsync();
            return Ok(metrics);
        }

        [HttpPost("seed-defaults")]
        public async Task<IActionResult> SeedDefaultSettings()
        {
            var userId = GetUserId();

            var defaultSettings = new[]
            {
                new CreateSystemSettingDto { SettingKey = "app.name", SettingValue = "Workflow Automation Platform", SettingType = "String", Description = "Application name displayed in UI", Category = "General", IsEditable = true },
                new CreateSystemSettingDto { SettingKey = "app.version", SettingValue = "1.0.0", SettingType = "String", Description = "Application version", Category = "General", IsEditable = false },
                new CreateSystemSettingDto { SettingKey = "workflow.defaultTimeout", SettingValue = "300", SettingType = "Number", Description = "Default workflow timeout in seconds", Category = "Workflow", IsEditable = true },
                new CreateSystemSettingDto { SettingKey = "workflow.maxRetries", SettingValue = "3", SettingType = "Number", Description = "Maximum retry attempts for failed workflows", Category = "Workflow", IsEditable = true },
                new CreateSystemSettingDto { SettingKey = "approval.defaultDeadlineDays", SettingValue = "3", SettingType = "Number", Description = "Default approval deadline in days", Category = "Workflow", IsEditable = true },
                new CreateSystemSettingDto { SettingKey = "email.enabled", SettingValue = "true", SettingType = "Boolean", Description = "Enable email notifications", Category = "Email", IsEditable = true },
                new CreateSystemSettingDto { SettingKey = "email.fromAddress", SettingValue = "noreply@workflow.local", SettingType = "String", Description = "Default from email address", Category = "Email", IsEditable = true },
                new CreateSystemSettingDto { SettingKey = "notifications.realtime", SettingValue = "true", SettingType = "Boolean", Description = "Enable real-time notifications via SignalR", Category = "Notifications", IsEditable = true },
                new CreateSystemSettingDto { SettingKey = "form.maxFileSize", SettingValue = "10485760", SettingType = "Number", Description = "Maximum file upload size in bytes (10MB)", Category = "General", IsEditable = true },
                new CreateSystemSettingDto { SettingKey = "form.autoSaveInterval", SettingValue = "30", SettingType = "Number", Description = "Auto-save draft interval in seconds", Category = "General", IsEditable = true },
            };

            foreach (var setting in defaultSettings)
            {
                try
                {
                    var existing = await _settingsService.GetSettingByKeyAsync(setting.SettingKey);
                    if (existing == null)
                    {
                        await _settingsService.CreateSettingAsync(setting, userId);
                    }
                }
                catch { /* Skip if already exists */ }
            }

            return Ok(new { message = "Default settings seeded successfully" });
        }
    }
}
