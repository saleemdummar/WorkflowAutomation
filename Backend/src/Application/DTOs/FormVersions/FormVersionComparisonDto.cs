using System.Collections.Generic;

namespace WorkflowAutomation.Application.DTOs.FormVersions
{
    public class FormVersionComparisonDto
    {
        public FormVersionDto Version1 { get; set; }
        public FormVersionDto Version2 { get; set; }
        public List<string> Differences { get; set; }
        public bool HasChanges { get; set; }
    }
}