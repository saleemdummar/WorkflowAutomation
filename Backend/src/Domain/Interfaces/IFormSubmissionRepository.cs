using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Domain.Interfaces
{

    public interface IFormSubmissionRepository : IRepository<FormSubmission>
    {

        Task<FormSubmission?> GetSubmissionWithDataAsync(Guid id);

        Task<IReadOnlyList<FormSubmission>> GetSubmissionsWithDataAsync(IEnumerable<Guid> ids);
    }
}
