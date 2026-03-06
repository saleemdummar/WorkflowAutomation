using System.Collections.Generic;

namespace WorkflowAutomation.Application.DTOs.Forms
{
    public class FormElementDto
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public string Label { get; set; }
        public string FieldName { get; set; }
        public string Placeholder { get; set; }
        public bool Required { get; set; }
        public List<SelectOptionDto> Options { get; set; }
        public ValidationRulesDto Validation { get; set; }
        public CalculationRuleDto Calculation { get; set; }
        public ElementStyleDto Style { get; set; }
        public ConditionGroupDto Conditions { get; set; }
    }

    public class SelectOptionDto
    {
        public string Value { get; set; }
        public string Label { get; set; }
    }

    public class ValidationRulesDto
    {
        public int? Min { get; set; }
        public int? Max { get; set; }
        public string Pattern { get; set; }
        public string CustomMessage { get; set; }
        public List<string> FileTypes { get; set; }
        public int? MaxSize { get; set; }
    }

    public class ElementStyleDto
    {
        public string Width { get; set; }
        public string Height { get; set; }
        public string CssClass { get; set; }
        public string FontSize { get; set; }
        public string Color { get; set; }
        public string BackgroundColor { get; set; }
        public int? ColumnStart { get; set; }
        public int? ColumnSpan { get; set; }
        public int? RowStart { get; set; }
        public int? RowSpan { get; set; }
    }

    public class CalculationRuleDto
    {
        public string Expression { get; set; }
        public string OutputType { get; set; }
    }

    public class FieldConditionDto
    {
        public string FieldId { get; set; }
        public string Operator { get; set; }
        public object Value { get; set; }
        public string Action { get; set; }
        public string ElseAction { get; set; }
        public object SetValue { get; set; }
        public bool? Negate { get; set; }
    }

    public class ConditionGroupDto
    {
        public string Id { get; set; }
        public string Logic { get; set; }
        public List<object> Conditions { get; set; } 
    }
}