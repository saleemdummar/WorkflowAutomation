using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Validation;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface ICrossFieldValidationService
    {
        Task<CrossFieldValidationRuleDto> CreateRuleAsync(CreateCrossFieldValidationRuleDto dto, string createdBy);
        Task UpdateRuleAsync(Guid ruleId, UpdateCrossFieldValidationRuleDto dto, string updatedBy);
        Task DeleteRuleAsync(Guid ruleId);
        Task<CrossFieldValidationRuleDto> GetRuleAsync(Guid ruleId);
        Task<IEnumerable<CrossFieldValidationRuleDto>> GetFormRulesAsync(Guid formId);
        Task<CrossFieldValidationResult> ValidateFormSubmissionAsync(Guid formId, Dictionary<string, object> fieldValues);
    }
}
