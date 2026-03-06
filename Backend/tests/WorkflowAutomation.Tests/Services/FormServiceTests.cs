using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Application.Services;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Tests.Services
{
    public class FormServiceTests
    {
        private readonly Mock<IFormRepository> _formRepo;
        private readonly Mock<IRepository<FormVersionHistory>> _versionRepo;
        private readonly Mock<IRepository<FormField>> _fieldRepo;
        private readonly Mock<IUnitOfWork> _unitOfWork;
        private readonly Mock<ILogger<FormService>> _logger;
        private readonly Mock<ISystemLogService> _systemLogService;
        private readonly Mock<IAuditLogService> _auditLogService;
        private readonly Mock<IFormConditionNormalizationService> _conditionNormalizationService;
        private readonly Mock<IHttpContextAccessor> _httpContextAccessor;
        private readonly FormService _sut;
        private readonly FormLifecycleService _lifecycleSut;

        public FormServiceTests()
        {
            _formRepo = new Mock<IFormRepository>();
            _versionRepo = new Mock<IRepository<FormVersionHistory>>();
            _fieldRepo = new Mock<IRepository<FormField>>();
            _unitOfWork = new Mock<IUnitOfWork>();
            _logger = new Mock<ILogger<FormService>>();
            _systemLogService = new Mock<ISystemLogService>();
            _auditLogService = new Mock<IAuditLogService>();
            _conditionNormalizationService = new Mock<IFormConditionNormalizationService>();
            _httpContextAccessor = new Mock<IHttpContextAccessor>();
            _sut = new FormService(
                _formRepo.Object,
                _versionRepo.Object,
                _fieldRepo.Object,
                _unitOfWork.Object,
                _logger.Object,
                _systemLogService.Object,
                _auditLogService.Object,
                _conditionNormalizationService.Object,
                _httpContextAccessor.Object);
            _lifecycleSut = new FormLifecycleService(
                _formRepo.Object,
                _unitOfWork.Object,
                _conditionNormalizationService.Object,
                _httpContextAccessor.Object,
                new Mock<ILogger<FormLifecycleService>>().Object);
        }

        [Fact]
        public async Task CreateFormAsync_CreatesAndReturnsFormDto()
        {
            var userId = Guid.NewGuid().ToString();
            var dto = new CreateFormDto
            {
                Name = "Test Form",
                Description = "A test form",
                Definition = "[]"
            };

            var result = await _sut.CreateFormAsync(dto, userId);

            Assert.NotNull(result);
            Assert.Equal("Test Form", result.Name);
            Assert.Equal("A test form", result.Description);
            _formRepo.Verify(r => r.AddAsync(It.IsAny<Form>()), Times.Once);
            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task GetFormByIdAsync_ReturnsForm()
        {
            var formId = Guid.NewGuid();
            var form = new Form
            {
                Id = formId,
                FormName = "Test",
                FormDescription = "Desc",
                FormDefinitionJson = "[]",
                CreatedBy = "user-1",
                IsPublished = true
            };
            _formRepo.Setup(r => r.GetByIdAsync(formId)).ReturnsAsync(form);

            var result = await _sut.GetFormByIdAsync(formId);

            Assert.NotNull(result);
            Assert.Equal(formId, result.Id);
            Assert.Equal("Test", result.Name);
            Assert.True(result.IsPublished);
        }

        [Fact]
        public async Task GetAllFormsAsync_ReturnsFilteredByCategoryWhenProvided()
        {
            var catId = Guid.NewGuid();
            var forms = new List<Form>
            {
                new() { Id = Guid.NewGuid(), FormName = "Form1", FormDefinitionJson = "[]", CreatedBy = "u1", CategoryId = catId },
            };
            _formRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<Form, bool>>>())).ReturnsAsync(forms);
            _conditionNormalizationService
                .Setup(s => s.BuildFormDefinitionJsonAsync(It.IsAny<Guid>()))
                .ReturnsAsync("[{\"id\":\"normalized\"}]");

            var result = (await _sut.GetAllFormsAsync(catId)).ToList();

            Assert.Single(result);
            Assert.Equal("[{\"id\":\"normalized\"}]", result[0].Definition);
        }

        [Fact]
        public async Task DeleteFormAsync_SoftDeletesForm()
        {
            var formId = Guid.NewGuid();
            var userId = Guid.NewGuid().ToString();
            var form = new Form
            {
                Id = formId,
                FormName = "Test",
                FormDefinitionJson = "[]",
                CreatedBy = userId,
            };
            _formRepo.Setup(r => r.GetByIdAsync(formId)).ReturnsAsync(form);

            await _sut.DeleteFormAsync(formId, userId, "No longer needed");

            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task PublishFormAsync_SetsIsPublishedToTrue()
        {
            var formId = Guid.NewGuid();
            var form = new Form
            {
                Id = formId,
                FormName = "Draft Form",
                FormDefinitionJson = "[]",
                IsPublished = false,
                CreatedBy = "user-1",
            };
            _formRepo.Setup(r => r.GetByIdAsync(formId)).ReturnsAsync(form);

            await _lifecycleSut.PublishFormAsync(formId, "user-1");

            Assert.True(form.IsPublished);
            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task UnpublishFormAsync_SetsIsPublishedToFalse()
        {
            var formId = Guid.NewGuid();
            var form = new Form
            {
                Id = formId,
                FormName = "Published Form",
                FormDefinitionJson = "[]",
                IsPublished = true,
                CreatedBy = "user-1",
            };
            _formRepo.Setup(r => r.GetByIdAsync(formId)).ReturnsAsync(form);

            await _lifecycleSut.UnpublishFormAsync(formId, "user-1");

            Assert.False(form.IsPublished);
            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task SearchFormsAsync_ReturnsMatchingForms()
        {
            var forms = new List<Form>
            {
                new() { Id = Guid.NewGuid(), FormName = "Employee Survey", FormDefinitionJson = "[]", CreatedBy = "u1" },
            };
            _formRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<Form, bool>>>())).ReturnsAsync(forms);
            _conditionNormalizationService
                .Setup(s => s.BuildFormDefinitionJsonAsync(It.IsAny<Guid>()))
                .ReturnsAsync("[{\"id\":\"normalized-search\"}]");

            var result = (await _sut.SearchFormsAsync("Survey")).ToList();

            Assert.Single(result);
            Assert.Contains("Survey", result[0].Name);
            Assert.Equal("[{\"id\":\"normalized-search\"}]", result[0].Definition);
        }

        [Fact]
        public async Task ArchiveFormAsync_SetsIsArchived()
        {
            var formId = Guid.NewGuid();
            var userId = Guid.NewGuid().ToString();
            var form = new Form
            {
                Id = formId,
                FormName = "Old Form",
                FormDefinitionJson = "[]",
                CreatedBy = userId,
                IsArchived = false
            };
            _formRepo.Setup(r => r.GetByIdAsync(formId)).ReturnsAsync(form);

            await _lifecycleSut.ArchiveFormAsync(formId, userId, "Outdated");

            Assert.True(form.IsArchived);
            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task RestoreFormAsync_ClearsIsArchived()
        {
            var formId = Guid.NewGuid();
            var form = new Form
            {
                Id = formId,
                FormName = "Archived Form",
                FormDefinitionJson = "[]",
                CreatedBy = "user-1",
                IsArchived = true
            };
            _formRepo.Setup(r => r.GetByIdAsync(formId)).ReturnsAsync(form);

            await _lifecycleSut.RestoreFormAsync(formId, "user-1", "Needed again");

            Assert.False(form.IsArchived);
            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task GetFormFieldsAsync_ReturnsFields()
        {
            var formId = Guid.NewGuid();
            var fields = new List<FormField>
            {
                new() { Id = Guid.NewGuid(), FormId = formId, FieldName = "name", FieldLabel = "Name", FieldType = "text" },
                new() { Id = Guid.NewGuid(), FormId = formId, FieldName = "email", FieldLabel = "Email", FieldType = "email" },
            };
            _fieldRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<FormField, bool>>>()))
                .ReturnsAsync(fields);

            var result = (await _sut.GetFormFieldsAsync(formId)).ToList();

            Assert.Equal(2, result.Count);
        }
    }
}
