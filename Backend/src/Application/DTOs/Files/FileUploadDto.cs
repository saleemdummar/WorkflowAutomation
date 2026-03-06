using System.Collections.Generic;

namespace WorkflowAutomation.Application.DTOs.Files
{
    public class FileUploadResultDto
    {
        public bool IsValid { get; set; }
        public string? FileId { get; set; }
        public string? FileName { get; set; }
        public long FileSize { get; set; }
        public string? FileType { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class FileValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class FieldFileConfig
    {
        public List<string>? FileTypes { get; set; }
        public int? MaxSize { get; set; } // in MB
    }
}
