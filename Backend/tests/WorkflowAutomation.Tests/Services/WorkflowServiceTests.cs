using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Moq;
using Microsoft.Extensions.Logging;
using Xunit;
using WorkflowAutomation.Application.DTOs.Workflows;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Application.Services;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Tests.Services
{
    public class WorkflowServiceTests
    {
        private readonly Mock<IWorkflowRepository> _workflowRepo;
        private readonly Mock<IRepository<WorkflowVersionHistory>> _versionRepo;
        private readonly Mock<IRepository<WorkflowInstance>> _instanceRepo;
        private readonly Mock<IRepository<WorkflowExecutionLog>> _executionLogRepo;
        private readonly Mock<IRepository<FormSubmission>> _submissionRepo;
        private readonly Mock<IRepository<WorkflowNode>> _nodeRepo;
        private readonly Mock<IRepository<WorkflowEdge>> _edgeRepo;
        private readonly Mock<IUnitOfWork> _unitOfWork;
        private readonly Mock<ISystemLogService> _systemLogService;
        private readonly Mock<IAuditLogService> _auditLogService;
        private readonly Mock<IWorkflowDefinitionService> _definitionService;
        private readonly Mock<ILogger<WorkflowService>> _logger;
        private readonly WorkflowService _sut;

        public WorkflowServiceTests()
        {
            _workflowRepo = new Mock<IWorkflowRepository>();
            _versionRepo = new Mock<IRepository<WorkflowVersionHistory>>();
            _instanceRepo = new Mock<IRepository<WorkflowInstance>>();
            _executionLogRepo = new Mock<IRepository<WorkflowExecutionLog>>();
            _submissionRepo = new Mock<IRepository<FormSubmission>>();
            _nodeRepo = new Mock<IRepository<WorkflowNode>>();
            _edgeRepo = new Mock<IRepository<WorkflowEdge>>();
            _unitOfWork = new Mock<IUnitOfWork>();
            _systemLogService = new Mock<ISystemLogService>();
            _auditLogService = new Mock<IAuditLogService>();
            _definitionService = new Mock<IWorkflowDefinitionService>();
            _logger = new Mock<ILogger<WorkflowService>>();

            List<string> validationErrors = new();
            _definitionService
                .Setup(s => s.ValidateWorkflowDefinition(It.IsAny<JsonObject>(), out validationErrors))
                .Returns(true);

            _nodeRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<WorkflowNode, bool>>>()))
                .ReturnsAsync(new List<WorkflowNode>());
            _edgeRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<WorkflowEdge, bool>>>()))
                .ReturnsAsync(new List<WorkflowEdge>());
            _nodeRepo.Setup(r => r.AddAsync(It.IsAny<WorkflowNode>()))
                .ReturnsAsync((WorkflowNode n) => n);
            _edgeRepo.Setup(r => r.AddAsync(It.IsAny<WorkflowEdge>()))
                .ReturnsAsync((WorkflowEdge e) => e);

            _sut = new WorkflowService(
                _workflowRepo.Object,
                _versionRepo.Object,
                _instanceRepo.Object,
                _executionLogRepo.Object,
                _submissionRepo.Object,
                _nodeRepo.Object,
                _edgeRepo.Object,
                _definitionService.Object,
                _unitOfWork.Object,
                _systemLogService.Object,
                _auditLogService.Object,
                _logger.Object);
        }

        [Fact]
        public async Task CreateWorkflowAsync_CreatesAndReturnsDto()
        {
            var dto = new CreateWorkflowDto
            {
                Name = "Test Workflow",
                Definition = "{\"nodes\":[{\"id\":\"1\",\"type\":\"trigger\",\"data\":{\"label\":\"Start\"}}], \"edges\":[]}"
            };

            var result = await _sut.CreateWorkflowAsync(dto, "test-user");

            Assert.NotNull(result);
            Assert.Equal("Test Workflow", result.Name);
            _workflowRepo.Verify(r => r.AddAsync(It.IsAny<Workflow>()), Times.Once);
            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task GetWorkflowByIdAsync_ReturnsWorkflowDto()
        {
            var id = Guid.NewGuid();
            var workflow = new Workflow
            {
                Id = id,
                WorkflowName = "Approval Flow",
                WorkflowDefinitionJson = "{}",
                IsPublished = true
            };
            _workflowRepo.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(workflow);

            var result = await _sut.GetWorkflowByIdAsync(id);

            Assert.NotNull(result);
            Assert.Equal(id, result.Id);
            Assert.Equal("Approval Flow", result.Name);
            Assert.True(result.IsPublished);
        }

        [Fact]
        public async Task GetAllWorkflowsAsync_ReturnsAllWorkflows()
        {
            var workflows = new List<Workflow>
            {
                new() { Id = Guid.NewGuid(), WorkflowName = "WF1", WorkflowDefinitionJson = "{}" },
                new() { Id = Guid.NewGuid(), WorkflowName = "WF2", WorkflowDefinitionJson = "{}" },
            };
            _workflowRepo.Setup(r => r.GetAllAsync()).ReturnsAsync((IReadOnlyList<Workflow>)workflows.AsReadOnly());

            var result = (await _sut.GetAllWorkflowsAsync()).ToList();

            Assert.Equal(2, result.Count);
        }

        [Fact]
        public async Task DeleteWorkflowAsync_DeletesWorkflow()
        {
            var id = Guid.NewGuid();
            var workflow = new Workflow { Id = id, WorkflowName = "WF" };
            _workflowRepo.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(workflow);

            await _sut.DeleteWorkflowAsync(id, "test-user");

            _workflowRepo.Verify(r => r.DeleteAsync(workflow), Times.Once);
            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CloneWorkflowAsync_CreatesNewWorkflowCopy()
        {
            var sourceId = Guid.NewGuid();
            var source = new Workflow
            {
                Id = sourceId,
                WorkflowName = "Original Workflow",
                WorkflowDescription = "Original desc",
                WorkflowDefinitionJson = "{\"nodes\":[{\"id\":\"1\",\"type\":\"trigger\",\"data\":{\"label\":\"Start\"}}], \"edges\":[]}",
                IsPublished = true
            };
            _workflowRepo.Setup(r => r.GetByIdAsync(sourceId)).ReturnsAsync(source);

            var result = await _sut.CloneWorkflowAsync(sourceId, "test-user");

            Assert.NotNull(result);
            Assert.Contains("Copy", result.Name);
            Assert.False(result.IsPublished);
            _workflowRepo.Verify(r => r.AddAsync(It.IsAny<Workflow>()), Times.Once);
            _unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task GetVersionsAsync_ReturnsVersions()
        {
            var workflowId = Guid.NewGuid();
            var versions = new List<WorkflowVersionHistory>
            {
                new() { Id = Guid.NewGuid(), WorkflowId = workflowId, VersionNumber = 1, WorkflowDefinitionJson = "{}", CreatedAt = DateTime.UtcNow.AddDays(-2) },
                new() { Id = Guid.NewGuid(), WorkflowId = workflowId, VersionNumber = 2, WorkflowDefinitionJson = "{}", CreatedAt = DateTime.UtcNow.AddDays(-1) },
            };
            _versionRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<WorkflowVersionHistory, bool>>>()))
                .ReturnsAsync(versions);

            var result = (await _sut.GetWorkflowVersionsAsync(workflowId)).ToList();

            Assert.Equal(2, result.Count);
        }

        [Fact]
        public async Task GetExecutionsAsync_ReturnsFormattedList()
        {
            var wfId = Guid.NewGuid();
            var instances = new List<WorkflowInstance>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = wfId,
                    InstanceStatus = WorkflowInstanceStatus.Completed,
                    StartedAt = DateTime.UtcNow.AddHours(-2),
                    CompletedAt = DateTime.UtcNow
                }
            };
            var workflows = new List<Workflow>
            {
                new() { Id = wfId, WorkflowName = "Test WF", WorkflowDefinitionJson = "{}" }
            };
            _instanceRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<WorkflowInstance, bool>>>())).ReturnsAsync(instances);
            _workflowRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<Workflow, bool>>>())).ReturnsAsync((IReadOnlyList<Workflow>)workflows.AsReadOnly());
            _submissionRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<FormSubmission, bool>>>())).ReturnsAsync(new List<FormSubmission>());
            _executionLogRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<WorkflowExecutionLog, bool>>>())).ReturnsAsync(new List<WorkflowExecutionLog>());

            var result = (await _sut.GetExecutionsAsync()).ToList();

            Assert.Single(result);
        }

        [Fact]
        public async Task TestWorkflowAsync_ReturnsSimulationResult()
        {
            var workflowId = Guid.NewGuid();
            var workflow = new Workflow
            {
                Id = workflowId,
                WorkflowName = "Test WF",
                WorkflowDefinitionJson = "{\"nodes\":[{\"id\":\"1\",\"type\":\"start\",\"label\":\"Start\",\"data\":{}}],\"edges\":[]}"
            };
            _workflowRepo.Setup(r => r.GetByIdAsync(workflowId)).ReturnsAsync(workflow);

            var result = await _sut.TestWorkflowAsync(workflowId, null);

            Assert.NotNull(result);
            Assert.True(result.Success);
            Assert.NotEmpty(result.SimulatedSteps);
        }
    }
}
