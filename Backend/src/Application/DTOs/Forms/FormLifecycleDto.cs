using System;

namespace WorkflowAutomation.Application.DTOs.Forms
{
    public class ArchiveFormDto
    {
        public string? ArchiveReason { get; set; }
    }

    public class RestoreFormDto
    {
        public string? RestoreReason { get; set; }
    }

    public class SetFormExpirationDto
    {
        public DateTime? ExpirationDate { get; set; }
        public string? ExpirationReason { get; set; }
    }

    public class ScheduleFormPublishingDto
    {
        public DateTime? PublishDate { get; set; }
        public DateTime? UnpublishDate { get; set; }
        public string? ScheduleReason { get; set; }
    }

    public class FormLifecycleStatusDto
    {
        public Guid FormId { get; set; }
        public required string FormName { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public Guid? ArchivedBy { get; set; }
        public string? ArchivedByName { get; set; }
        public string? ArchiveReason { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public string? ExpirationReason { get; set; }
        public DateTime? PublishDate { get; set; }
        public DateTime? UnpublishDate { get; set; }
        public string? ScheduleReason { get; set; }
        public bool IsPublished { get; set; }
        public bool IsExpired { get; set; }
    }
}
