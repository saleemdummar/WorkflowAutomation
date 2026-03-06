using System;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    /// <summary>
    /// Sprint 2: Entity for cross-field validation rules
    /// </summary>
    public class CrossFieldValidationRule : BaseEntity
    {
        public Guid FormId { get; set; }
        public required Form Form { get; set; }

        /// <summary>
        /// Name/description of the validation rule
        /// </summary>
        public required string RuleName { get; set; }

        /// <summary>
        /// Type of validation: Comparison, Sum, DateRange, Custom
        /// </summary>
        public required string ValidationType { get; set; }

        /// <summary>
        /// JSON configuration for the validation rule
        /// Example for Comparison: { "field1": "startDate", "operator": "lessThan", "field2": "endDate" }
        /// Example for Sum: { "fields": ["item1", "item2", "item3"], "totalField": "total" }
        /// </summary>
        public required string RuleConfiguration { get; set; }

        /// <summary>
        /// Custom error message to display when validation fails
        /// </summary>
        public required string ErrorMessage { get; set; }

        /// <summary>
        /// Whether this rule is currently active
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Priority/order of execution (lower numbers execute first)
        /// </summary>
        public int ExecutionOrder { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Guid CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public Guid? UpdatedBy { get; set; }
    }
}
