using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Domain.Interfaces
{
    public interface IWorkflowRepository : IRepository<Workflow>
    {
        Task<IReadOnlyList<Workflow>> GetWorkflowsByFormIdAsync(Guid formId);
        Task<IReadOnlyList<Workflow>> GetActiveWorkflowsAsync();
        Task<Workflow?> GetWorkflowWithNodesAsync(Guid workflowId);
    }
}
