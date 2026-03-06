using System;

namespace WorkflowAutomation.Application.DTOs.FormVersions
{
    public class FormVersionDto
    {
        public Guid Id { get; set; }
        public Guid FormId { get; set; }
        public int VersionNumber { get; set; }
        public string FormDefinitionJson { get; set; }
        public string FormLayoutJson { get; set; }
        public string ChangeDescription { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}