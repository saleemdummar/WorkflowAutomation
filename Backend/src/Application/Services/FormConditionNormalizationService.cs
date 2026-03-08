using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    public class FormConditionNormalizationService : IFormConditionNormalizationService
    {
        private readonly IRepository<ConditionGroup> _conditionGroupRepository;
        private readonly IRepository<FormCondition> _conditionRepository;
        private readonly IRepository<ConditionAction> _conditionActionRepository;
        private readonly IRepository<FormField> _fieldRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<FormConditionNormalizationService> _logger;

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private static readonly JsonSerializerOptions _serializeOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        public FormConditionNormalizationService(
            IRepository<ConditionGroup> conditionGroupRepository,
            IRepository<FormCondition> conditionRepository,
            IRepository<ConditionAction> conditionActionRepository,
            IRepository<FormField> fieldRepository,
            IUnitOfWork unitOfWork,
            ILogger<FormConditionNormalizationService> logger)
        {
            _conditionGroupRepository = conditionGroupRepository;
            _conditionRepository = conditionRepository;
            _conditionActionRepository = conditionActionRepository;
            _fieldRepository = fieldRepository;
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task SaveConditionsFromElementsAsync(
            Guid formId,
            List<FormElementDto> elements,
            List<FormField> fields,
            string userId)
        {
            if (elements == null || fields == null) return;

            var fieldById = fields.ToDictionary(f => f.Id);
            var fieldByName = fields
                .GroupBy(f => NormalizeLookupKey(f.FieldName), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
            var resolvedFieldIdByElementId = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);

            foreach (var element in elements)
            {
                var field = ResolveField(element, fieldById, fieldByName);
                if (field == null)
                {
                    _logger.LogWarning("Field for element {ElementId} / {FieldName} not found in form {FormId}", element.Id, element.FieldName, formId);
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(element.Id))
                {
                    resolvedFieldIdByElementId[element.Id] = field.Id;
                }

                if (element.Conditions == null) continue;

                var conditionsJson = JsonSerializer.Serialize(element.Conditions, _jsonOptions);

                var groupDto = JsonSerializer.Deserialize<ConditionGroupDto>(conditionsJson, _jsonOptions);
                if (groupDto == null || groupDto.Conditions == null || groupDto.Conditions.Count == 0) continue;

                var group = await CreateConditionGroupAsync(
                    groupDto,
                    formId,
                    null,
                    field.Id,
                    userId,
                    fieldById,
                    fieldByName,
                    resolvedFieldIdByElementId,
                    elements);
                field.ConditionGroupId = group.Id;
                await _fieldRepository.UpdateAsync(field);
            }

            // Ensure all changes are persisted to the database
            await _unitOfWork.CompleteAsync();
        }

        private async Task<ConditionGroup> CreateConditionGroupAsync(
            ConditionGroupDto groupDto,
            Guid formId,
            Guid? parentGroupId,
            Guid targetFieldId,
            string userId,
            IReadOnlyDictionary<Guid, FormField> fieldById,
            IReadOnlyDictionary<string, FormField> fieldByName,
            IDictionary<string, Guid> resolvedFieldIdByElementId,
            IReadOnlyList<FormElementDto> elements)
        {
            var group = new ConditionGroup
            {
                Id = Guid.NewGuid(),
                FormId = formId,
                GroupName = targetFieldId.ToString(),
                LogicalOperator = groupDto.Logic ?? "AND",
                ParentGroupId = parentGroupId,
                CreatedBy = userId,
                LastModifiedBy = userId
            };
            await _conditionGroupRepository.AddAsync(group);

            int executionOrder = 0;
            if (groupDto.Conditions != null)
            {
                foreach (var conditionObj in groupDto.Conditions)
                {
                    var jsonText = conditionObj is JsonElement je
                        ? je.GetRawText()
                        : JsonSerializer.Serialize(conditionObj);

                    var jsonElement = JsonDocument.Parse(jsonText).RootElement;

                    if (jsonElement.TryGetProperty("logic", out _) || jsonElement.TryGetProperty("Logic", out _))
                    {
                        // Nested condition group
                        var nestedDto = JsonSerializer.Deserialize<ConditionGroupDto>(jsonText, _jsonOptions);
                        if (nestedDto != null)
                        {
                            await CreateConditionGroupAsync(nestedDto, formId, group.Id, targetFieldId, userId, fieldById, fieldByName, resolvedFieldIdByElementId, elements);
                        }
                    }
                    else
                    {
                        // Simple field condition
                        var condDto = JsonSerializer.Deserialize<FieldConditionDto>(jsonText, _jsonOptions);
                        if (condDto != null)
                        {
                            await CreateFormConditionAsync(condDto, group, formId, targetFieldId, userId, executionOrder++, fieldById, fieldByName, resolvedFieldIdByElementId, elements);
                        }
                    }
                }
            }

            return group;
        }

        private async Task CreateFormConditionAsync(
            FieldConditionDto dto,
            ConditionGroup group,
            Guid formId,
            Guid targetFieldId,
            string userId,
            int order,
            IReadOnlyDictionary<Guid, FormField> fieldById,
            IReadOnlyDictionary<string, FormField> fieldByName,
            IDictionary<string, Guid> resolvedFieldIdByElementId,
            IReadOnlyList<FormElementDto> elements)
        {
            var triggerFieldId = ResolveTriggerFieldId(dto.FieldId, fieldById, fieldByName, resolvedFieldIdByElementId, elements);
            if (!triggerFieldId.HasValue)
            {
                _logger.LogWarning("Skipping condition with invalid trigger field ID: {FieldId}", dto.FieldId);
                return;
            }

            var condition = new FormCondition
            {
                FormId = formId,
                ConditionGroupId = group.Id,
                ConditionName = $"Condition_{order}",
                TriggerFieldId = triggerFieldId.Value,
                Operator = dto.Operator ?? "equals",
                ComparisonValue = dto.Value?.ToString() ?? "",
                LogicalOperator = group.LogicalOperator,
                ExecutionOrder = order,
                IsActive = true,
                CreatedBy = userId,
                LastModifiedBy = userId
            };
            await _conditionRepository.AddAsync(condition);

            var actionConfigObj = new Dictionary<string, object>();
            if (!string.IsNullOrWhiteSpace(dto.ElseAction))
                actionConfigObj["elseAction"] = dto.ElseAction;
            if (dto.SetValue != null)
                actionConfigObj["setValue"] = dto.SetValue;
            if (dto.Negate.HasValue && dto.Negate.Value)
                actionConfigObj["negate"] = true;

            var action = new ConditionAction
            {
                ConditionId = condition.Id,
                TargetFieldId = targetFieldId,
                ActionType = dto.Action ?? "show",
                ActionConfigJson = JsonSerializer.Serialize(actionConfigObj),
                ExecutionOrder = order,
                CreatedBy = userId,
                LastModifiedBy = userId
            };
            await _conditionActionRepository.AddAsync(action);
        }

        private FormField? ResolveField(
            FormElementDto element,
            IReadOnlyDictionary<Guid, FormField> fieldById,
            IReadOnlyDictionary<string, FormField> fieldByName)
        {
            if (!string.IsNullOrWhiteSpace(element.Id) && Guid.TryParse(element.Id, out var fieldId) && fieldById.TryGetValue(fieldId, out var byId))
            {
                return byId;
            }

            var normalizedFieldName = NormalizeLookupKey(element.FieldName);
            if (!string.IsNullOrWhiteSpace(normalizedFieldName) && fieldByName.TryGetValue(normalizedFieldName, out var byName))
            {
                return byName;
            }

            return null;
        }

        private Guid? ResolveTriggerFieldId(
            string? triggerFieldId,
            IReadOnlyDictionary<Guid, FormField> fieldById,
            IReadOnlyDictionary<string, FormField> fieldByName,
            IDictionary<string, Guid> resolvedFieldIdByElementId,
            IReadOnlyList<FormElementDto> elements)
        {
            if (string.IsNullOrWhiteSpace(triggerFieldId))
            {
                return null;
            }

            if (Guid.TryParse(triggerFieldId, out var parsedFieldId) && fieldById.ContainsKey(parsedFieldId))
            {
                return parsedFieldId;
            }

            if (resolvedFieldIdByElementId.TryGetValue(triggerFieldId, out var resolvedFieldId))
            {
                return resolvedFieldId;
            }

            var sourceElement = elements.FirstOrDefault(e => string.Equals(e.Id, triggerFieldId, StringComparison.OrdinalIgnoreCase));
            if (sourceElement != null)
            {
                var normalizedFieldName = NormalizeLookupKey(sourceElement.FieldName);
                if (!string.IsNullOrWhiteSpace(normalizedFieldName) && fieldByName.TryGetValue(normalizedFieldName, out var field))
                {
                    return field.Id;
                }
            }

            return null;
        }

        private static string NormalizeLookupKey(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : value.Trim().ToLowerInvariant();
        }

        public async Task DeleteAllConditionsAsync(Guid formId)
        {
            // 1. Get all condition data for this form
            var conditions = (await _conditionRepository.FindAsync(c => c.FormId == formId)).ToList();
            var conditionIds = conditions.Select(c => c.Id).ToHashSet();
            var actions = conditionIds.Any()
                ? (await _conditionActionRepository.FindAsync(a => conditionIds.Contains(a.ConditionId))).ToList()
                : new List<ConditionAction>();
            var groups = (await _conditionGroupRepository.FindAsync(g => g.FormId == formId)).ToList();

            // 2. Delete actions first
            if (actions.Any())
                await _conditionActionRepository.DeleteRangeAsync(actions);

            // 3. Delete conditions
            if (conditions.Any())
                await _conditionRepository.DeleteRangeAsync(conditions);

            // 4. Clear FormField.ConditionGroupId references
            var fields = (await _fieldRepository.FindAsync(f => f.FormId == formId)).ToList();
            foreach (var f in fields.Where(f => f.ConditionGroupId.HasValue))
            {
                f.ConditionGroupId = null;
                await _fieldRepository.UpdateAsync(f);
            }

            // 5. Nullify parent references in groups to break self-referential FK
            foreach (var g in groups.Where(g => g.ParentGroupId.HasValue))
            {
                g.ParentGroupId = null;
                await _conditionGroupRepository.UpdateAsync(g);
            }

            // Save to clear FK references before deleting groups
            await _unitOfWork.CompleteAsync();

            // 6. Delete all groups (no FK references remain)
            if (groups.Any())
                await _conditionGroupRepository.DeleteRangeAsync(groups);

            // Persist the deletion before any recreation in the same request.
            await _unitOfWork.CompleteAsync();
        }

        public async Task<string> BuildFormDefinitionJsonAsync(Guid formId)
        {
            var fields = (await _fieldRepository.FindAsync(f => f.FormId == formId))
                .OrderBy(f => f.DisplayOrder)
                .ToList();

            if (!fields.Any()) return "[]";
            var allGroups = (await _conditionGroupRepository.FindAsync(g => g.FormId == formId)).ToList();
            var allConditions = (await _conditionRepository.FindAsync(c => c.FormId == formId)).ToList();
            var allConditionIds = allConditions.Select(c => c.Id).ToHashSet();
            var allActions = allConditionIds.Any()
                ? (await _conditionActionRepository.FindAsync(a => allConditionIds.Contains(a.ConditionId))).ToList()
                : new List<ConditionAction>();

            var groupDict = allGroups.ToDictionary(g => g.Id);
            var conditionsByGroup = allConditions
                .GroupBy(c => c.ConditionGroupId ?? Guid.Empty)
                .ToDictionary(g => g.Key, g => g.OrderBy(c => c.ExecutionOrder).ToList());
            var actionsByCondition = allActions
                .GroupBy(a => a.ConditionId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var elements = new List<Dictionary<string, object>>();

            foreach (var field in fields)
            {
                var element = new Dictionary<string, object>
                {
                    ["id"] = field.Id.ToString(),
                    ["type"] = field.FieldType ?? "text",
                    ["label"] = field.FieldLabel ?? "Field",
                    ["fieldName"] = field.FieldName ?? "field",
                    ["required"] = field.IsRequired
                };

                if (!string.IsNullOrWhiteSpace(field.FieldConfigJson))
                {
                    try
                    {
                        var config = JsonDocument.Parse(field.FieldConfigJson).RootElement;

                        if (config.TryGetProperty("placeholder", out var ph) && ph.ValueKind == JsonValueKind.String)
                            element["placeholder"] = ph.GetString()!;

                        if (config.TryGetProperty("options", out var opts) && opts.ValueKind == JsonValueKind.Array)
                        {
                            var options = JsonSerializer.Deserialize<object>(opts.GetRawText());
                            if (options != null)
                                element["options"] = options;
                        }

                        if (config.TryGetProperty("validation", out var val) && val.ValueKind == JsonValueKind.Object)
                        {
                            var validation = JsonSerializer.Deserialize<object>(val.GetRawText());
                            if (validation != null)
                                element["validation"] = validation;
                        }

                        if (config.TryGetProperty("calculation", out var calc) && calc.ValueKind == JsonValueKind.Object)
                        {
                            var calculation = JsonSerializer.Deserialize<object>(calc.GetRawText());
                            if (calculation != null)
                                element["calculation"] = calculation;
                        }

                        if (config.TryGetProperty("style", out var style) && style.ValueKind == JsonValueKind.Object)
                        {
                            var parsedStyle = JsonSerializer.Deserialize<object>(style.GetRawText());
                            if (parsedStyle != null)
                                element["style"] = parsedStyle;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to parse FieldConfigJson for field {FieldId}", field.Id);
                    }
                }

                if (field.ConditionGroupId.HasValue && groupDict.TryGetValue(field.ConditionGroupId.Value, out var group))
                {
                    var conditionGroupObj = BuildConditionGroupObject(group, groupDict, conditionsByGroup, actionsByCondition);
                    element["conditions"] = conditionGroupObj;
                }

                elements.Add(element);
            }

            return JsonSerializer.Serialize(elements, _serializeOptions);
        }

        private Dictionary<string, object> BuildConditionGroupObject(
            ConditionGroup group,
            Dictionary<Guid, ConditionGroup> allGroups,
            Dictionary<Guid, List<FormCondition>> conditionsByGroup,
            Dictionary<Guid, List<ConditionAction>> actionsByCondition)
        {
            var items = new List<object>();

            // Add simple conditions from this group
            if (conditionsByGroup.TryGetValue(group.Id, out var conditions))
            {
                foreach (var cond in conditions)
                {
                    ConditionAction? action = null;
                    if (actionsByCondition.TryGetValue(cond.Id, out var acts))
                    {
                        action = acts.FirstOrDefault();
                    }

                    var condObj = new Dictionary<string, object>
                    {
                        ["fieldId"] = cond.TriggerFieldId.ToString(),
                        ["operator"] = cond.Operator ?? "equals",
                        ["value"] = cond.ComparisonValue ?? ""
                    };

                    if (action != null)
                    {
                        condObj["action"] = action.ActionType ?? "show";

                        // Parse action config for elseAction, setValue, negate
                        if (!string.IsNullOrWhiteSpace(action.ActionConfigJson))
                        {
                            try
                            {
                                var cfg = JsonDocument.Parse(action.ActionConfigJson).RootElement;

                                if (cfg.TryGetProperty("elseAction", out var ea) && ea.ValueKind == JsonValueKind.String)
                                    condObj["elseAction"] = ea.GetString()!;

                                if (cfg.TryGetProperty("setValue", out var sv) && sv.ValueKind != JsonValueKind.Null)
                                    condObj["setValue"] = sv.ToString();

                                if (cfg.TryGetProperty("negate", out var ng) && ng.ValueKind == JsonValueKind.True)
                                    condObj["negate"] = true;
                            }
                            catch { /* action config parse failure is non-fatal */ }
                        }
                    }

                    items.Add(condObj);
                }
            }

            // Add nested sub-groups
            var subGroups = allGroups.Values
                .Where(g => g.ParentGroupId == group.Id)
                .OrderBy(g => g.CreatedDate)
                .ToList();

            foreach (var sub in subGroups)
            {
                items.Add(BuildConditionGroupObject(sub, allGroups, conditionsByGroup, actionsByCondition));
            }

            return new Dictionary<string, object>
            {
                ["id"] = group.Id.ToString(),
                ["logic"] = group.LogicalOperator ?? "AND",
                ["conditions"] = items
            };
        }
    }
}
