using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Application.Services;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Tests.Services
{
    public class FormConditionNormalizationServiceTests
    {
        [Fact]
        public async Task SaveConditionsFromElementsAsync_RelinksConditions_WhenEditedElementIdsDifferFromStoredFieldIds()
        {
            var formId = Guid.NewGuid();
            var targetFieldId = Guid.NewGuid();
            var sourceFieldId = Guid.NewGuid();
            var updatedTargetField = default(FormField);
            var savedCondition = default(FormCondition);

            var conditionGroupRepository = new Mock<IRepository<ConditionGroup>>();
            conditionGroupRepository
                .Setup(r => r.AddAsync(It.IsAny<ConditionGroup>()))
                .ReturnsAsync((ConditionGroup group) => group);

            var conditionRepository = new Mock<IRepository<FormCondition>>();
            conditionRepository
                .Setup(r => r.AddAsync(It.IsAny<FormCondition>()))
                .Callback<FormCondition>(condition => savedCondition = condition)
                .ReturnsAsync((FormCondition condition) => condition);

            var actionRepository = new Mock<IRepository<ConditionAction>>();
            actionRepository
                .Setup(r => r.AddAsync(It.IsAny<ConditionAction>()))
                .ReturnsAsync((ConditionAction action) => action);

            var fieldRepository = new Mock<IRepository<FormField>>();
            fieldRepository
                .Setup(r => r.UpdateAsync(It.IsAny<FormField>()))
                .Callback<FormField>(field =>
                {
                    if (field.Id == targetFieldId)
                    {
                        updatedTargetField = field;
                    }
                })
                .Returns(Task.CompletedTask);

            var unitOfWork = new Mock<IUnitOfWork>();
            var logger = new Mock<ILogger<FormConditionNormalizationService>>();

            var sut = new FormConditionNormalizationService(
                conditionGroupRepository.Object,
                conditionRepository.Object,
                actionRepository.Object,
                fieldRepository.Object,
                unitOfWork.Object,
                logger.Object);

            var fields = new List<FormField>
            {
                new() { Id = targetFieldId, FormId = formId, FieldName = "approval_status", FieldLabel = "Approval Status", FieldType = "text" },
                new() { Id = sourceFieldId, FormId = formId, FieldName = "department", FieldLabel = "Department", FieldType = "text" }
            };

            var elements = new List<FormElementDto>
            {
                new()
                {
                    Id = "edited-target-id",
                    Label = "Approval Status",
                    FieldName = "approval_status",
                    Conditions = new ConditionGroupDto
                    {
                        Id = Guid.NewGuid().ToString(),
                        Logic = "AND",
                        Conditions = new List<object>
                        {
                            new FieldConditionDto
                            {
                                FieldId = "edited-source-id",
                                Operator = "equals",
                                Value = "Finance",
                                Action = "show",
                                ElseAction = "hide"
                            }
                        }
                    }
                },
                new()
                {
                    Id = "edited-source-id",
                    Label = "Department",
                    FieldName = "department"
                }
            };

            await sut.SaveConditionsFromElementsAsync(formId, elements, fields, "user-1");

            Assert.NotNull(updatedTargetField);
            Assert.True(updatedTargetField!.ConditionGroupId.HasValue);
            Assert.NotNull(savedCondition);
            Assert.Equal(sourceFieldId, savedCondition!.TriggerFieldId);
            unitOfWork.Verify(u => u.CompleteAsync(It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}