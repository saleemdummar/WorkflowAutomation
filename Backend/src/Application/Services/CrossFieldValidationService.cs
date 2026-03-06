using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Validation;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    /// <summary>
    /// Sprint 2: Service for cross-field validation
    /// </summary>
    public class CrossFieldValidationService : ICrossFieldValidationService
    {
        private readonly IRepository<CrossFieldValidationRule> _ruleRepository;
        private readonly IRepository<Form> _formRepository;
        private readonly IJintExecutionService _jintService;
        private readonly IUnitOfWork _unitOfWork;

        public CrossFieldValidationService(
            IRepository<CrossFieldValidationRule> ruleRepository,
            IRepository<Form> formRepository,
            IJintExecutionService jintService,
            IUnitOfWork unitOfWork)
        {
            _ruleRepository = ruleRepository;
            _formRepository = formRepository;
            _jintService = jintService;
            _unitOfWork = unitOfWork;
        }

        public async Task<CrossFieldValidationRuleDto> CreateRuleAsync(CreateCrossFieldValidationRuleDto dto, string createdBy)
        {
            var form = await _formRepository.GetByIdAsync(dto.FormId);
            if (form == null)
                throw new KeyNotFoundException("Form not found");

            // Validate rule configuration based on type
            ValidateRuleConfiguration(dto.ValidationType, dto.RuleConfiguration);

            var rule = new CrossFieldValidationRule
            {
                Form = form,
                FormId = dto.FormId,
                RuleName = dto.RuleName,
                ValidationType = dto.ValidationType,
                RuleConfiguration = dto.RuleConfiguration,
                ErrorMessage = dto.ErrorMessage,
                ExecutionOrder = dto.ExecutionOrder,
                CreatedBy = Guid.Parse(createdBy),
                CreatedAt = DateTime.UtcNow
            };

            await _ruleRepository.AddAsync(rule);
            await _unitOfWork.CompleteAsync();

            return MapToDto(rule, form.FormName);
        }

        public async Task UpdateRuleAsync(Guid ruleId, UpdateCrossFieldValidationRuleDto dto, string updatedBy)
        {
            var rule = await _ruleRepository.GetByIdAsync(ruleId);
            if (rule == null)
                throw new KeyNotFoundException("Validation rule not found");

            if (!string.IsNullOrWhiteSpace(dto.RuleName))
                rule.RuleName = dto.RuleName;

            if (!string.IsNullOrWhiteSpace(dto.RuleConfiguration))
            {
                ValidateRuleConfiguration(rule.ValidationType, dto.RuleConfiguration);
                rule.RuleConfiguration = dto.RuleConfiguration;
            }

            if (!string.IsNullOrWhiteSpace(dto.ErrorMessage))
                rule.ErrorMessage = dto.ErrorMessage;

            if (dto.IsActive.HasValue)
                rule.IsActive = dto.IsActive.Value;

            if (dto.ExecutionOrder.HasValue)
                rule.ExecutionOrder = dto.ExecutionOrder.Value;

            rule.UpdatedAt = DateTime.UtcNow;
            rule.UpdatedBy = Guid.Parse(updatedBy);

            await _ruleRepository.UpdateAsync(rule);
            await _unitOfWork.CompleteAsync();
        }

        public async Task DeleteRuleAsync(Guid ruleId)
        {
            var rule = await _ruleRepository.GetByIdAsync(ruleId);
            if (rule == null)
                throw new KeyNotFoundException("Validation rule not found");

            await _ruleRepository.DeleteAsync(rule);
            await _unitOfWork.CompleteAsync();
        }

        public async Task<CrossFieldValidationRuleDto> GetRuleAsync(Guid ruleId)
        {
            var rule = await _ruleRepository.GetByIdAsync(ruleId);
            if (rule == null)
                throw new KeyNotFoundException("Validation rule not found");

            var form = await _formRepository.GetByIdAsync(rule.FormId);
            return MapToDto(rule, form?.FormName ?? "Unknown Form");
        }

        public async Task<IEnumerable<CrossFieldValidationRuleDto>> GetFormRulesAsync(Guid formId)
        {
            var formRules = (await _ruleRepository.FindAsync(r => r.FormId == formId && r.IsActive))
                .OrderBy(r => r.ExecutionOrder)
                .ToList();

            var form = await _formRepository.GetByIdAsync(formId);
            var formName = form?.FormName ?? "Unknown Form";

            return formRules.Select(r => MapToDto(r, formName)).ToList();
        }

        public async Task<CrossFieldValidationResult> ValidateFormSubmissionAsync(Guid formId, Dictionary<string, object> fieldValues)
        {
            var result = new CrossFieldValidationResult { IsValid = true };

            var rules = await GetFormRulesAsync(formId);

            foreach (var rule in rules.OrderBy(r => r.ExecutionOrder))
            {
                var error = await ValidateRule(rule, fieldValues);
                if (error != null)
                {
                    result.IsValid = false;
                    result.Errors.Add(error);
                }
            }

            return result;
        }

        private async Task<CrossFieldValidationError?> ValidateRule(CrossFieldValidationRuleDto rule, Dictionary<string, object> fieldValues)
        {
            try
            {
                switch (rule.ValidationType.ToLower())
                {
                    case "comparison":
                        return ValidateComparison(rule, fieldValues);

                    case "sum":
                        return ValidateSum(rule, fieldValues);

                    case "daterange":
                        return ValidateDateRange(rule, fieldValues);

                    case "custom":
                        return await ValidateCustom(rule, fieldValues);

                    default:
                        return new CrossFieldValidationError
                        {
                            RuleName = rule.RuleName,
                            ErrorMessage = $"Unknown validation type: {rule.ValidationType}",
                            AffectedFields = new List<string>()
                        };
                }
            }
            catch (Exception ex)
            {
                return new CrossFieldValidationError
                {
                    RuleName = rule.RuleName,
                    ErrorMessage = $"Validation error: {ex.Message}",
                    AffectedFields = new List<string>()
                };
            }
        }

        private CrossFieldValidationError? ValidateComparison(CrossFieldValidationRuleDto rule, Dictionary<string, object> fieldValues)
        {
            var config = JsonSerializer.Deserialize<ComparisonRuleConfig>(rule.RuleConfiguration);
            if (config == null) return null;

            if (!fieldValues.TryGetValue(config.Field1, out var value1) ||
                !fieldValues.TryGetValue(config.Field2, out var value2))
                return null; // Fields not present, skip validation

            bool isValid = CompareValues(value1, value2, config.Operator);

            if (!isValid)
            {
                return new CrossFieldValidationError
                {
                    RuleName = rule.RuleName,
                    ErrorMessage = rule.ErrorMessage,
                    AffectedFields = new List<string> { config.Field1, config.Field2 }
                };
            }

            return null;
        }

        private CrossFieldValidationError? ValidateSum(CrossFieldValidationRuleDto rule, Dictionary<string, object> fieldValues)
        {
            var config = JsonSerializer.Deserialize<SumRuleConfig>(rule.RuleConfiguration);
            if (config == null) return null;

            decimal sum = 0;
            var missingFields = new List<string>();

            foreach (var field in config.Fields)
            {
                if (fieldValues.TryGetValue(field, out var value))
                {
                    if (decimal.TryParse(value?.ToString(), out var numValue))
                    {
                        sum += numValue;
                    }
                }
                else
                {
                    missingFields.Add(field);
                }
            }

            if (missingFields.Any())
                return null; // Required fields missing, skip validation

            if (fieldValues.TryGetValue(config.TotalField, out var totalValue) &&
                decimal.TryParse(totalValue?.ToString(), out var expectedTotal))
            {
                var difference = Math.Abs(sum - expectedTotal);
                if (difference > config.Tolerance)
                {
                    return new CrossFieldValidationError
                    {
                        RuleName = rule.RuleName,
                        ErrorMessage = rule.ErrorMessage,
                        AffectedFields = config.Fields.Concat(new[] { config.TotalField }).ToList()
                    };
                }
            }

            return null;
        }

        private CrossFieldValidationError? ValidateDateRange(CrossFieldValidationRuleDto rule, Dictionary<string, object> fieldValues)
        {
            var config = JsonSerializer.Deserialize<DateRangeRuleConfig>(rule.RuleConfiguration);
            if (config == null) return null;

            if (!fieldValues.TryGetValue(config.StartDateField, out var startValue) ||
                !fieldValues.TryGetValue(config.EndDateField, out var endValue))
                return null;

            if (!DateTime.TryParse(startValue?.ToString(), out var startDate) ||
                !DateTime.TryParse(endValue?.ToString(), out var endDate))
                return null;

            var daysDifference = (endDate - startDate).Days;

            bool isValid = true;
            if (config.MinDays.HasValue && daysDifference < config.MinDays.Value)
                isValid = false;
            if (config.MaxDays.HasValue && daysDifference > config.MaxDays.Value)
                isValid = false;
            if (endDate < startDate)
                isValid = false;

            if (!isValid)
            {
                return new CrossFieldValidationError
                {
                    RuleName = rule.RuleName,
                    ErrorMessage = rule.ErrorMessage,
                    AffectedFields = new List<string> { config.StartDateField, config.EndDateField }
                };
            }

            return null;
        }

        private Task<CrossFieldValidationError?> ValidateCustom(CrossFieldValidationRuleDto rule, Dictionary<string, object> fieldValues)
        {
            var config = JsonSerializer.Deserialize<CustomRuleConfig>(rule.RuleConfiguration);
            if (config == null) return Task.FromResult<CrossFieldValidationError?>(null);

            // Check if all required fields are present
            if (config.RequiredFields != null && config.RequiredFields.Any())
            {
                var missingFields = config.RequiredFields.Where(f => !fieldValues.ContainsKey(f)).ToList();
                if (missingFields.Any())
                    return Task.FromResult<CrossFieldValidationError?>(null); // Skip validation if required fields are missing
            }

            // Execute custom JavaScript expression using Jint
            var result = _jintService.ExecuteJavaScript(config.Expression, fieldValues);

            if (result is bool boolResult && !boolResult)
            {
                return Task.FromResult<CrossFieldValidationError?>(new CrossFieldValidationError
                {
                    RuleName = rule.RuleName,
                    ErrorMessage = rule.ErrorMessage,
                    AffectedFields = config.RequiredFields ?? new List<string>()
                });
            }

            return Task.FromResult<CrossFieldValidationError?>(null);
        }

        private bool CompareValues(object value1, object value2, string operatorType)
        {
            // Try numeric comparison
            if (decimal.TryParse(value1?.ToString(), out var num1) &&
                decimal.TryParse(value2?.ToString(), out var num2))
            {
                return operatorType.ToLower() switch
                {
                    "equals" => num1 == num2,
                    "notequals" => num1 != num2,
                    "lessthan" => num1 < num2,
                    "lessthanorequal" => num1 <= num2,
                    "greaterthan" => num1 > num2,
                    "greaterthanorequal" => num1 >= num2,
                    _ => false
                };
            }

            // Try date comparison
            if (DateTime.TryParse(value1?.ToString(), out var date1) &&
                DateTime.TryParse(value2?.ToString(), out var date2))
            {
                return operatorType.ToLower() switch
                {
                    "equals" => date1 == date2,
                    "notequals" => date1 != date2,
                    "lessthan" => date1 < date2,
                    "lessthanorequal" => date1 <= date2,
                    "greaterthan" => date1 > date2,
                    "greaterthanorequal" => date1 >= date2,
                    _ => false
                };
            }

            // String comparison
            var str1 = value1?.ToString() ?? "";
            var str2 = value2?.ToString() ?? "";

            return operatorType.ToLower() switch
            {
                "equals" => str1 == str2,
                "notequals" => str1 != str2,
                _ => false
            };
        }

        private void ValidateRuleConfiguration(string validationType, string configuration)
        {
            try
            {
                switch (validationType.ToLower())
                {
                    case "comparison":
                        var compConfig = JsonSerializer.Deserialize<ComparisonRuleConfig>(configuration);
                        if (compConfig == null || string.IsNullOrWhiteSpace(compConfig.Field1) ||
                            string.IsNullOrWhiteSpace(compConfig.Field2))
                            throw new ArgumentException("Invalid comparison rule configuration");
                        break;

                    case "sum":
                        var sumConfig = JsonSerializer.Deserialize<SumRuleConfig>(configuration);
                        if (sumConfig == null || sumConfig.Fields == null || !sumConfig.Fields.Any() ||
                            string.IsNullOrWhiteSpace(sumConfig.TotalField))
                            throw new ArgumentException("Invalid sum rule configuration");
                        break;

                    case "daterange":
                        var dateConfig = JsonSerializer.Deserialize<DateRangeRuleConfig>(configuration);
                        if (dateConfig == null || string.IsNullOrWhiteSpace(dateConfig.StartDateField) ||
                            string.IsNullOrWhiteSpace(dateConfig.EndDateField))
                            throw new ArgumentException("Invalid date range rule configuration");
                        break;

                    case "custom":
                        var customConfig = JsonSerializer.Deserialize<CustomRuleConfig>(configuration);
                        if (customConfig == null || string.IsNullOrWhiteSpace(customConfig.Expression))
                            throw new ArgumentException("Invalid custom rule configuration");
                        break;

                    default:
                        throw new ArgumentException($"Unknown validation type: {validationType}");
                }
            }
            catch (JsonException ex)
            {
                throw new ArgumentException($"Invalid rule configuration JSON: {ex.Message}");
            }
        }

        private CrossFieldValidationRuleDto MapToDto(CrossFieldValidationRule rule, string formName)
        {
            return new CrossFieldValidationRuleDto
            {
                Id = rule.Id,
                FormId = rule.FormId,
                FormName = formName,
                RuleName = rule.RuleName,
                ValidationType = rule.ValidationType,
                RuleConfiguration = rule.RuleConfiguration,
                ErrorMessage = rule.ErrorMessage,
                IsActive = rule.IsActive,
                ExecutionOrder = rule.ExecutionOrder,
                CreatedAt = rule.CreatedAt,
                CreatedBy = rule.CreatedBy
            };
        }
    }
}
