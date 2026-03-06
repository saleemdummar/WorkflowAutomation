using System;
using System.Collections.Generic;

namespace WorkflowAutomation.Application.DTOs.Validation
{
    public class CrossFieldValidationRuleDto
    {
        public Guid Id { get; set; }
        public Guid FormId { get; set; }
        public required string FormName { get; set; }
        public required string RuleName { get; set; }
        public required string ValidationType { get; set; }
        public required string RuleConfiguration { get; set; }
        public required string ErrorMessage { get; set; }
        public bool IsActive { get; set; }
        public int ExecutionOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class CreateCrossFieldValidationRuleDto
    {
        public Guid FormId { get; set; }
        public required string RuleName { get; set; }
        public required string ValidationType { get; set; }
        public required string RuleConfiguration { get; set; }
        public required string ErrorMessage { get; set; }
        public int ExecutionOrder { get; set; } = 0;
    }

    public class UpdateCrossFieldValidationRuleDto
    {
        public string? RuleName { get; set; }
        public string? RuleConfiguration { get; set; }
        public string? ErrorMessage { get; set; }
        public bool? IsActive { get; set; }
        public int? ExecutionOrder { get; set; }
    }

    public class CrossFieldValidationResult
    {
        public bool IsValid { get; set; }
        public List<CrossFieldValidationError> Errors { get; set; } = new();
    }

    public class CrossFieldValidationError
    {
        public required string RuleName { get; set; }
        public required string ErrorMessage { get; set; }
        public List<string> AffectedFields { get; set; } = new();
    }

    public class ComparisonRuleConfig
    {
        public required string Field1 { get; set; }
        public required string Operator { get; set; } // equals, notEquals, lessThan, lessThanOrEqual, greaterThan, greaterThanOrEqual
        public required string Field2 { get; set; }
    }

    public class SumRuleConfig
    {
        public required List<string> Fields { get; set; }
        public required string TotalField { get; set; }
        public decimal Tolerance { get; set; } = 0.01m; // Allow small floating point differences
    }

    public class DateRangeRuleConfig
    {
        public required string StartDateField { get; set; }
        public required string EndDateField { get; set; }
        public int? MinDays { get; set; }
        public int? MaxDays { get; set; }
    }

    public class CustomRuleConfig
    {
        public required string Expression { get; set; } // JavaScript expression to evaluate
        public required List<string> RequiredFields { get; set; }
    }
}
