using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Application.Interfaces
{
    /// <summary>
    /// Handles workflow definition loading, parsing, and validation.
    /// Extracted from WorkflowEngine to separate definition concerns from execution logic.
    /// </summary>
    public interface IWorkflowDefinitionService
    {
        /// <summary>
        /// Loads the runtime JObject definition for a workflow — preferring the normalized
        /// node/edge graph stored in the database, falling back to WorkflowDefinitionJson.
        /// </summary>
        Task<JsonObject?> LoadRuntimeDefinitionAsync(Workflow workflow);

        /// <summary>
        /// Validates a parsed workflow definition, returning true when the definition is structurally correct.
        /// When validation fails, <paramref name="errors"/> contains the list of problems found.
        /// </summary>
        bool ValidateWorkflowDefinition(JsonObject definition, out List<string> errors);

        /// <summary>
        /// Checks whether a trigger node configuration matches the given form submission's FormId.
        /// </summary>
        bool IsTriggerMatch(JsonNode triggerNode, Guid formId);

        /// <summary>
        /// Extracts the config object from a workflow node's data payload.
        /// Returns <c>data.config</c> if present, otherwise <c>data</c> itself.
        /// </summary>
        JsonObject? GetNodeConfig(JsonNode node);

        /// <summary>
        /// Builds a JObject definition from a workflow's normalized Nodes and Edges collections.
        /// Returns null if the workflow has no normalized nodes.
        /// </summary>
        JsonObject? BuildDefinitionFromNormalizedGraph(Workflow workflow);
    }
}
