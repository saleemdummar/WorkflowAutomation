using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IFormPermissionService
    {
        Task<IEnumerable<FormPermissionDto>> GetPermissionsAsync(Guid formId);
        Task<FormPermissionDto> AddPermissionAsync(Guid formId, AddPermissionRequest request, Guid grantedBy, string userName, string userEmail);
        Task<FormPermissionDto> UpdatePermissionAsync(Guid formId, Guid permissionId, UpdatePermissionRequest request);
        Task RemovePermissionAsync(Guid formId, Guid permissionId, Guid removedBy, string userName, string userEmail);
    }
}
