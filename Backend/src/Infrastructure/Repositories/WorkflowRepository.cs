using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;
using WorkflowAutomation.Infrastructure.Data;

namespace WorkflowAutomation.Infrastructure.Repositories
{
    public class WorkflowRepository : GenericRepository<Workflow>, IWorkflowRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public WorkflowRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IReadOnlyList<Workflow>> GetWorkflowsByFormIdAsync(Guid formId)
        {
            return await _dbContext.Workflows
                .Where(w => w.FormId == formId)
                .OrderByDescending(w => w.CreatedDate)
                .ToListAsync();
        }

        /// <summary>
        /// Returns workflows that are both active (IsActive) and published (IsPublished).
        /// A workflow must be explicitly published by its designer to become eligible for execution.
        /// The IsActive flag allows admins to temporarily disable a published workflow without unpublishing.
        /// </summary>
        public async Task<IReadOnlyList<Workflow>> GetActiveWorkflowsAsync()
        {
            return await _dbContext.Workflows
                .Where(w => w.IsActive && w.IsPublished)
                .OrderBy(w => w.WorkflowName)
                .ToListAsync();
        }

        public async Task<Workflow?> GetWorkflowWithNodesAsync(Guid workflowId)
        {
            return await _dbContext.Workflows
                .Include(w => w.Nodes)
                .Include(w => w.Edges)
                .FirstOrDefaultAsync(w => w.Id == workflowId);
        }
    }
}
