using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    public class FormService : IFormService
    {
        private const string NormalizedDefinitionPlaceholderJson = "[]";

        private readonly IFormRepository _formRepository;
        private readonly IRepository<FormVersionHistory> _versionRepository;
        private readonly IRepository<FormField> _fieldRepository;
        private readonly IRepository<FormPermission>? _permissionRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<FormService> _logger;
        private readonly ISystemLogService _systemLogService;
        private readonly IAuditLogService _auditLogService;
        private readonly IFormConditionNormalizationService _conditionNormalizationService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        private sealed class ConditionGroupModel
        {
            public string Logic { get; set; } = "AND";
            public List<JsonElement> Conditions { get; set; } = new();
        }

        public FormService(
            IFormRepository formRepository,
            IRepository<FormVersionHistory> versionRepository,
            IRepository<FormField> fieldRepository,
            IUnitOfWork unitOfWork,
            ILogger<FormService> logger,
            ISystemLogService systemLogService,
            IAuditLogService auditLogService,
            IFormConditionNormalizationService conditionNormalizationService,
            IHttpContextAccessor httpContextAccessor,
            IRepository<FormPermission>? permissionRepository = null)
        {
            _formRepository = formRepository;
            _versionRepository = versionRepository;
            _fieldRepository = fieldRepository;
            _permissionRepository = permissionRepository;
            _unitOfWork = unitOfWork;
            _logger = logger;
            _systemLogService = systemLogService;
            _auditLogService = auditLogService;
            _conditionNormalizationService = conditionNormalizationService;
            _httpContextAccessor = httpContextAccessor;
        }

        private sealed class CurrentUserContext
        {
            public string? UserId { get; set; }
            public HashSet<string> Roles { get; set; } = new(StringComparer.OrdinalIgnoreCase);
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
                {
                    current.Roles.Add(roleClaim.Value.Trim());
                }
            }

            foreach (var roleClaim in principal.FindAll("role"))
            {
                if (string.IsNullOrWhiteSpace(roleClaim.Value)) continue;
                foreach (var role in roleClaim.Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    current.Roles.Add(role);
                }
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

        private async Task<bool> HasFormPermissionAsync(Guid formId, string requiredLevel, string? explicitUserId = null)
        {
            if (_permissionRepository == null) return true;

            var current = GetCurrentUserContext();
            var userId = explicitUserId ?? current.UserId;

            if (current.Roles.Contains("super-admin") || current.Roles.Contains("admin")) return true;

            var permissions = (await _permissionRepository.FindAsync(p => p.FormId == formId)).ToList();
            if (!permissions.Any()) return true;
            if (string.IsNullOrWhiteSpace(userId)) return false;

            var requiredRank = PermissionRank(requiredLevel);
            Guid.TryParse(userId, out var userGuid);

            foreach (var permission in permissions)
            {
                if (PermissionRank(permission.PermissionLevel) < requiredRank) continue;

                if (permission.UserId.HasValue && permission.UserId.Value == userGuid)
                {
                    return true;
                }

                if (!string.IsNullOrWhiteSpace(permission.RoleName) && current.Roles.Contains(permission.RoleName))
                {
                    return true;
                }
            }

            return false;
        }

        private List<FormField> ParseFormDefinition(string definitionJson, Guid formId, string userId)
        {
            if (string.IsNullOrEmpty(definitionJson))
                return new List<FormField>();

            try
            {
                var formElements = JsonSerializer.Deserialize<List<FormElementDto>>(definitionJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (formElements == null)
                    return new List<FormField>();

                var fields = new List<FormField>();
                var usedFieldNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                int order = 0;

                foreach (var element in formElements)
                {
                    var fieldName = EnsureUniqueFieldName(
                        NormalizeFieldName(element.FieldName, element.Label),
                        usedFieldNames);

                    var field = new FormField
                    {
                        Id = Guid.TryParse(element.Id, out var guid) ? guid : Guid.NewGuid(),
                        FormId = formId,
                        FieldName = fieldName,
                        FieldLabel = element.Label,
                        FieldType = element.Type,
                        IsRequired = element.Required,
                        DisplayOrder = order++,
                        FieldConfigJson = JsonSerializer.Serialize(new
                        {
                            placeholder = element.Placeholder,
                            options = element.Options,
                            validation = element.Validation,
                            calculation = element.Calculation,
                            style = element.Style
                        }),
                        CreatedBy = userId,
                        LastModifiedBy = userId
                    };
                    fields.Add(field);
                }

                return fields;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse form definition JSON for form {FormId}", formId);
                return new List<FormField>();
            }
        }

        private string GenerateFieldName(string label)
        {
            if (string.IsNullOrWhiteSpace(label))
                return "field";

            return string.Concat(label
                .ToLower()
                .Where(c => char.IsLetterOrDigit(c) || c == ' ')
                .Select(c => c == ' ' ? '_' : c))
                .Trim('_');
        }

        private string NormalizeFieldName(string? fieldName, string label)
        {
            var candidate = string.IsNullOrWhiteSpace(fieldName)
                ? GenerateFieldName(label)
                : GenerateFieldName(fieldName);

            return string.IsNullOrWhiteSpace(candidate) ? "field" : candidate;
        }

        private static string EnsureUniqueFieldName(string baseName, ISet<string> usedFieldNames)
        {
            var candidate = string.IsNullOrWhiteSpace(baseName) ? "field" : baseName;
            if (usedFieldNames.Add(candidate))
            {
                return candidate;
            }

            var suffix = 2;
            while (!usedFieldNames.Add($"{candidate}_{suffix}"))
            {
                suffix++;
            }

            return $"{candidate}_{suffix}";
        }

        private void ValidateFieldNames(List<FormElementDto> elements)
        {
            var duplicates = elements
                .Select(element => NormalizeFieldName(element.FieldName, element.Label))
                .GroupBy(name => name, StringComparer.OrdinalIgnoreCase)
                .Where(group => group.Count() > 1)
                .Select(group => group.Key)
                .ToList();

            if (duplicates.Any())
            {
                throw new InvalidOperationException(
                    $"Field names must be unique. Duplicate field names: {string.Join(", ", duplicates)}");
            }
        }

        private async Task<string> BuildDefinitionJsonForResponseAsync(Form form)
        {
            var normalizedDefinitionJson = await _conditionNormalizationService.BuildFormDefinitionJsonAsync(form.Id);
            if (!string.IsNullOrWhiteSpace(normalizedDefinitionJson) && normalizedDefinitionJson != "[]")
            {
                return normalizedDefinitionJson;
            }

            return string.IsNullOrWhiteSpace(form.FormDefinitionJson)
                ? NormalizedDefinitionPlaceholderJson
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

        public async Task<FormDto> CreateFormAsync(CreateFormDto dto, string userId)
        {
            var validationErrors = FormDefinitionValidator.ValidateDefinitionJson(dto.Definition);
            if (validationErrors.Count > 0)
            {
                throw new InvalidOperationException(string.Join("\n", validationErrors));
            }

            var formElements = new List<FormElementDto>();
            if (!string.IsNullOrEmpty(dto.Definition))
            {
                try
                {
                    formElements = JsonSerializer.Deserialize<List<FormElementDto>>(dto.Definition,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<FormElementDto>();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to parse form definition JSON");
                }
            }

            ValidateFieldNames(formElements);
            DetectCircularDependencies(formElements);

            var form = new Form
            {
                FormName = dto.Name,
                FormDescription = dto.Description,
                FormDefinitionJson = NormalizedDefinitionPlaceholderJson,
                FormLayoutJson = dto.Layout ?? "{}",
                CategoryId = dto.CategoryId,
                FormVersion = 1,
                IsActive = true,
                IsPublished = false,
                CreatedBy = userId,
                LastModifiedBy = userId
            };

            await _formRepository.AddAsync(form);
            var fields = ParseFormDefinition(dto.Definition, form.Id, userId);
            foreach (var field in fields)
            {
                await _fieldRepository.AddAsync(field);
            }

            await _unitOfWork.CompleteAsync();

            await _conditionNormalizationService.SaveConditionsFromElementsAsync(form.Id, formElements, fields, userId);
            await _versionRepository.AddAsync(new FormVersionHistory
            {
                FormId = form.Id,
                VersionNumber = 1,
                FormDefinitionJson = dto.Definition,
                FormLayoutJson = form.FormLayoutJson,
                ChangeDescription = dto.ChangeDescription ?? "Initial version",
                CreatedBy = userId
            });
            await _unitOfWork.CompleteAsync();

            var definitionJson = await BuildDefinitionJsonForResponseAsync(form);

            return await BuildFormDtoAsync(form);
        }

        public async Task<IEnumerable<FormDto>> GetAllFormsAsync(Guid? categoryId = null)
        {
            var forms = categoryId.HasValue
                ? await _formRepository.FindAsync(f => !f.IsArchived && f.CategoryId == categoryId.Value)
                : await _formRepository.FindAsync(f => !f.IsArchived);

            var filteredForms = new List<Form>();
            foreach (var form in forms)
            {
                if (await HasFormPermissionAsync(form.Id, "View"))
                {
                    filteredForms.Add(form);
                }
            }

            var dtos = new List<FormDto>();
            foreach (var f in filteredForms)
            {
                dtos.Add(await BuildFormDtoAsync(f));
            }
            return dtos;
        }

        public async Task<FormDto?> GetFormByIdAsync(Guid id)
        {
            var form = await _formRepository.GetByIdAsync(id);
            if (form == null) return null;
            if (!await HasFormPermissionAsync(id, "View")) return null;

            return await BuildFormDtoAsync(form);
        }

        public async Task SyncFormFieldsAsync(Guid formId, string userId)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null) throw new KeyNotFoundException("Form not found");
            if (!await HasFormPermissionAsync(formId, "Edit", userId))
                throw new UnauthorizedAccessException("You do not have permission to edit this form");

            var definitionJson = await BuildDefinitionJsonForResponseAsync(form);
            await SyncFormFieldsAsync(formId, definitionJson, userId);
        }

        public async Task<FormDto> UpdateFormAsync(Guid id, CreateFormDto dto, string userId)
        {
            var validationErrors = FormDefinitionValidator.ValidateDefinitionJson(dto.Definition);
            if (validationErrors.Count > 0)
            {
                throw new InvalidOperationException(string.Join("\n", validationErrors));
            }

            var form = await _formRepository.GetByIdAsync(id);
            if (form == null) throw new KeyNotFoundException("Form not found");
            if (!await HasFormPermissionAsync(id, "Edit", userId))
                throw new UnauthorizedAccessException("You do not have permission to edit this form");

            var existingVersions = await _versionRepository.FindAsync(v => v.FormId == form.Id && v.VersionNumber == form.FormVersion);
            var versionExists = existingVersions.Any();

            var previousDefinitionJson = await BuildDefinitionJsonForResponseAsync(form);

            if (!versionExists)
            {
                var versionHistory = new FormVersionHistory
                {
                    FormId = form.Id,
                    VersionNumber = form.FormVersion,
                    FormDefinitionJson = previousDefinitionJson,
                    FormLayoutJson = form.FormLayoutJson,
                    ChangeDescription = dto.ChangeDescription ?? "Form updated",
                    CreatedBy = userId
                };
                await _versionRepository.AddAsync(versionHistory);
            }

            // Sync form fields first
            await SyncFormFieldsAsync(form.Id, dto.Definition, userId);

            // Parse elements for condition normalization
            var formElements = new List<FormElementDto>();
            if (!string.IsNullOrEmpty(dto.Definition))
            {
                try
                {
                    formElements = JsonSerializer.Deserialize<List<FormElementDto>>(dto.Definition,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<FormElementDto>();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to parse form definition JSON for update");
                }
            }

            ValidateFieldNames(formElements);
            DetectCircularDependencies(formElements);

            // Delete old conditions FIRST (this clears ConditionGroupId on fields)
            await _conditionNormalizationService.DeleteAllConditionsAsync(form.Id);

            // Fetch fields AFTER delete to get the latest state
            var updatedFields = (await _fieldRepository.FindAsync(f => f.FormId == form.Id))
                .ToDictionary(f => f.Id);

            // Save new conditions - this will link fields to condition groups
            await _conditionNormalizationService.SaveConditionsFromElementsAsync(form.Id, formElements, updatedFields.Values.ToList(), userId);

            form.FormName = dto.Name;
            form.FormDescription = dto.Description;
            form.FormLayoutJson = dto.Layout ?? form.FormLayoutJson ?? "{}";
            form.CategoryId = dto.CategoryId;
            form.FormVersion += 1;
            form.FormDefinitionJson = NormalizedDefinitionPlaceholderJson;
            form.LastModifiedBy = userId;
            form.LastModifiedDate = DateTime.UtcNow;

            await _formRepository.UpdateAsync(form);
            await _unitOfWork.CompleteAsync();

            var definitionJson = await BuildDefinitionJsonForResponseAsync(form);

            return await BuildFormDtoAsync(form);
        }

        private async Task SyncFormFieldsAsync(Guid formId, string definitionJson, string userId)
        {
            var existingFields = (await _fieldRepository.FindAsync(f => f.FormId == formId)).ToList();
            var newFields = ParseFormDefinition(definitionJson, formId, userId);

            var existingFieldsById = existingFields.ToDictionary(f => f.Id);
            var existingFieldsByName = existingFields
                .GroupBy(f => f.FieldName, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
            var matchedExistingFieldIds = new HashSet<Guid>();

            foreach (var newField in newFields)
            {
                var existingField = existingFieldsById.TryGetValue(newField.Id, out var exactMatch)
                    ? exactMatch
                    : existingFieldsByName.TryGetValue(newField.FieldName, out var fieldNameMatch)
                        ? fieldNameMatch
                        : null;

                if (existingField != null)
                {
                    existingField.FieldName = newField.FieldName;
                    existingField.FieldLabel = newField.FieldLabel;
                    existingField.FieldType = newField.FieldType;
                    existingField.IsRequired = newField.IsRequired;
                    existingField.DisplayOrder = newField.DisplayOrder;
                    existingField.FieldConfigJson = newField.FieldConfigJson;
                    await _fieldRepository.UpdateAsync(existingField);
                    matchedExistingFieldIds.Add(existingField.Id);
                }
                else
                {
                    await _fieldRepository.AddAsync(newField);
                    matchedExistingFieldIds.Add(newField.Id);
                }
            }

            // Delete fields that were removed from the definition
            var removedFields = existingFields.Where(f => !matchedExistingFieldIds.Contains(f.Id)).ToList();
            if (removedFields.Any())
            {
                await _fieldRepository.DeleteRangeAsync(removedFields);
            }
        }

        public async Task<IEnumerable<FormFieldDto>> GetFormFieldsAsync(Guid formId)
        {
            if (!await HasFormPermissionAsync(formId, "View"))
                throw new UnauthorizedAccessException("You do not have permission to view form fields");

            var formFields = (await _fieldRepository.FindAsync(f => f.FormId == formId)).ToList();

            return formFields.Select(f => new FormFieldDto
            {
                Id = f.Id,
                Name = f.FieldName,
                Label = f.FieldLabel,
                Type = f.FieldType,
                Required = f.IsRequired,
                ConfigJson = f.FieldConfigJson,
                Order = f.DisplayOrder
            });
        }

        public async Task<ExportFormDto> ExportFormAsync(Guid formId)
        {
            if (!await HasFormPermissionAsync(formId, "View"))
                throw new UnauthorizedAccessException("You do not have permission to export this form");

            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");

            var definitionJson = await BuildDefinitionJsonForResponseAsync(form);

            return new ExportFormDto
            {
                Name = form.FormName,
                Description = form.FormDescription,
                Definition = definitionJson,
                Layout = form.FormLayoutJson,
                CategoryId = form.CategoryId,
                Version = form.FormVersion,
                ExportedAt = DateTime.UtcNow
            };
        }

        public async Task<FormDto> ImportFormAsync(ImportFormDto dto, string userId)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new InvalidOperationException("Form name is required");

            if (string.IsNullOrWhiteSpace(dto.Definition))
                throw new InvalidOperationException("Form definition is required");

            var validationErrors = FormDefinitionValidator.ValidateDefinitionJson(dto.Definition);
            if (validationErrors.Count > 0)
            {
                throw new InvalidOperationException(string.Join("\n", validationErrors));
            }

            // Parse elements for condition normalization
            var formElements = new List<FormElementDto>();
            try
            {
                formElements = JsonSerializer.Deserialize<List<FormElementDto>>(dto.Definition,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<FormElementDto>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse imported form definition JSON");
            }

            ValidateFieldNames(formElements);
            DetectCircularDependencies(formElements);

            var form = new Form
            {
                FormName = dto.Name,
                FormDescription = dto.Description,
                FormDefinitionJson = dto.Definition,
                FormLayoutJson = dto.Layout ?? "{}",
                CategoryId = dto.CategoryId,
                FormVersion = 1,
                IsActive = true,
                IsPublished = false,
                CreatedBy = userId,
                LastModifiedBy = userId
            };

            await _formRepository.AddAsync(form);
            var fields = ParseFormDefinition(dto.Definition, form.Id, userId);
            foreach (var field in fields)
            {
                await _fieldRepository.AddAsync(field);
            }

            // Save to DB so FormField IDs exist for condition FK references
            await _unitOfWork.CompleteAsync();

            // Save conditions to normalized tables
            await _conditionNormalizationService.SaveConditionsFromElementsAsync(form.Id, formElements, fields, userId);

            // Rebuild FormDefinitionJson from normalized tables
            form.FormDefinitionJson = await _conditionNormalizationService.BuildFormDefinitionJsonAsync(form.Id);
            await _formRepository.UpdateAsync(form);
            await _unitOfWork.CompleteAsync();

            return await BuildFormDtoAsync(form);
        }

        public async Task<IEnumerable<FormDto>> SearchFormsAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return await GetAllFormsAsync();
            }

            var searchLower = query.ToLower();
            var filteredForms = await _formRepository.FindAsync(f => !f.IsArchived &&
                ((f.FormName != null && f.FormName.ToLower().Contains(searchLower)) ||
                 (f.FormDescription != null && f.FormDescription.ToLower().Contains(searchLower))));

            var dtos = new List<FormDto>();
            foreach (var f in filteredForms)
            {
                if (await HasFormPermissionAsync(f.Id, "View"))
                {
                    dtos.Add(await BuildFormDtoAsync(f));
                }
            }
            return dtos;
        }

        public async Task DeleteFormAsync(Guid formId, string userId, string? reason = null)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");
            if (!await HasFormPermissionAsync(formId, "Edit", userId))
                throw new UnauthorizedAccessException("You do not have permission to delete this form");

            if (form.IsArchived)
                throw new InvalidOperationException("Form is already deleted");

            form.IsArchived = true;
            form.ArchivedAt = DateTime.UtcNow;
            form.ArchivedBy = Guid.TryParse(userId, out var userGuid) ? userGuid : null;
            form.ArchiveReason = reason ?? "Deleted";
            form.IsActive = false;
            form.IsPublished = false;
            form.LastModifiedBy = userId;
            form.LastModifiedDate = DateTime.UtcNow;

            await _formRepository.UpdateAsync(form);
            await _unitOfWork.CompleteAsync();
        }

        public async Task TransferFormOwnershipAsync(Guid formId, string newOwnerId, string currentUserId)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
            {
                throw new KeyNotFoundException("Form not found");
            }

            if (!await HasFormPermissionAsync(formId, "Admin", currentUserId))
            {
                throw new UnauthorizedAccessException("You do not have permission to transfer ownership");
            }

            if (form.CreatedBy != currentUserId)
            {
                throw new InvalidOperationException("Only the form owner can transfer ownership");
            }

            if (string.IsNullOrWhiteSpace(newOwnerId))
            {
                throw new ArgumentException("New owner ID is required");
            }

            var oldOwner = form.CreatedBy;
            form.CreatedBy = newOwnerId;
            form.LastModifiedBy = currentUserId;
            form.LastModifiedDate = DateTime.UtcNow;

            await _formRepository.UpdateAsync(form);
            await _unitOfWork.CompleteAsync();
        }

        private void DetectCircularDependencies(List<FormElementDto> elements)
        {
            var graph = new Dictionary<string, List<string>>();
            var fieldNameToId = elements.ToDictionary(
                element => NormalizeFieldName(element.FieldName, element.Label),
                element => element.Id,
                StringComparer.OrdinalIgnoreCase);

            foreach (var element in elements)
            {
                if (element.Calculation?.Expression != null)
                {
                    var dependencies = ExtractVariables(element.Calculation.Expression);
                    graph[element.Id] = dependencies.Select(dep => fieldNameToId.ContainsKey(dep) ? fieldNameToId[dep] : "").Where(id => !string.IsNullOrEmpty(id)).ToList();
                }
            }
            // DFS to detect cycles
            var visited = new HashSet<string>();
            var recStack = new HashSet<string>();
            foreach (var node in graph.Keys)
            {
                if (HasCycle(node, graph, visited, recStack))
                {
                    throw new InvalidOperationException("Circular dependency detected in calculated fields");
                }
            }
        }

        private List<string> ExtractVariables(string expression)
        {
            var matches = Regex.Matches(expression, @"\b[A-Za-z_][A-Za-z0-9_]*\b");
            return matches.Select(m => m.Value).Distinct().ToList();
        }

        private bool HasCycle(string node, Dictionary<string, List<string>> graph, HashSet<string> visited, HashSet<string> recStack)
        {
            if (recStack.Contains(node)) return true;
            if (visited.Contains(node)) return false;
            visited.Add(node);
            recStack.Add(node);
            if (graph.ContainsKey(node))
            {
                foreach (var neighbor in graph[node])
                {
                    if (HasCycle(neighbor, graph, visited, recStack)) return true;
                }
            }
            recStack.Remove(node);
            return false;
        }
    }
}

