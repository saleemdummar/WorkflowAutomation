using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Moq;
using Xunit;
using WorkflowAutomation.Application.DTOs.Approvals;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Application.Services;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Tests.Services
{
    public class ApprovalServiceTests
    {
        private readonly Mock<IRepository<ApprovalTask>> _approvalRepo;
        private readonly Mock<IRepository<ApprovalHistory>> _historyRepo;
        private readonly Mock<IFormSubmissionRepository> _submissionRepo;
        private readonly Mock<IRepository<Form>> _formRepo;
        private readonly Mock<ISystemLogService> _systemLogService;
        private readonly Mock<IAuditLogService> _auditLogService;
        private readonly Mock<IFormConditionNormalizationService> _normalizationService;
        private readonly ApprovalService _sut;

        public ApprovalServiceTests()
        {
            _approvalRepo = new Mock<IRepository<ApprovalTask>>();
            _historyRepo = new Mock<IRepository<ApprovalHistory>>();
            _submissionRepo = new Mock<IFormSubmissionRepository>();
            _formRepo = new Mock<IRepository<Form>>();
            _systemLogService = new Mock<ISystemLogService>();
            _auditLogService = new Mock<IAuditLogService>();
            _normalizationService = new Mock<IFormConditionNormalizationService>();
            _sut = new ApprovalService(
                _approvalRepo.Object,
                _historyRepo.Object,
                _submissionRepo.Object,
                _formRepo.Object,
                _systemLogService.Object,
                _auditLogService.Object,
                _normalizationService.Object);
        }

        [Fact]
        public async Task GetMyTasksAsync_ReturnsPendingTasksSortedByPriority()
        {
            var userId = "user-1";
            var tasks = new List<ApprovalTask>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    TaskStatus = ApprovalTaskStatus.Pending,
                    AssignedTo = userId,
                    DueDate = DateTime.UtcNow.AddHours(-5),
                    CreatedDate = DateTime.UtcNow.AddDays(-2),
                    WorkflowInstance = new WorkflowInstance
                    {
                        SubmissionId = Guid.NewGuid(),
                        Submission = new FormSubmission
                        {
                            FormId = Guid.NewGuid(),
                            Form = new Form { FormName = "Form A", FormDefinitionJson = "[]" }
                        }
                    }
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    TaskStatus = ApprovalTaskStatus.Pending,
                    AssignedTo = userId,
                    DueDate = DateTime.UtcNow.AddDays(5),
                    CreatedDate = DateTime.UtcNow.AddDays(-1),
                    WorkflowInstance = new WorkflowInstance
                    {
                        SubmissionId = Guid.NewGuid(),
                        Submission = new FormSubmission
                        {
                            FormId = Guid.NewGuid(),
                            Form = new Form { FormName = "Form B", FormDefinitionJson = "[]" }
                        }
                    }
                }
            };

            _approvalRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<ApprovalTask, bool>>>()))
                .ReturnsAsync(tasks);

            var result = (await _sut.GetMyTasksAsync(userId)).ToList();

            Assert.Equal(2, result.Count);
            Assert.Equal("critical", result[0].Priority);
            Assert.True(result[0].IsOverdue);
            Assert.Equal("normal", result[1].Priority);
            Assert.False(result[1].IsOverdue);
        }

        [Fact]
        public async Task GetMyTasksAsync_ReturnsEmptyForNoTasks()
        {
            _approvalRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<ApprovalTask, bool>>>()))
                .ReturnsAsync(new List<ApprovalTask>());

            var result = await _sut.GetMyTasksAsync("user-1");

            Assert.Empty(result);
        }

        [Fact]
        public async Task GetTaskByIdAsync_ReturnsNullForMissingTask()
        {
            _approvalRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((ApprovalTask?)null);

            var result = await _sut.GetTaskByIdAsync(Guid.NewGuid());

            Assert.Null(result);
        }

        [Fact]
        public async Task GetTaskByIdAsync_ReturnsEnrichedDetail()
        {
            var taskId = Guid.NewGuid();
            var task = new ApprovalTask
            {
                Id = taskId,
                TaskStatus = ApprovalTaskStatus.Pending,
                AssignedTo = "user-1",
                DueDate = DateTime.UtcNow.AddHours(12),
                CreatedDate = DateTime.UtcNow,
                WorkflowInstance = new WorkflowInstance
                {
                    SubmissionId = Guid.NewGuid(),
                    Submission = new FormSubmission
                    {
                        FormId = Guid.NewGuid(),
                        SubmittedBy = Guid.NewGuid(),
                        SubmittedAt = DateTime.UtcNow,
                        Form = new Form { FormName = "My Form", FormDefinitionJson = "[]" },
                        SubmissionData = new List<FormSubmissionData>()
                    }
                }
            };

            _approvalRepo.Setup(r => r.GetByIdAsync(taskId)).ReturnsAsync(task);

            var result = await _sut.GetTaskByIdAsync(taskId);

            Assert.NotNull(result);
            Assert.Equal(taskId, result.Id);
            Assert.Equal("My Form", result.FormName);
            Assert.Equal("high", result.Priority);
            Assert.False(result.IsOverdue);
        }

        [Fact]
        public async Task GetApprovalHistoryAsync_ThrowsWhenTaskNotFound()
        {
            _approvalRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((ApprovalTask?)null);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _sut.GetApprovalHistoryAsync(Guid.NewGuid()));
        }

        [Fact]
        public async Task GetApprovalHistoryAsync_NormalizesDecisions()
        {
            var taskId = Guid.NewGuid();
            _approvalRepo.Setup(r => r.GetByIdAsync(taskId)).ReturnsAsync(new ApprovalTask { Id = taskId });

            var history = new List<ApprovalHistory>
            {
                new() { TaskId = taskId, Action = "approve", ApprovedBy = Guid.NewGuid(), ActionAt = DateTime.UtcNow.AddHours(-2) },
                new() { TaskId = taskId, Action = "rejected", ApprovedBy = Guid.NewGuid(), ActionAt = DateTime.UtcNow.AddHours(-1) },
                new() { TaskId = taskId, Action = "return", ApprovedBy = Guid.NewGuid(), ActionAt = DateTime.UtcNow },
            };
            _historyRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<ApprovalHistory, bool>>>()))
                .ReturnsAsync(history);

            var result = (await _sut.GetApprovalHistoryAsync(taskId)).ToList();

            Assert.Equal(3, result.Count);
            Assert.Equal("Returned", result[0].Decision);
            Assert.Equal("Rejected", result[1].Decision);
            Assert.Equal("Approved", result[2].Decision);
        }

        [Fact]
        public async Task GetAllTasksAsync_ReturnsAllTasksEnriched()
        {
            var tasks = new List<ApprovalTask>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    TaskStatus = ApprovalTaskStatus.Approved,
                    AssignedTo = "user-1",
                    CreatedDate = DateTime.UtcNow,
                }
            };
            _approvalRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(tasks);

            var result = (await _sut.GetAllTasksAsync()).ToList();

            Assert.Single(result);
            Assert.Equal("Unknown Form", result[0].FormName);
        }
    }
}
