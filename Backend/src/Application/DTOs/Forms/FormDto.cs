using System;

namespace WorkflowAutomation.Application.DTOs.Forms
{
    public class FormDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Definition { get; set; }
        public string Layout { get; set; }
        public int Version { get; set; }
        public string Status { get; set; } // Active/Inactive based on IsActive
        public bool IsPublished { get; set; }
        public DateTime? PublishDate { get; set; }
        public DateTime? UnpublishDate { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public string? LastModifiedBy { get; set; }
        public DateTime? LastModifiedDate { get; set; }
        public Guid? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public bool IsActive { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public string? ArchiveReason { get; set; }
        public DateTime? ExpirationDate { get; set; }
    }
}
