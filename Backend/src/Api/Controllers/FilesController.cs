using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using WorkflowAutomation.Application.DTOs.Files;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Interfaces;
using Microsoft.AspNetCore.RateLimiting;

namespace WorkflowAutomation.Api.Controllers
{
    [Route("api/[controller]")]
    [Authorize]
    [EnableRateLimiting("heavy")]
    public class FilesController : BaseApiController
    {
        private readonly IFileStorageService _fileStorageService;
        private readonly IRepository<Domain.Entities.Form> _formRepository;
        private readonly IFormConditionNormalizationService _conditionNormalizationService;

        public FilesController(
            IFileStorageService fileStorageService,
            IRepository<Domain.Entities.Form> formRepository,
            IFormConditionNormalizationService conditionNormalizationService)
        {
            _fileStorageService = fileStorageService;
            _formRepository = formRepository;
            _conditionNormalizationService = conditionNormalizationService;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> Upload(
            [FromForm] IFormFile file,
            [FromForm] Guid? formId = null,
            [FromForm] string? fieldId = null)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new FileUploadResultDto
                {
                    IsValid = false,
                    Errors = new List<string> { "No file uploaded." }
                });
            if (formId.HasValue && !string.IsNullOrEmpty(fieldId))
            {
                var validationResult = await ValidateFileAgainstFormConfig(file, formId.Value, fieldId);
                if (!validationResult.IsValid)
                {
                    return BadRequest(new FileUploadResultDto
                    {
                        IsValid = false,
                        FileName = file.FileName,
                        FileSize = file.Length,
                        FileType = file.ContentType,
                        Errors = validationResult.Errors
                    });
                }
            }

            // Magic-byte content scanning to prevent file type spoofing
            var magicByteErrors = await ValidateFileMagicBytes(file);
            if (magicByteErrors.Count > 0)
            {
                return BadRequest(new FileUploadResultDto
                {
                    IsValid = false,
                    FileName = file.FileName,
                    FileSize = file.Length,
                    FileType = file.ContentType,
                    Errors = magicByteErrors
                });
            }

            try
            {
                using (var stream = file.OpenReadStream())
                {
                    var savedFileId = await _fileStorageService.SaveFileAsync(stream, file.FileName);
                    return Ok(new FileUploadResultDto
                    {
                        IsValid = true,
                        FileId = savedFileId,
                        FileName = file.FileName,
                        FileSize = file.Length,
                        FileType = file.ContentType,
                        Errors = new List<string>()
                    });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new FileUploadResultDto
                {
                    IsValid = false,
                    FileName = file.FileName,
                    FileSize = file.Length,
                    FileType = file.ContentType,
                    Errors = new List<string> { $"File upload failed: {ex.Message}" }
                });
            }
        }

        private async Task<FileValidationResult> ValidateFileAgainstFormConfig(
            IFormFile file,
            Guid formId,
            string fieldId)
        {
            var result = new FileValidationResult { IsValid = true, Errors = new List<string>() };

            // Get form definition
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
            {
                result.IsValid = false;
                result.Errors.Add("Form not found.");
                return result;
            }

            var normalizedDefinition = await _conditionNormalizationService.BuildFormDefinitionJsonAsync(formId);
            var definitionSource = !string.IsNullOrWhiteSpace(normalizedDefinition) && normalizedDefinition != "[]"
                ? normalizedDefinition
                : form.FormDefinitionJson;

            // Parse form definition
            JsonDocument formDefinition;
            try
            {
                formDefinition = JsonDocument.Parse(definitionSource);
            }
            catch
            {
                result.IsValid = false;
                result.Errors.Add("Invalid form definition.");
                return result;
            }

            // Find the field configuration (support array or { elements: [] })
            FieldFileConfig? fieldConfig = null;
            if (formDefinition.RootElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var element in formDefinition.RootElement.EnumerateArray())
                {
                    if (element.TryGetProperty("id", out var id) && id.GetString() == fieldId)
                    {
                        if (element.TryGetProperty("validation", out var validation))
                        {
                            fieldConfig = ParseFieldFileConfig(validation);
                        }
                        break;
                    }
                }
            }
            else if (formDefinition.RootElement.TryGetProperty("elements", out var elements))
            {
                foreach (var element in elements.EnumerateArray())
                {
                    if (element.TryGetProperty("id", out var id) && id.GetString() == fieldId)
                    {
                        if (element.TryGetProperty("validation", out var validation))
                        {
                            fieldConfig = ParseFieldFileConfig(validation);
                        }
                        break;
                    }
                }
            }

            if (fieldConfig == null)
            {
                // No validation rules configured, allow upload
                return result;
            }

            // Validate file type
            if (fieldConfig.FileTypes != null && fieldConfig.FileTypes.Count > 0)
            {
                var fileName = file.FileName.ToLower();
                var contentType = file.ContentType.ToLower();
                var allowedTypes = fieldConfig.FileTypes.Select(t => t.ToLower()).ToList();

                var isValidType = allowedTypes.Any(type =>
                    contentType.Contains(type) ||
                    fileName.EndsWith($".{type}") ||
                    fileName.EndsWith(type));

                if (!isValidType)
                {
                    result.IsValid = false;
                    result.Errors.Add($"File type not allowed. Allowed types: {string.Join(", ", fieldConfig.FileTypes)}");
                }
            }

            // Validate file size
            if (fieldConfig.MaxSize.HasValue)
            {
                var maxSizeBytes = fieldConfig.MaxSize.Value * 1024 * 1024; // Convert MB to bytes
                if (file.Length > maxSizeBytes)
                {
                    result.IsValid = false;
                    result.Errors.Add($"File size exceeds maximum allowed size of {fieldConfig.MaxSize.Value}MB. Current size: {(file.Length / 1024.0 / 1024.0):F2}MB");
                }
            }

            return result;
        }

        private FieldFileConfig ParseFieldFileConfig(JsonElement validation)
        {
            var config = new FieldFileConfig();

            if (validation.TryGetProperty("fileTypes", out var fileTypes) && fileTypes.ValueKind == JsonValueKind.Array)
            {
                config.FileTypes = fileTypes.EnumerateArray()
                    .Where(t => t.ValueKind == JsonValueKind.String)
                    .Select(t => t.GetString()!)
                    .ToList();
            }

            if (validation.TryGetProperty("maxSize", out var maxSize) && maxSize.ValueKind == JsonValueKind.Number)
            {
                if (maxSize.TryGetInt32(out var maxSizeValue))
                {
                    config.MaxSize = maxSizeValue;
                }
            }

            return config;
        }

        private static async Task<List<string>> ValidateFileMagicBytes(IFormFile file)
        {
            var errors = new List<string>();
            if (file.Length < 4) return errors; // Too small to check

            var header = new byte[8];
            using (var stream = file.OpenReadStream())
            {
                var bytesRead = await stream.ReadAsync(header, 0, header.Length);
                if (bytesRead < 4) return errors;
            }

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var contentType = file.ContentType.ToLowerInvariant();

            // Map of extensions/content-types to expected magic bytes
            // Only flag a mismatch if we recognize the extension AND the bytes don't match
            var signatureChecks = new Dictionary<string, Func<byte[], bool>>
            {
                // PDF: %PDF
                { ".pdf", h => h[0] == 0x25 && h[1] == 0x50 && h[2] == 0x44 && h[3] == 0x46 },
                // PNG: 0x89 P N G
                { ".png", h => h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47 },
                // JPEG: 0xFF 0xD8 0xFF
                { ".jpg", h => h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF },
                { ".jpeg", h => h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF },
                // GIF: GIF8
                { ".gif", h => h[0] == 0x47 && h[1] == 0x49 && h[2] == 0x46 && h[3] == 0x38 },
                // ZIP (also docx, xlsx, pptx): PK 0x03 0x04
                { ".zip", h => h[0] == 0x50 && h[1] == 0x4B && h[2] == 0x03 && h[3] == 0x04 },
                { ".docx", h => h[0] == 0x50 && h[1] == 0x4B && h[2] == 0x03 && h[3] == 0x04 },
                { ".xlsx", h => h[0] == 0x50 && h[1] == 0x4B && h[2] == 0x03 && h[3] == 0x04 },
                { ".pptx", h => h[0] == 0x50 && h[1] == 0x4B && h[2] == 0x03 && h[3] == 0x04 },
                // BMP: BM
                { ".bmp", h => h[0] == 0x42 && h[1] == 0x4D },
                // WEBP: RIFF....WEBP (bytes 0-3 = RIFF)
                { ".webp", h => h[0] == 0x52 && h[1] == 0x49 && h[2] == 0x46 && h[3] == 0x46 },
            };

            // Dangerous executable signatures to always reject
            bool isExecutable =
                (header[0] == 0x4D && header[1] == 0x5A) || // MZ (PE exe/dll)
                (header[0] == 0x7F && header[1] == 0x45 && header[2] == 0x4C && header[3] == 0x46); // ELF

            if (isExecutable)
            {
                errors.Add("Executable files are not allowed.");
                return errors;
            }

            if (signatureChecks.TryGetValue(ext, out var check))
            {
                if (!check(header))
                {
                    errors.Add($"File content does not match the expected format for '{ext}'. The file may be corrupted or its extension may be spoofed.");
                }
            }

            return errors;
        }

        [HttpGet("{fileId}")]
        public async Task<IActionResult> Download(string fileId)
        {
            try
            {
                var stream = await _fileStorageService.GetFileAsync(fileId);
                return File(stream, "application/octet-stream", fileId);
            }
            catch (FileNotFoundException)
            {
                return NotFound();
            }
        }
    }

    public class FileValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class FieldFileConfig
    {
        public List<string>? FileTypes { get; set; }
        public int? MaxSize { get; set; }
    }
}
