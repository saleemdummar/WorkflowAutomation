using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    public class FormConditionValidationService : IFormConditionValidationService
    {
        private readonly IJintExecutionService _jintService;
        private readonly IFormRepository _formRepository;
        private readonly ICrossFieldValidationService _crossFieldValidationService;
        private readonly IFormConditionNormalizationService _normalizationService;

        public FormConditionValidationService(
            IJintExecutionService jintService,
            IFormRepository formRepository,
            ICrossFieldValidationService crossFieldValidationService,
            IFormConditionNormalizationService normalizationService)
        {
            _jintService = jintService;
            _formRepository = formRepository;
            _crossFieldValidationService = crossFieldValidationService;
            _normalizationService = normalizationService;
        }

        public async Task<FormConditionValidationResult> ValidateFormSubmissionAsync(
            Guid formId,
            Dictionary<string, object> submissionData)
        {
            var result = new FormConditionValidationResult
            {
                IsValid = true,
                Errors = new List<string>(),
                CalculatedValues = new Dictionary<string, object>(),
                HiddenFields = new List<string>()
            };

            var form = await _formRepository.GetByIdAsync(formId);
            if (form == null)
            {
                result.IsValid = false;
                result.Errors.Add("Form not found");
                return result;
            }

            List<FormElementModel> elements;
            try
            {
                var definitionJson = await _normalizationService.BuildFormDefinitionJsonAsync(formId);
                if (string.IsNullOrWhiteSpace(definitionJson) || definitionJson == "[]")
                {
                    // Fallback to stored JSON only if normalization returns nothing
                    definitionJson = form.FormDefinitionJson;
                }
                var definition = JsonSerializer.Deserialize<List<FormElementModel>>(
                    definitionJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                elements = definition ?? new List<FormElementModel>();
            }
            catch (Exception ex)
            {
                result.IsValid = false;
                result.Errors.Add($"Failed to parse form definition: {ex.Message}");
                return result;
            }

            foreach (var element in elements)
            {
                var state = GetElementState(element, submissionData);
                if (!state.IsVisible)
                {
                    result.HiddenFields.Add(element.Id);
                    submissionData.Remove(element.Id);
                    continue;
                }

                if (element.Calculation != null && !string.IsNullOrWhiteSpace(element.Calculation.Expression))
                {
                    try
                    {
                        // Create a context mapping field names to values for calculations
                        var calculationContext = new Dictionary<string, object>();
                        foreach (var otherElement in elements)
                        {
                            if (submissionData.ContainsKey(otherElement.Id))
                            {
                                var fieldName = otherElement.FieldName ?? GenerateFieldName(otherElement.Label);
                                calculationContext[fieldName] = submissionData[otherElement.Id];
                            }
                        }

                        var calculatedValue = _jintService.ExecuteJavaScript(
                            element.Calculation.Expression,
                            calculationContext);

                        result.CalculatedValues[element.Id] = calculatedValue;

                        if (submissionData.ContainsKey(element.Id))
                        {
                            var submittedValue = submissionData[element.Id];
                            if (!ValuesEqual(submittedValue, calculatedValue))
                            {
                                result.IsValid = false;
                                result.Errors.Add($"Field '{element.Label}': Calculated value mismatch. Expected {calculatedValue}, got {submittedValue}");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        result.IsValid = false;
                        result.Errors.Add($"Field '{element.Label}': Calculation error - {ex.Message}");
                    }
                }

                if (state.IsRequired && !result.HiddenFields.Contains(element.Id))
                {
                    if (!submissionData.ContainsKey(element.Id) ||
                        submissionData[element.Id] == null ||
                        string.IsNullOrWhiteSpace(submissionData[element.Id]?.ToString()))
                    {
                        result.IsValid = false;
                        result.Errors.Add($"Field '{element.Label}' is required");
                    }
                }

                if (submissionData.ContainsKey(element.Id) && element.Validation != null)
                {
                    var fieldErrors = ValidateFieldValue(element, submissionData[element.Id]);
                    if (fieldErrors.Any())
                    {
                        result.IsValid = false;
                        result.Errors.AddRange(fieldErrors);
                    }
                }
            }

            var crossFieldResult = await _crossFieldValidationService.ValidateFormSubmissionAsync(formId, submissionData);
            if (!crossFieldResult.IsValid)
            {
                result.IsValid = false;
                foreach (var error in crossFieldResult.Errors)
                {
                    result.Errors.Add($"{error.RuleName}: {error.ErrorMessage}");
                }
            }

            return result;
        }

        private bool EvaluateConditionGroup(ConditionGroupModel group, Dictionary<string, object> data)
        {
            if (group.Conditions == null || !group.Conditions.Any())
                return true;

            var results = new List<bool>();

            foreach (var conditionElement in group.Conditions)
            {
                if (conditionElement.TryGetProperty("logic", out var logicProp))
                {
                    var nestedGroup = JsonSerializer.Deserialize<ConditionGroupModel>(conditionElement.GetRawText());
                    if (nestedGroup != null)
                        results.Add(EvaluateConditionGroup(nestedGroup, data));
                }
                else
                {
                    var condition = JsonSerializer.Deserialize<FieldConditionModel>(conditionElement.GetRawText());
                    if (condition != null)
                        results.Add(EvaluateCondition(condition, data));
                }
            }

            return group.Logic switch
            {
                "OR" => results.Any(r => r),
                "NOT" => !results.All(r => r),
                _ => results.All(r => r)
            };
        }

        private bool EvaluateCondition(FieldConditionModel condition, Dictionary<string, object> data)
        {
            if (!data.ContainsKey(condition.FieldId))
            {
                return condition.Operator switch
                {
                    "is_empty" => true,
                    "is_not_empty" => false,
                    _ => false
                };
            }

            var fieldValue = data[condition.FieldId];
            var compareValue = condition.Value;

            bool result = condition.Operator switch
            {
                "equals" => ValuesEqual(fieldValue, compareValue),
                "not_equals" => !ValuesEqual(fieldValue, compareValue),
                "contains" => fieldValue?.ToString()?.Contains(compareValue?.ToString() ?? "", StringComparison.OrdinalIgnoreCase) ?? false,
                "greater_than" => CompareNumeric(fieldValue, compareValue) > 0,
                "less_than" => CompareNumeric(fieldValue, compareValue) < 0,
                "is_empty" => IsEmpty(fieldValue),
                "is_not_empty" => !IsEmpty(fieldValue),
                _ => false
            };

            return condition.Negate ? !result : result;
        }

        private bool ValuesEqual(object value1, object value2)
        {
            if (value1 == null && value2 == null) return true;
            if (value1 == null || value2 == null) return false;

            if (decimal.TryParse(value1.ToString(), out var num1) &&
                decimal.TryParse(value2.ToString(), out var num2))
            {
                return num1 == num2;
            }

            return value1.ToString()?.Equals(value2.ToString(), StringComparison.OrdinalIgnoreCase) ?? false;
        }

        private int CompareNumeric(object value1, object value2)
        {
            if (!decimal.TryParse(value1?.ToString(), out var num1))
                throw new InvalidOperationException("Cannot compare non-numeric values");
            if (!decimal.TryParse(value2?.ToString(), out var num2))
                throw new InvalidOperationException("Cannot compare non-numeric values");

            return num1.CompareTo(num2);
        }

        private static bool IsEmpty(object value)
        {
            if (value == null) return true;
            if (value is string s) return string.IsNullOrWhiteSpace(s);
            if (value is System.Collections.IEnumerable enumerable && value is not string)
            {
                return !enumerable.Cast<object>().Any();
            }
            return false;
        }

        private (bool IsVisible, bool IsRequired, bool IsDisabled) GetElementState(FormElementModel element, Dictionary<string, object> data)
        {
            bool isVisible = element.Conditions != null ? EvaluateConditionGroup(element.Conditions, data) : true;
            bool isRequired = element.Required;
            bool isDisabled = false;
            bool hasShow = false;
            bool hasHide = false;

            void ApplyAction(FieldConditionModel condition, string? action)
            {
                if (string.IsNullOrWhiteSpace(action) || action == "none") return;
                switch (action)
                {
                    case "show":
                        hasShow = true;
                        break;
                    case "hide":
                        hasHide = true;
                        break;
                    case "require":
                        isRequired = true;
                        break;
                    case "disable":
                        isDisabled = true;
                        break;
                    case "enable":
                        isDisabled = false;
                        break;
                    case "set_value":
                        if (condition.SetValue != null)
                        {
                            data[element.Id] = condition.SetValue;
                        }
                        break;
                }
            }

            if (element.Conditions != null)
            {
                foreach (var condition in CollectConditions(element.Conditions))
                {
                    if (EvaluateCondition(condition, data))
                    {
                        ApplyAction(condition, condition.Action);
                    }
                    else
                    {
                        ApplyAction(condition, condition.ElseAction);
                    }
                }
            }

            if (hasHide)
            {
                isVisible = false;
            }
            else if (hasShow)
            {
                isVisible = true;
            }

            if (isDisabled)
            {
                isRequired = false;
            }

            return (isVisible, isRequired, isDisabled);
        }

        private static IEnumerable<FieldConditionModel> CollectConditions(ConditionGroupModel group)
        {
            if (group == null) yield break;
            foreach (var conditionElement in group.Conditions)
            {
                if (conditionElement.TryGetProperty("logic", out _))
                {
                    var nestedGroup = JsonSerializer.Deserialize<ConditionGroupModel>(conditionElement.GetRawText());
                    if (nestedGroup != null)
                    {
                        foreach (var nested in CollectConditions(nestedGroup))
                        {
                            yield return nested;
                        }
                    }
                }
                else
                {
                    var condition = JsonSerializer.Deserialize<FieldConditionModel>(conditionElement.GetRawText());
                    if (condition != null)
                        yield return condition;
                }
            }
        }

        private List<string> ValidateFieldValue(FormElementModel element, object value)
        {
            var errors = new List<string>();
            var validation = element.Validation;

            if (validation == null || value == null)
                return errors;

            var stringValue = value.ToString();

            if (element.Type == "number" && decimal.TryParse(stringValue, out var numValue))
            {
                if (validation.Min.HasValue && numValue < validation.Min.Value)
                    errors.Add($"Field '{element.Label}': Value must be at least {validation.Min.Value}");

                if (validation.Max.HasValue && numValue > validation.Max.Value)
                    errors.Add($"Field '{element.Label}': Value must be at most {validation.Max.Value}");
            }

            if ((element.Type == "select" || element.Type == "radio" || element.Type == "checkbox") &&
                element.Options != null && element.Options.Any())
            {
                var allowed = element.Options
                    .Where(o => !string.IsNullOrWhiteSpace(o.Value))
                    .Select(o => o.Value)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                IEnumerable<string> selectedValues = value switch
                {
                    JsonElement je when je.ValueKind == JsonValueKind.Array => je.EnumerateArray()
                        .Select(x => x.ToString())
                        .Where(s => !string.IsNullOrWhiteSpace(s))!,
                    JsonElement je when je.ValueKind == JsonValueKind.String => new[] { je.GetString() ?? string.Empty },
                    IEnumerable<string> list => list,
                    IEnumerable<object> list => list.Select(x => x?.ToString() ?? string.Empty),
                    _ => new[] { stringValue ?? string.Empty }
                };

                foreach (var selected in selectedValues.Where(s => !string.IsNullOrWhiteSpace(s)))
                {
                    if (!allowed.Contains(selected))
                    {
                        errors.Add($"Field '{element.Label}': Invalid option '{selected}'");
                    }
                }
            }

            if (!string.IsNullOrWhiteSpace(validation.Pattern))
            {
                try
                {
                    var regex = new System.Text.RegularExpressions.Regex(validation.Pattern);
                    if (!string.IsNullOrWhiteSpace(stringValue) && !regex.IsMatch(stringValue))
                    {
                        var message = !string.IsNullOrWhiteSpace(validation.CustomMessage)
                            ? validation.CustomMessage
                            : $"Field '{element.Label}': Value does not match required pattern";
                        errors.Add(message);
                    }
                }
                catch (Exception ex)
                {
                    errors.Add($"Field '{element.Label}': Invalid validation pattern - {ex.Message}");
                }
            }

            return errors;
        }

        private class FormElementModel
        {
            [JsonPropertyName("id")]
            public required string Id { get; set; }

            [JsonPropertyName("type")]
            public required string Type { get; set; }

            [JsonPropertyName("label")]
            public required string Label { get; set; }

            [JsonPropertyName("fieldName")]
            public string? FieldName { get; set; }

            [JsonPropertyName("required")]
            public bool Required { get; set; }

            [JsonPropertyName("options")]
            public List<SelectOptionModel>? Options { get; set; }

            [JsonPropertyName("validation")]
            public ValidationRulesModel? Validation { get; set; }

            [JsonPropertyName("calculation")]
            public CalculationRuleModel? Calculation { get; set; }

            [JsonPropertyName("conditions")]
            public ConditionGroupModel? Conditions { get; set; }
        }

        private class SelectOptionModel
        {
            [JsonPropertyName("value")]
            public string? Value { get; set; }

            [JsonPropertyName("label")]
            public string? Label { get; set; }
        }

        private class ValidationRulesModel
        {
            [JsonPropertyName("min")]
            public decimal? Min { get; set; }

            [JsonPropertyName("max")]
            public decimal? Max { get; set; }

            [JsonPropertyName("pattern")]
            public string? Pattern { get; set; }

            [JsonPropertyName("customMessage")]
            public string? CustomMessage { get; set; }
        }

        private class CalculationRuleModel
        {
            [JsonPropertyName("expression")]
            public required string Expression { get; set; }

            [JsonPropertyName("outputType")]
            public required string OutputType { get; set; }
        }

        private class ConditionGroupModel
        {
            [JsonPropertyName("logic")]
            public string Logic { get; set; } = "AND";

            [JsonPropertyName("conditions")]
            public required List<JsonElement> Conditions { get; set; }
        }

        private class FieldConditionModel
        {
            [JsonPropertyName("fieldId")]
            public required string FieldId { get; set; }

            [JsonPropertyName("operator")]
            public required string Operator { get; set; }

            [JsonPropertyName("value")]
            public required object Value { get; set; }

            [JsonPropertyName("action")]
            public string? Action { get; set; }

            [JsonPropertyName("elseAction")]
            public string? ElseAction { get; set; }

            [JsonPropertyName("setValue")]
            public object? SetValue { get; set; }

            [JsonPropertyName("negate")]
            public bool Negate { get; set; }
        }

        private static string GenerateFieldName(string label)
        {
            if (string.IsNullOrWhiteSpace(label))
                return "field";

            // Convert to snake_case: replace spaces and special chars with underscores, convert to lowercase
            var fieldName = System.Text.RegularExpressions.Regex.Replace(label, @"[^a-zA-Z0-9\s]", "");
            fieldName = System.Text.RegularExpressions.Regex.Replace(fieldName, @"\s+", "_");
            return fieldName.ToLowerInvariant();
        }
    }

    public class FormConditionValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();
        public Dictionary<string, object> CalculatedValues { get; set; } = new();
        public List<string> HiddenFields { get; set; } = new();
    }
}
