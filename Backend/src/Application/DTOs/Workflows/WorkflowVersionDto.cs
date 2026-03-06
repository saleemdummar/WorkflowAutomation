using System;

namespace WorkflowAutomation.Application.DTOs.Workflows
{
    public class WorkflowVersionDto
    {
        public Guid Id { get; set; }
        public Guid WorkflowId { get; set; }
        public int VersionNumber { get; set; }
        public string WorkflowDefinitionJson { get; set; }
        public string ChangeDescription { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class WorkflowVersionCompareDto
    {
        public WorkflowVersionDto Version1 { get; set; }
        public WorkflowVersionDto Version2 { get; set; }
        public string[] AddedNodes { get; set; }
        public string[] RemovedNodes { get; set; }
        public string[] ModifiedNodes { get; set; }
        public string[] AddedEdges { get; set; }
        public string[] RemovedEdges { get; set; }
        public WorkflowChangeDto[] Changes { get; set; }
    }

    public class WorkflowChangeDto
    {
        public string Path { get; set; }
        public string OldValue { get; set; }
        public string NewValue { get; set; }
    }
}
