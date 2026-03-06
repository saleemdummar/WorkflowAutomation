using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Application.Interfaces
{
    /// <summary>
    /// Handles saving and reading form conditions to/from normalized tables
    /// (ConditionGroup, FormCondition, ConditionAction) instead of JSON blobs.
    /// </summary>
    public interface IFormConditionNormalizationService
    {
        /// <summary>
        /// Parses element conditions from FormElementDto list and saves them
        /// to ConditionGroup, FormCondition, and ConditionAction tables.
        /// Also sets FormField.ConditionGroupId on corresponding fields.
        /// </summary>
        Task SaveConditionsFromElementsAsync(
            Guid formId,
            List<FormElementDto> elements,
            List<FormField> fields,
            string userId);

        /// <summary>
        /// Deletes all condition-related data (ConditionActions, FormConditions, ConditionGroups)
        /// for a given form. Also clears FormField.ConditionGroupId references.
        /// </summary>
        Task DeleteAllConditionsAsync(Guid formId);

        /// <summary>
        /// Rebuilds the form definition JSON from normalized tables (FormField + conditions).
        /// Returns a JSON array string compatible with the frontend FormElement[] format.
        /// </summary>
        Task<string> BuildFormDefinitionJsonAsync(Guid formId);
    }
}
