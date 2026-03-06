using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IPerformanceService
    {
        Task<PerformanceMetricsDto> GetMetricsAsync();
    }
}
