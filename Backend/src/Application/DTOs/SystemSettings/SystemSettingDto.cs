using System;

namespace WorkflowAutomation.Application.DTOs.SystemSettings
{
    public class SystemSettingDto
    {
        public Guid Id { get; set; }
        public string SettingKey { get; set; }
        public string SettingValue { get; set; }
        public string SettingType { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public bool IsEditable { get; set; }
        public Guid? UpdatedBy { get; set; }
        public string UpdatedByName { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateSystemSettingDto
    {
        public string SettingKey { get; set; }
        public string SettingValue { get; set; }
        public string SettingType { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public bool IsEditable { get; set; } = true;
    }

    public class UpdateSystemSettingDto
    {
        public string SettingValue { get; set; }
        public string Description { get; set; }
    }

    public class PerformanceMetricsDto
    {
        public int TotalForms { get; set; }
        public int TotalWorkflows { get; set; }
        public int TotalSubmissions { get; set; }
        public int ActiveWorkflowInstances { get; set; }
        public int PendingApprovals { get; set; }
        public int TodaySubmissions { get; set; }
        public int TodayApprovals { get; set; }
        public double AverageWorkflowExecutionTime { get; set; }
        public double SystemUptime { get; set; }
        public DateTime LastUpdated { get; set; }
        public SubmissionTrendDto[] SubmissionTrend { get; set; }
        public WorkflowStatusSummaryDto WorkflowStatusSummary { get; set; }
    }

    public class SubmissionTrendDto
    {
        public string Date { get; set; }
        public int Count { get; set; }
    }

    public class WorkflowStatusSummaryDto
    {
        public int Running { get; set; }
        public int Completed { get; set; }
        public int Failed { get; set; }
        public int Pending { get; set; }
    }
}
