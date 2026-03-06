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
    public class FormRepository : GenericRepository<Form>, IFormRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public FormRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IReadOnlyList<Form>> GetPublishedFormsAsync()
        {
            return await _dbContext.Forms
                .Where(f => f.IsPublished && f.IsActive && !f.IsArchived)
                .OrderByDescending(f => f.CreatedDate)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Form>> GetFormsByCategoryAsync(Guid categoryId)
        {
            return await _dbContext.Forms
                .Where(f => f.CategoryId == categoryId)
                .OrderBy(f => f.FormName)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Form>> GetArchivedFormsAsync()
        {
            return await _dbContext.Forms
                .Where(f => f.IsArchived)
                .OrderByDescending(f => f.ArchivedAt)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Form>> SearchFormsAsync(string searchTerm)
        {
            var term = searchTerm.ToLower();
            return await _dbContext.Forms
                .Where(f => f.FormName.ToLower().Contains(term)
                    || (f.FormDescription != null && f.FormDescription.ToLower().Contains(term)))
                .OrderByDescending(f => f.CreatedDate)
                .ToListAsync();
        }

        public async Task<Form?> GetFormWithFieldsAsync(Guid formId)
        {
            return await _dbContext.Forms
                .Include(f => f.Fields)
                .FirstOrDefaultAsync(f => f.Id == formId);
        }

        public async Task<Form?> GetFormWithFieldsAndConditionsAsync(Guid formId)
        {
            var form = await _dbContext.Forms
                .Include(f => f.Fields.OrderBy(ff => ff.DisplayOrder))
                .FirstOrDefaultAsync(f => f.Id == formId);

            if (form == null) return null;

            await _dbContext.ConditionGroups
                .Where(g => g.FormId == formId)
                .ToListAsync();

            var conditions = await _dbContext.FormConditions
                .Where(c => c.FormId == formId)
                .ToListAsync();

            var conditionIds = conditions.Select(c => c.Id).ToList();
            if (conditionIds.Any())
            {
                await _dbContext.ConditionActions
                    .Where(a => conditionIds.Contains(a.ConditionId))
                    .ToListAsync();
            }

            return form;
        }
    }
}
