using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    /// <summary>
    /// Manages form lifecycle operations: publishing, archiving, expiration, and scheduled publishing.
    /// Extracted from FormService to separate lifecycle concerns from CRUD/definition logic.
    /// </summary>
    public class FormLifecycleService : IFormLifecycleService
    {
        private readonly IFormRepository _formRepository;
        private readonly IRepository<FormPermission>? _permissionRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IFormConditionNormalizationService _conditionNormalizationService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<FormLifecycleService> _logger;

        public FormLifecycleService(
            IFormRepository formRepository,
            IUnitOfWork unitOfWork,
            IFormConditionNormalizationService conditionNormalizationService,
            IHttpContextAccessor httpContextAccessor,
            ILogger<FormLifecycleService> logger,
            IRepository<FormPermission>? permissionRepository = null)
        {
            _formRepository = formRepository;
            _unitOfWork = unitOfWork;
            _conditionNormalizationService = conditionNormalizationService;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
            _permissionRepository = permissionRepository;
        }

        public async Task PublishFormAsync(Guid formId, string userId)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");
            if (!await HasFormPermissionAsync(formId, "Edit", userId))
                throw new UnauthorizedAccessException("You do not have permission to publish this form");

            var definitionJson = await BuildDefinitionJsonForResponseAsync(form);
            var validationErrors = FormDefinitionValidator.ValidateDefinitionJson(definitionJson);
            if (validationErrors.Count > 0)
            {
                throw new InvalidOperationException(string.Join("\n", validationErrors));
            }

            form.IsPublished = true;
            form.LastModifiedBy = userId;
            form.LastModifiedDate = DateTime.UtcNow;

            await _formRepository.UpdateAsync(form);
            await _unitOfWork.CompleteAsync();
        }

        public async Task UnpublishFormAsync(Guid formId, string userId)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");
            if (!await HasFormPermissionAsync(formId, "Edit", userId))
                throw new UnauthorizedAccessException("You do not have permission to unpublish this form");

            form.IsPublished = false;
            form.LastModifiedBy = userId;
            form.LastModifiedDate = DateTime.UtcNow;

            await _formRepository.UpdateAsync(form);
            await _unitOfWork.CompleteAsync();
        }

        public async Task ArchiveFormAsync(Guid formId, string userId, string? reason = null)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");
            if (!await HasFormPermissionAsync(formId, "Edit", userId))
                throw new UnauthorizedAccessException("You do not have permission to archive this form");

            if (form.IsArchived)
                throw new InvalidOperationException("Form is already archived");

            form.IsArchived = true;
            form.ArchivedAt = DateTime.UtcNow;
            form.ArchivedBy = Guid.Parse(userId);
            form.ArchiveReason = reason;
            form.IsActive = false;
            form.LastModifiedBy = userId;
            form.LastModifiedDate = DateTime.UtcNow;

            await _formRepository.UpdateAsync(form);
            await _unitOfWork.CompleteAsync();
        }

        public async Task RestoreFormAsync(Guid formId, string userId, string? reason = null)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");
            if (!await HasFormPermissionAsync(formId, "Edit", userId))
                throw new UnauthorizedAccessException("You do not have permission to restore this form");

            if (!form.IsArchived)
                throw new InvalidOperationException("Form is not archived");

            form.IsArchived = false;
            form.ArchivedAt = null;
            form.ArchivedBy = null;
            form.ArchiveReason = null;
            form.IsActive = true;
            form.LastModifiedBy = userId;
            form.LastModifiedDate = DateTime.UtcNow;

            await _formRepository.UpdateAsync(form);
            await _unitOfWork.CompleteAsync();
        }

        public async Task SetFormExpirationAsync(Guid formId, DateTime? expirationDate, string userId, string? reason = null)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");
            if (!await HasFormPermissionAsync(formId, "Edit", userId))
                throw new UnauthorizedAccessException("You do not have permission to set expiration");

            if (expirationDate.HasValue && expirationDate.Value < DateTime.UtcNow)
                throw new ArgumentException("Expiration date cannot be in the past");

            form.ExpirationDate = expirationDate;
            form.ExpirationReason = reason;
            form.LastModifiedBy = userId;
            form.LastModifiedDate = DateTime.UtcNow;

            await _formRepository.UpdateAsync(form);
            await _unitOfWork.CompleteAsync();
        }

        public async Task ScheduleFormPublishingAsync(Guid formId, DateTime? publishDate, DateTime? unpublishDate, string userId, string? reason = null)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");
            if (!await HasFormPermissionAsync(formId, "Edit", userId))
                throw new UnauthorizedAccessException("You do not have permission to schedule publishing");

            if (publishDate.HasValue && unpublishDate.HasValue && publishDate.Value >= unpublishDate.Value)
                throw new ArgumentException("Publish date must be before unpublish date");

            form.PublishDate = publishDate;
            form.UnpublishDate = unpublishDate;
            form.ScheduleReason = reason;
            form.LastModifiedBy = userId;
            form.LastModifiedDate = DateTime.UtcNow;

            if (publishDate.HasValue && publishDate.Value <= DateTime.UtcNow)
            {
                form.IsPublished = true;
            }

            if (unpublishDate.HasValue && unpublishDate.Value <= DateTime.UtcNow)
            {
                form.IsPublished = false;
            }

            await _formRepository.UpdateAsync(form);
            await _unitOfWork.CompleteAsync();
        }

        public async Task<FormLifecycleStatusDto> GetFormLifecycleStatusAsync(Guid formId)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");

            var now = DateTime.UtcNow;
            var isExpired = form.ExpirationDate.HasValue && form.ExpirationDate.Value < now;
            var isPublished = form.IsPublished;

            if (form.PublishDate.HasValue && form.PublishDate.Value <= now && !form.IsPublished)
            {
                isPublished = true;
            }

            if (form.UnpublishDate.HasValue && form.UnpublishDate.Value <= now && form.IsPublished)
            {
                isPublished = false;
            }

            return new FormLifecycleStatusDto
            {
                FormId = form.Id,
                FormName = form.FormName,
                IsArchived = form.IsArchived,
                ArchivedAt = form.ArchivedAt,
                ArchivedBy = form.ArchivedBy,
                ArchiveReason = form.ArchiveReason,
                ExpirationDate = form.ExpirationDate,
                ExpirationReason = form.ExpirationReason,
                PublishDate = form.PublishDate,
                UnpublishDate = form.UnpublishDate,
                ScheduleReason = form.ScheduleReason,
                IsPublished = isPublished,
                IsExpired = isExpired
            };
        }

        public async Task<IEnumerable<FormDto>> GetArchivedFormsAsync()
        {
            var archivedForms = await _formRepository.FindAsync(f => f.IsArchived);
            var dtos = new List<FormDto>();
            foreach (var form in archivedForms)
            {
                var dto = await BuildFormDtoAsync(form);
                dto.Status = form.IsPublished ? "Published" : "Draft";
                dto.CreatedBy = form.CreatedBy?.ToString() ?? string.Empty;
                dtos.Add(dto);
            }

            return dtos;
        }

        public async Task<IEnumerable<FormDto>> GetExpiredFormsAsync()
        {
            var now = DateTime.UtcNow;
            var expiredForms = await _formRepository.FindAsync(f => f.ExpirationDate.HasValue && f.ExpirationDate.Value < now);
            var dtos = new List<FormDto>();
            foreach (var form in expiredForms)
            {
                var dto = await BuildFormDtoAsync(form);
                dto.Status = form.IsPublished ? "Published" : "Draft";
                dto.CreatedBy = form.CreatedBy?.ToString() ?? string.Empty;
                dtos.Add(dto);
            }

            return dtos;
        }

        public async Task ProcessScheduledPublishingAsync()
        {
            var now = DateTime.UtcNow;
            var forms = await _formRepository.FindAsync(f =>
                (!f.IsPublished && f.PublishDate.HasValue && f.PublishDate.Value <= now) ||
                (f.IsPublished && f.UnpublishDate.HasValue && f.UnpublishDate.Value <= now) ||
                (!f.IsArchived && f.ExpirationDate.HasValue && f.ExpirationDate.Value <= now));

            foreach (var form in forms)
            {
                // Auto-publish forms with a scheduled publish date
                if (!form.IsPublished && form.PublishDate.HasValue && form.PublishDate.Value <= now)
                {
                    form.IsPublished = true;
                    form.IsActive = true;
                    form.PublishDate = null; // Clear schedule after processing
                    await _formRepository.UpdateAsync(form);
                }

                // Auto-unpublish forms with a scheduled unpublish date
                if (form.IsPublished && form.UnpublishDate.HasValue && form.UnpublishDate.Value <= now)
                {
                    form.IsPublished = false;
                    form.UnpublishDate = null; // Clear schedule after processing
                    await _formRepository.UpdateAsync(form);
                }

                // Auto-archive expired forms
                if (!form.IsArchived && form.ExpirationDate.HasValue && form.ExpirationDate.Value <= now)
                {
                    form.IsArchived = true;
                    form.ArchivedAt = now;
                    form.IsPublished = false;
                    form.ArchiveReason = "Auto-archived: form expired";
                    await _formRepository.UpdateAsync(form);
                }
            }

            await _unitOfWork.CompleteAsync();
        }

        #region Private helpers

        private async Task<string> BuildDefinitionJsonForResponseAsync(Form form)
        {
            var normalizedDefinitionJson = await _conditionNormalizationService.BuildFormDefinitionJsonAsync(form.Id);
            if (!string.IsNullOrWhiteSpace(normalizedDefinitionJson) && normalizedDefinitionJson != "[]")
            {
                return normalizedDefinitionJson;
            }

            return string.IsNullOrWhiteSpace(form.FormDefinitionJson)
                ? "[]"
                : form.FormDefinitionJson;
        }

        private async Task<FormDto> BuildFormDtoAsync(Form form)
        {
            var definitionJson = await BuildDefinitionJsonForResponseAsync(form);

            return new FormDto
            {
                Id = form.Id,
                Name = form.FormName,
                Description = form.FormDescription,
                Definition = definitionJson,
                Layout = form.FormLayoutJson,
                Version = form.FormVersion,
                Status = form.IsActive ? "Active" : "Inactive",
                IsPublished = form.IsPublished,
                PublishDate = form.PublishDate,
                UnpublishDate = form.UnpublishDate,
                CreatedBy = form.CreatedBy,
                CreatedDate = form.CreatedDate,
                LastModifiedBy = form.LastModifiedBy,
                LastModifiedDate = form.LastModifiedDate,
                CategoryId = form.CategoryId,
                CategoryName = form.Category?.CategoryName,
                IsActive = form.IsActive,
                IsArchived = form.IsArchived,
                ArchivedAt = form.ArchivedAt,
                ArchiveReason = form.ArchiveReason,
                ExpirationDate = form.ExpirationDate
            };
        }

        private async Task<bool> HasFormPermissionAsync(Guid formId, string requiredLevel, string? explicitUserId = null)
        {
            if (_permissionRepository == null) return true;

            var current = GetCurrentUserContext();
            var userId = explicitUserId ?? current.UserId;

            if (current.Roles.Contains("super-admin") || current.Roles.Contains("admin")) return true;
            if (string.IsNullOrWhiteSpace(userId)) return true;

            var permissions = (await _permissionRepository.FindAsync(p => p.FormId == formId)).ToList();
            if (!permissions.Any()) return true;

            var requiredRank = PermissionRank(requiredLevel);
            Guid.TryParse(userId, out var userGuid);

            foreach (var permission in permissions)
            {
                if (PermissionRank(permission.PermissionLevel) < requiredRank) continue;

                if (permission.UserId.HasValue && permission.UserId.Value == userGuid)
                    return true;

                if (!string.IsNullOrWhiteSpace(permission.RoleName) && current.Roles.Contains(permission.RoleName))
                    return true;
            }

            return false;
        }

        private CurrentUserContext GetCurrentUserContext()
        {
            var current = new CurrentUserContext();
            var principal = _httpContextAccessor.HttpContext?.User as ClaimsPrincipal;
            if (principal == null || principal.Identity?.IsAuthenticated != true) return current;

            current.UserId = principal.FindFirst("sub")?.Value
                ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            foreach (var roleClaim in principal.FindAll(ClaimTypes.Role))
            {
                if (!string.IsNullOrWhiteSpace(roleClaim.Value))
                    current.Roles.Add(roleClaim.Value.Trim());
            }

            foreach (var roleClaim in principal.FindAll("role"))
            {
                if (string.IsNullOrWhiteSpace(roleClaim.Value)) continue;
                foreach (var role in roleClaim.Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                    current.Roles.Add(role);
            }

            return current;
        }

        private static int PermissionRank(string? level)
        {
            return level?.ToLowerInvariant() switch
            {
                "admin" => 4,
                "edit" => 3,
                "submit" => 2,
                _ => 1
            };
        }

        private sealed class CurrentUserContext
        {
            public string? UserId { get; set; }
            public HashSet<string> Roles { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        }

        #endregion
    }

    /// <summary>
    /// Static helper for form definition JSON validation.
    /// Shared between FormService and FormLifecycleService.
    /// </summary>
    internal static class FormDefinitionValidator
    {
        public static List<string> ValidateDefinitionJson(string definitionJson)
        {
            var errors = new List<string>();
            if (string.IsNullOrWhiteSpace(definitionJson)) return errors;

            List<System.Text.Json.JsonElement> elements;
            try
            {
                elements = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(definitionJson,
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<System.Text.Json.JsonElement>();
            }
            catch
            {
                errors.Add("Form definition JSON is invalid");
                return errors;
            }

            var elementMap = elements
                .Where(e => e.ValueKind == System.Text.Json.JsonValueKind.Object)
                .Select(e => new
                {
                    Id = GetString(e, "id"),
                    Type = GetString(e, "type"),
                    Label = GetString(e, "label") ?? "Field"
                })
                .Where(e => !string.IsNullOrWhiteSpace(e.Id))
                .ToDictionary(e => e.Id!, e => e);

            foreach (var element in elements.Where(e => e.ValueKind == System.Text.Json.JsonValueKind.Object))
            {
                if (!element.TryGetProperty("conditions", out var conditions) || conditions.ValueKind != System.Text.Json.JsonValueKind.Object)
                    continue;

                foreach (var condition in CollectConditions(conditions))
                {
                    var fieldId = GetString(condition, "fieldId");
                    var op = GetString(condition, "operator");
                    var label = GetString(element, "label") ?? "Field";

                    if (string.IsNullOrWhiteSpace(fieldId))
                    {
                        errors.Add($"\"{label}\": Condition field is required");
                        continue;
                    }

                    if (!elementMap.TryGetValue(fieldId, out var target))
                    {
                        errors.Add($"\"{label}\": Condition references missing field");
                        continue;
                    }

                    var validOps = GetValidOperators(target.Type ?? string.Empty);
                    if (string.IsNullOrWhiteSpace(op) || !validOps.Contains(op))
                    {
                        errors.Add($"\"{label}\": Operator '{op}' invalid for {target.Type}");
                    }

                    if (!string.Equals(op, "is_empty", StringComparison.OrdinalIgnoreCase) &&
                        !string.Equals(op, "is_not_empty", StringComparison.OrdinalIgnoreCase))
                    {
                        if (!condition.TryGetProperty("value", out var value) ||
                            value.ValueKind == System.Text.Json.JsonValueKind.Null ||
                            value.ValueKind == System.Text.Json.JsonValueKind.Undefined ||
                            (value.ValueKind == System.Text.Json.JsonValueKind.String && string.IsNullOrWhiteSpace(value.GetString())))
                        {
                            errors.Add($"\"{label}\": Condition value is required");
                        }
                    }
                }
            }

            return errors;
        }

        private static string? GetString(System.Text.Json.JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var prop) && prop.ValueKind == System.Text.Json.JsonValueKind.String)
                return prop.GetString();
            return null;
        }

        private static string[] GetValidOperators(string fieldType)
        {
            return fieldType switch
            {
                "text" or "textarea" or "email" or "select" or "radio" => new[] { "equals", "not_equals", "contains", "is_empty", "is_not_empty" },
                "number" or "date" => new[] { "equals", "not_equals", "greater_than", "less_than", "is_empty", "is_not_empty" },
                "checkbox" => new[] { "equals", "not_equals", "contains", "is_empty", "is_not_empty" },
                "file" => new[] { "is_empty", "is_not_empty" },
                _ => new[] { "equals", "not_equals", "is_empty", "is_not_empty" }
            };
        }

        private static IEnumerable<System.Text.Json.JsonElement> CollectConditions(System.Text.Json.JsonElement groupElement)
        {
            if (groupElement.ValueKind != System.Text.Json.JsonValueKind.Object) yield break;
            if (!groupElement.TryGetProperty("conditions", out var conditions) || conditions.ValueKind != System.Text.Json.JsonValueKind.Array) yield break;

            foreach (var item in conditions.EnumerateArray())
            {
                if (item.ValueKind != System.Text.Json.JsonValueKind.Object) continue;
                if (item.TryGetProperty("logic", out _))
                {
                    foreach (var nested in CollectConditions(item))
                        yield return nested;
                }
                else
                {
                    yield return item;
                }
            }
        }
    }
}
