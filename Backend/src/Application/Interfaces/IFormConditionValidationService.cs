using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.Services;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IFormConditionValidationService
    {
        Task<FormConditionValidationResult> ValidateFormSubmissionAsync(
            Guid formId,
            Dictionary<string, object> submissionData);
    }
}
