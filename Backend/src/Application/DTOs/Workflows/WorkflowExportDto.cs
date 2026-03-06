using System;

namespace WorkflowAutomation.Application.DTOs.Workflows
{
    /// <summary>
    /// Portable workflow export format containing all data needed to recreate a workflow.
    /// </summary>
    public class WorkflowExportDto
    {
        public string ExportVersion { get; set; } = "1.0";
        public DateTime ExportedAt { get; set; } = DateTime.UtcNow;
        public string Name { get; set; }
        public string Description { get; set; }
        public string Definition { get; set; }
        public int Version { get; set; }
    }

    /// <summary>
    /// Request body for importing a workflow.
    /// </summary>
    public class WorkflowImportDto
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string Definition { get; set; }
    }
}
