using System.Collections.Generic;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class Form : BaseAuditableEntity
    {
        public string FormName { get; set; }
        public string FormDescription { get; set; }
        public Guid? CategoryId { get; set; }
        public FormCategory Category { get; set; }
        public int FormVersion { get; set; }
        public bool IsActive { get; set; }
        public bool IsPublished { get; set; }
        public string FormDefinitionJson { get; set; }
        public string FormLayoutJson { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public Guid? ArchivedBy { get; set; }
        public string? ArchiveReason { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public string? ExpirationReason { get; set; }
        public DateTime? PublishDate { get; set; }
        public DateTime? UnpublishDate { get; set; }
        public string? ScheduleReason { get; set; }

        public ICollection<FormField> Fields { get; set; } = new List<FormField>();
        public ICollection<FormVersionHistory> VersionHistory { get; set; } = new List<FormVersionHistory>();
        public ICollection<FormCondition> Conditions { get; set; } = new List<FormCondition>();
        public ICollection<Workflow> Workflows { get; set; } = new List<Workflow>();
        public ICollection<FormSubmission> Submissions { get; set; } = new List<FormSubmission>();
    }
}
