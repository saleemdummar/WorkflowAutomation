using System;

namespace WorkflowAutomation.Application.DTOs.Forms
{
    public class ExportFormDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Definition { get; set; }
        public string Layout { get; set; }
        public string CategoryName { get; set; }
        public int Version { get; set; }
        public DateTime ExportedAt { get; set; }
        public Guid? CategoryId { get; set; }
    }
}
