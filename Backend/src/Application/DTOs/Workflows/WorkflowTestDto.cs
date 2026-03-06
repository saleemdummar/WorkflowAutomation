using System;
using System.Collections.Generic;

namespace WorkflowAutomation.Application.DTOs.Workflows
{
    public class WorkflowTestRequest
    {
        public Dictionary<string, object>? TestData { get; set; }
        public string? SimulateApproval { get; set; } = "Approved";
    }

    public class WorkflowTestResult
    {
        public Guid WorkflowId { get; set; }
        public string? WorkflowName { get; set; }
        public bool Success { get; set; }
        public string? Message { get; set; }
        public DateTime TestStartedAt { get; set; }
        public DateTime TestCompletedAt { get; set; }
        public List<SimulatedStep> SimulatedSteps { get; set; } = new();
        public List<string> ValidationErrors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    public class SimulatedStep
    {
        public int StepOrder { get; set; }
        public string? NodeId { get; set; }
        public string? NodeType { get; set; }
        public string? NodeLabel { get; set; }
        public string Status { get; set; } = "Simulated";
        public object? SimulatedOutput { get; set; }
    }

    public class WorkflowDefinitionDto
    {
        public List<WorkflowNodeDto> Nodes { get; set; } = new();
        public List<WorkflowEdgeDto> Edges { get; set; } = new();
    }

    public class WorkflowNodeDto
    {
        public string Id { get; set; } = string.Empty;
        public string? Type { get; set; }
        public string? Label { get; set; }
        public object? Data { get; set; }
    }

    public class WorkflowEdgeDto
    {
        public string Id { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public string Target { get; set; } = string.Empty;
    }
}
