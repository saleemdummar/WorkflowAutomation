using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using WorkflowAutomation.Application.DTOs.FormVersions;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    public class FormVersionService : IFormVersionService
    {
        private readonly IRepository<FormVersionHistory> _versionRepository;
        private readonly IRepository<Form> _formRepository;
        private readonly IRepository<FormPermission>? _permissionRepository;
        private readonly IFormService _formService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IUnitOfWork _unitOfWork;

        public FormVersionService(
            IRepository<FormVersionHistory> versionRepository,
            IRepository<Form> formRepository,
            IFormService formService,
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor,
            IRepository<FormPermission>? permissionRepository = null)
        {
            _versionRepository = versionRepository;
            _formRepository = formRepository;
            _permissionRepository = permissionRepository;
            _formService = formService;
            _httpContextAccessor = httpContextAccessor;
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<FormVersionDto>> GetFormVersionsAsync(Guid formId)
        {
            if (!await HasFormPermissionAsync(formId, "View"))
                return Enumerable.Empty<FormVersionDto>();

            var versions = await _versionRepository.FindAsync(v => v.FormId == formId);
            return versions
                .OrderByDescending(v => v.VersionNumber)
                .Select(MapToDto);
        }

        public async Task<FormVersionDto> GetVersionByIdAsync(Guid versionId)
        {
            var version = await _versionRepository.GetByIdAsync(versionId);
            if (version == null || !await HasFormPermissionAsync(version.FormId, "View"))
                return null;

            return MapToDto(version);
        }

        public async Task<FormVersionDto> GetLatestVersionAsync(Guid formId)
        {
            if (!await HasFormPermissionAsync(formId, "View"))
                return null;

            var versions = await _versionRepository.FindAsync(v => v.FormId == formId);
            var latest = versions
                .OrderByDescending(v => v.VersionNumber)
                .FirstOrDefault();

            return latest != null ? MapToDto(latest) : null;
        }

        public async Task<FormDto> RollbackToVersionAsync(Guid formId, int versionNumber, string userId)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");
            if (!await HasFormPermissionAsync(formId, "Edit", userId))
                throw new UnauthorizedAccessException("You do not have permission to rollback this form");

            var versions = await _versionRepository.FindAsync(v => v.FormId == formId && v.VersionNumber == versionNumber);
            var targetVersion = versions.FirstOrDefault();

            if (targetVersion == null)
                throw new KeyNotFoundException("Version not found");

            var rollbackVersion = new FormVersionHistory
            {
                FormId = formId,
                VersionNumber = form.FormVersion + 1,
                FormDefinitionJson = (await _formService.GetFormByIdAsync(formId))?.Definition ?? form.FormDefinitionJson,
                FormLayoutJson = form.FormLayoutJson,
                ChangeDescription = $"Rolled back to version {versionNumber}",
                CreatedBy = userId
            };

            await _versionRepository.AddAsync(rollbackVersion);

            var updateDto = new CreateFormDto
            {
                Name = form.FormName,
                Description = form.FormDescription,
                Definition = targetVersion.FormDefinitionJson,
                Layout = targetVersion.FormLayoutJson
            };

            var updatedForm = await _formService.UpdateFormAsync(formId, updateDto, userId);

            await _unitOfWork.CompleteAsync();

            return updatedForm;
        }

        public async Task<FormVersionComparisonDto> CompareVersionsAsync(Guid formId, int version1, int version2)
        {
            if (!await HasFormPermissionAsync(formId, "View"))
                throw new KeyNotFoundException("Form not found");

            var versions = await _versionRepository.FindAsync(v => v.FormId == formId && (v.VersionNumber == version1 || v.VersionNumber == version2));
            var v1 = versions.FirstOrDefault(v => v.VersionNumber == version1);
            var v2 = versions.FirstOrDefault(v => v.VersionNumber == version2);

            if (v1 == null || v2 == null)
                throw new KeyNotFoundException("One or both versions not found");

            var differences = new List<string>();
            bool hasChanges = false;

            if (v1.FormLayoutJson != v2.FormLayoutJson)
            {
                differences.Add("Form layout has changed");
                hasChanges = true;
            }

            try
            {
                var fields1 = JsonNode.Parse(v1.FormDefinitionJson ?? "[]")!.AsArray();
                var fields2 = JsonNode.Parse(v2.FormDefinitionJson ?? "[]")!.AsArray();

                var map1 = fields1.ToDictionary(f => f?["id"]?.ToString() ?? "", f => f);
                var map2 = fields2.ToDictionary(f => f?["id"]?.ToString() ?? "", f => f);

                var ids1 = map1.Keys.ToHashSet();
                var ids2 = map2.Keys.ToHashSet();

                var added = ids2.Except(ids1).ToList();
                var removed = ids1.Except(ids2).ToList();
                var common = ids1.Intersect(ids2).ToList();

                foreach (var id in added)
                {
                    var label = map2[id]?["label"]?.ToString() ?? id;
                    differences.Add($"Added field: \"{label}\" ({map2[id]?["type"]})");
                    hasChanges = true;
                }

                foreach (var id in removed)
                {
                    var label = map1[id]?["label"]?.ToString() ?? id;
                    differences.Add($"Removed field: \"{label}\" ({map1[id]?["type"]})");
                    hasChanges = true;
                }

                foreach (var id in common)
                {
                    var f1 = map1[id];
                    var f2 = map2[id];
                    if (JsonNode.DeepEquals(f1, f2)) continue;

                    hasChanges = true;
                    var label = f2?["label"]?.ToString() ?? id;

                    foreach (var prop in new[] { "label", "type", "required", "placeholder", "options", "validation" })
                    {
                        var val1 = f1?[prop]?.ToString() ?? "";
                        var val2 = f2?[prop]?.ToString() ?? "";
                        if (val1 != val2)
                            differences.Add($"Field \"{label}\": {prop} changed");
                    }
                }

                if (!hasChanges && !JsonNode.DeepEquals(fields1, fields2))
                {
                    differences.Add("Form definition has changed");
                    hasChanges = true;
                }
            }
            catch
            {
                if (v1.FormDefinitionJson != v2.FormDefinitionJson)
                {
                    differences.Add("Form definition has changed");
                    hasChanges = true;
                }
            }

            return new FormVersionComparisonDto
            {
                Version1 = MapToDto(v1),
                Version2 = MapToDto(v2),
                Differences = differences,
                HasChanges = hasChanges
            };
        }

        private FormVersionDto MapToDto(FormVersionHistory version)
        {
            return new FormVersionDto
            {
                Id = version.Id,
                FormId = version.FormId,
                VersionNumber = version.VersionNumber,
                FormDefinitionJson = version.FormDefinitionJson,
                FormLayoutJson = version.FormLayoutJson,
                ChangeDescription = version.ChangeDescription,
                CreatedBy = version.CreatedBy,
                CreatedAt = version.CreatedAt
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
    }
}