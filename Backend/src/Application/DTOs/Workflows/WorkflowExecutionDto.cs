using System;
using System.Collections.Generic;

namespace WorkflowAutomation.Application.DTOs.Workflows
{
    public class WorkflowExecutionListItemDto
    {
        public Guid Id { get; set; }
        public Guid WorkflowId { get; set; }
        public string WorkflowName { get; set; } = "Unknown Workflow";
        public string Status { get; set; } = string.Empty;
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string TriggeredBy { get; set; } = "Unknown";
        public string? CurrentStep { get; set; }
        public int TotalSteps { get; set; }
        public int CompletedSteps { get; set; }
        public string? ErrorMessage { get; set; }
        public Guid? FormSubmissionId { get; set; }
    }

    public class WorkflowExecutionDetailDto
    {
        public Guid Id { get; set; }
        public Guid WorkflowId { get; set; }
        public string WorkflowName { get; set; } = "Unknown Workflow";
        public string Status { get; set; } = string.Empty;
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string TriggeredBy { get; set; } = "Unknown";
        public Guid? FormSubmissionId { get; set; }
        public List<ExecutionStepDto> ExecutionSteps { get; set; } = new();
        public List<ExecutionLogEntryDto> Logs { get; set; } = new();
        public Dictionary<string, object> Context { get; set; } = new();
    }

    public class ExecutionStepDto
    {
        public string Id { get; set; } = string.Empty;
        public string NodeId { get; set; } = string.Empty;
        public string? NodeName { get; set; }
        public string? NodeType { get; set; }
        public string Status { get; set; } = "Pending";
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public object? Output { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class ExecutionLogEntryDto
    {
        public Guid Id { get; set; }
        public DateTime Timestamp { get; set; }
        public string Level { get; set; } = "Info";
        public string Message { get; set; } = string.Empty;
        public string? Data { get; set; }
    }

    public class WorkflowAnalyticsDto
    {
        public Guid WorkflowId { get; set; }
        public string WorkflowName { get; set; } = string.Empty;
        public WorkflowStatsDto Stats { get; set; } = new();
        public List<ExecutionTrendDto> ExecutionTrend { get; set; } = new();
        public List<BottleneckDto> TopBottlenecks { get; set; } = new();
    }

    public class WorkflowStatsDto
    {
        public int TotalExecutions { get; set; }
        public int SuccessfulExecutions { get; set; }
        public int FailedExecutions { get; set; }
        public int RunningExecutions { get; set; }
        public double AverageDurationMs { get; set; }
        public double SuccessRate { get; set; }
    }

    public class ExecutionTrendDto
    {
        public DateTime Date { get; set; }
        public int Count { get; set; }
        public int SuccessCount { get; set; }
        public int FailedCount { get; set; }
    }

    public class BottleneckDto
    {
        public string NodeName { get; set; } = string.Empty;
        public double AverageDurationMs { get; set; }
        public int ExecutionCount { get; set; }
    }
}
