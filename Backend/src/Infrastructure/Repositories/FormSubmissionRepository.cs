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
    /// <summary>
    /// Specialized repository for FormSubmission that eagerly loads
    /// SubmissionData → Field and Form navigation properties.
    /// This solves the root cause of null navigation properties throughout
    /// the workflow engine and approval services.
    /// </summary>
    public class FormSubmissionRepository : GenericRepository<FormSubmission>, IFormSubmissionRepository
    {
        public FormSubmissionRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
        }

        public async Task<FormSubmission?> GetSubmissionWithDataAsync(Guid id)
        {
            return await _dbContext.FormSubmissions
                .Include(s => s.Form)
                .Include(s => s.SubmissionData)
                    .ThenInclude(d => d.Field)
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<IReadOnlyList<FormSubmission>> GetSubmissionsWithDataAsync(IEnumerable<Guid> ids)
        {
            var idList = ids.ToList();
            if (!idList.Any()) return Array.Empty<FormSubmission>();

            return await _dbContext.FormSubmissions
                .Include(s => s.Form)
                .Include(s => s.SubmissionData)
                    .ThenInclude(d => d.Field)
                .Where(s => idList.Contains(s.Id))
                .ToListAsync();
        }
    }
}
