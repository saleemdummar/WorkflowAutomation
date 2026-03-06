using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
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

        public FormPermissionService(
            IRepository<FormPermission> permissionRepository,
            IRepository<Form> formRepository,
            IUnitOfWork unitOfWork,
            IAuditLogService auditLogService)
        {
            _permissionRepository = permissionRepository;
            _formRepository = formRepository;
            _unitOfWork = unitOfWork;
            _auditLogService = auditLogService;
        }

        public async Task<IEnumerable<FormPermissionDto>> GetPermissionsAsync(Guid formId)
        {
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
    }
}
