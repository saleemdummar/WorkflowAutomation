using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Domain.Interfaces
{
    public interface IFormRepository : IRepository<Form>
    {
        Task<IReadOnlyList<Form>> GetPublishedFormsAsync();
        Task<IReadOnlyList<Form>> GetFormsByCategoryAsync(Guid categoryId);
        Task<IReadOnlyList<Form>> GetArchivedFormsAsync();
        Task<IReadOnlyList<Form>> SearchFormsAsync(string searchTerm);
        Task<Form?> GetFormWithFieldsAsync(Guid formId);
        Task<Form?> GetFormWithFieldsAndConditionsAsync(Guid formId);
    }
}
