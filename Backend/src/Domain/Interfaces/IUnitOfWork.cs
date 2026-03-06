using System.Threading;
using System.Threading.Tasks;

namespace WorkflowAutomation.Domain.Interfaces
{
    public interface IUnitOfWork
    {
        Task<int> CompleteAsync(CancellationToken cancellationToken = default);
    }
}
