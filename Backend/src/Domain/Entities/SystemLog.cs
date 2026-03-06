using System;
using WorkflowAutomation.Domain.Common;
using WorkflowAutomation.Domain.Enums;

namespace WorkflowAutomation.Domain.Entities
{
    public class SystemLog
    {
        public long LogId { get; set; } // BIGINT IDENTITY
        public LogLevel LogLevel { get; set; }
        public string Source { get; set; }
        public string Message { get; set; }
        public string? Exception { get; set; }
        public string? StackTrace { get; set; }
        public Guid? UserId { get; set; }
        public Guid? SubmissionId { get; set; }
        public Guid? WorkflowInstanceId { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}