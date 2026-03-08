using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using WorkflowAutomation.Application.DTOs;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    public class FormPermissionService : IFormPermissionService
    {
        private readonly IRepository<FormPermission> _permissionRepository;
        private readonly IRepository<Form> _formRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IAuditLogService _auditLogService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public FormPermissionService(
            IRepository<FormPermission> permissionRepository,
            IRepository<Form> formRepository,
            IUnitOfWork unitOfWork,
            IAuditLogService auditLogService,
            IHttpContextAccessor httpContextAccessor)
        {
            _permissionRepository = permissionRepository;
            _formRepository = formRepository;
            _unitOfWork = unitOfWork;
            _auditLogService = auditLogService;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<IEnumerable<FormPermissionDto>> GetPermissionsAsync(Guid formId)
        {
            if (!await HasFormPermissionAsync(formId, "Edit"))
                return Enumerable.Empty<FormPermissionDto>();

            var permissions = await _permissionRepository.FindAsync(p => p.FormId == formId);
            return permissions
                .OrderBy(p => p.GrantedAt)
                .Select(p => MapToDto(p));
        }

        public async Task<FormPermissionDto> AddPermissionAsync(Guid formId, AddPermissionRequest request, Guid grantedBy, string userName, string userEmail)
        {
            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");
            if (!await HasFormPermissionAsync(formId, "Admin"))
                throw new UnauthorizedAccessException("You do not have permission to manage form permissions");

            ValidatePermissionRequest(request);

            var existing = await _permissionRepository.FindAsync(p =>
                p.FormId == formId &&
                p.UserId == request.UserId &&
                p.RoleName == request.RoleName);
            if (existing.Any())
                throw new InvalidOperationException("A matching permission already exists for this form");

            var permission = new FormPermission
            {
                Id = Guid.NewGuid(),
                FormId = formId,
                UserId = request.UserId,
                RoleName = request.RoleName,
                PermissionLevel = request.PermissionLevel ?? "View",
                GrantedBy = grantedBy,
                GrantedAt = DateTime.UtcNow
            };

            await _permissionRepository.AddAsync(permission);
            await _unitOfWork.CompleteAsync();

            await _auditLogService.LogAsync(
                "PermissionGranted", "FormPermission", formId, form.FormName,
                grantedBy, userName, userEmail,
                additionalInfo: System.Text.Json.JsonSerializer.Serialize(new
                {
                    request.UserId,
                    request.RoleName,
                    request.PermissionLevel
                }));

            return MapToDto(permission);
        }

        public async Task<FormPermissionDto> UpdatePermissionAsync(Guid formId, Guid permissionId, UpdatePermissionRequest request)
        {
            if (!await HasFormPermissionAsync(formId, "Admin"))
                throw new UnauthorizedAccessException("You do not have permission to manage form permissions");

            ValidatePermissionLevel(request.PermissionLevel);

            var permissions = await _permissionRepository.FindAsync(p => p.Id == permissionId && p.FormId == formId);
            var permission = permissions.FirstOrDefault();
            if (permission == null)
                throw new KeyNotFoundException("Permission not found");

            permission.PermissionLevel = request.PermissionLevel ?? permission.PermissionLevel;
            await _unitOfWork.CompleteAsync();

            return MapToDto(permission);
        }

        public async Task RemovePermissionAsync(Guid formId, Guid permissionId, Guid removedBy, string userName, string userEmail)
        {
            if (!await HasFormPermissionAsync(formId, "Admin"))
                throw new UnauthorizedAccessException("You do not have permission to manage form permissions");

            var permissions = await _permissionRepository.FindAsync(p => p.Id == permissionId && p.FormId == formId);
            var permission = permissions.FirstOrDefault();
            if (permission == null)
                throw new KeyNotFoundException("Permission not found");

            await _permissionRepository.DeleteAsync(permission);
            await _unitOfWork.CompleteAsync();

            var form = await _formRepository.GetByIdAsync(formId);
            await _auditLogService.LogAsync(
                "PermissionRevoked", "FormPermission", formId, form?.FormName ?? "",
                removedBy, userName, userEmail,
                additionalInfo: System.Text.Json.JsonSerializer.Serialize(new
                {
                    permission.UserId,
                    permission.RoleName,
                    permission.PermissionLevel
                }));
        }

        private static FormPermissionDto MapToDto(FormPermission p) => new()
        {
            Id = p.Id,
            FormId = p.FormId,
            UserId = p.UserId,
            RoleName = p.RoleName,
            PermissionLevel = p.PermissionLevel,
            GrantedBy = p.GrantedBy,
            GrantedAt = p.GrantedAt
        };

        private static void ValidatePermissionRequest(AddPermissionRequest request)
        {
            var hasUser = request.UserId.HasValue;
            var hasRole = !string.IsNullOrWhiteSpace(request.RoleName);

            if (hasUser == hasRole)
                throw new InvalidOperationException("Specify either a user or a role for a permission, but not both.");

            ValidatePermissionLevel(request.PermissionLevel);
        }

        private static void ValidatePermissionLevel(string? permissionLevel)
        {
            var allowedLevels = new[] { "View", "Submit", "Edit", "Admin" };
            if (!string.IsNullOrWhiteSpace(permissionLevel) && !allowedLevels.Contains(permissionLevel, StringComparer.OrdinalIgnoreCase))
                throw new InvalidOperationException("Invalid permission level.");
        }

        private async Task<bool> HasFormPermissionAsync(Guid formId, string requiredLevel)
        {
            var current = GetCurrentUserContext();
            if (current.Roles.Contains("super-admin") || current.Roles.Contains("admin")) return true;

            var permissions = (await _permissionRepository.FindAsync(p => p.FormId == formId)).ToList();
            if (!permissions.Any()) return true;
            if (string.IsNullOrWhiteSpace(current.UserId)) return false;

            var requiredRank = PermissionRank(requiredLevel);
            Guid.TryParse(current.UserId, out var userGuid);

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
