using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using WorkflowAutomation.Application.DTOs;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Application.Services;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Tests.Services
{
    public class FormPermissionServiceTests
    {
        private readonly Mock<IRepository<FormPermission>> _permissionRepo;
        private readonly Mock<IRepository<Form>> _formRepo;
        private readonly Mock<IUnitOfWork> _unitOfWork;
        private readonly Mock<IAuditLogService> _auditLogService;
        private readonly Mock<IHttpContextAccessor> _httpContextAccessor;
        private readonly FormPermissionService _sut;

        public FormPermissionServiceTests()
        {
            _permissionRepo = new Mock<IRepository<FormPermission>>();
            _formRepo = new Mock<IRepository<Form>>();
            _unitOfWork = new Mock<IUnitOfWork>();
            _auditLogService = new Mock<IAuditLogService>();
            _httpContextAccessor = new Mock<IHttpContextAccessor>();

            var httpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
                        new Claim(ClaimTypes.Role, "admin")
                    },
                    "TestAuth"))
            };
            _httpContextAccessor.SetupGet(x => x.HttpContext).Returns(httpContext);

            _sut = new FormPermissionService(
                _permissionRepo.Object,
                _formRepo.Object,
                _unitOfWork.Object,
                _auditLogService.Object,
                _httpContextAccessor.Object);
        }

        [Fact]
        public async Task GetPermissionsAsync_ReturnsOrderedPermissions()
        {
            var formId = Guid.NewGuid();
            var permissions = new List<FormPermission>
            {
                new() { Id = Guid.NewGuid(), FormId = formId, UserId = Guid.NewGuid(), PermissionLevel = "Edit", GrantedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), FormId = formId, RoleName = "admin", PermissionLevel = "View", GrantedAt = DateTime.UtcNow.AddMinutes(-10) },
            };
            _permissionRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<FormPermission, bool>>>()))
                .ReturnsAsync(permissions);

            var result = (await _sut.GetPermissionsAsync(formId)).ToList();

            Assert.Equal(2, result.Count);
            Assert.Equal("View", result[0].PermissionLevel);
            Assert.Equal("Edit", result[1].PermissionLevel);
        }

        [Fact]
        public async Task AddPermissionAsync_CreatesPermissionAndAudits()
        {
            var formId = Guid.NewGuid();
            var grantedBy = Guid.NewGuid();
            var form = new Form { Id = formId, FormName = "Test Form", FormDefinitionJson = "[]" };
            _formRepo.Setup(r => r.GetByIdAsync(formId)).ReturnsAsync(form);

            var request = new AddPermissionRequest { UserId = Guid.NewGuid(), PermissionLevel = "Edit" };

            var result = await _sut.AddPermissionAsync(formId, request, grantedBy, "Admin", "admin@test.com");

            Assert.Equal(formId, result.FormId);
            Assert.Equal("Edit", result.PermissionLevel);
            _permissionRepo.Verify(r => r.AddAsync(It.Is<FormPermission>(p =>
                p.FormId == formId && p.PermissionLevel == "Edit")), Times.Once);
            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task AddPermissionAsync_ThrowsWhenFormNotFound()
        {
            _formRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Form?)null);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _sut.AddPermissionAsync(Guid.NewGuid(), new AddPermissionRequest(), Guid.NewGuid(), "", ""));
        }

        [Fact]
        public async Task UpdatePermissionAsync_UpdatesPermissionLevel()
        {
            var formId = Guid.NewGuid();
            var permissionId = Guid.NewGuid();
            var existing = new FormPermission { Id = permissionId, FormId = formId, PermissionLevel = "View", GrantedAt = DateTime.UtcNow };
            _permissionRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<FormPermission, bool>>>()))
                .ReturnsAsync(new List<FormPermission> { existing });

            var result = await _sut.UpdatePermissionAsync(formId, permissionId, new UpdatePermissionRequest { PermissionLevel = "Edit" });

            Assert.Equal("Edit", result.PermissionLevel);
            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task UpdatePermissionAsync_ThrowsWhenNotFound()
        {
            _permissionRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<FormPermission, bool>>>()))
                .ReturnsAsync(new List<FormPermission>());

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _sut.UpdatePermissionAsync(Guid.NewGuid(), Guid.NewGuid(), new UpdatePermissionRequest()));
        }

        [Fact]
        public async Task RemovePermissionAsync_DeletesPermission()
        {
            var formId = Guid.NewGuid();
            var permissionId = Guid.NewGuid();
            var permission = new FormPermission { Id = permissionId, FormId = formId, PermissionLevel = "Edit", GrantedAt = DateTime.UtcNow };
            _permissionRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<FormPermission, bool>>>()))
                .ReturnsAsync(new List<FormPermission> { permission });
            _formRepo.Setup(r => r.GetByIdAsync(formId))
                .ReturnsAsync(new Form { Id = formId, FormName = "Test", FormDefinitionJson = "[]" });

            await _sut.RemovePermissionAsync(formId, permissionId, Guid.NewGuid(), "Admin", "a@t.com");

            _permissionRepo.Verify(r => r.DeleteAsync(permission), Times.Once);
            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task RemovePermissionAsync_ThrowsWhenNotFound()
        {
            _permissionRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<FormPermission, bool>>>()))
                .ReturnsAsync(new List<FormPermission>());

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _sut.RemovePermissionAsync(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "", ""));
        }
    }
}
