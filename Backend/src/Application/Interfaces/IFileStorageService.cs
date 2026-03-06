using System.IO;
using System.Threading.Tasks;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IFileStorageService
    {
        Task<string> SaveFileAsync(Stream fileStream, string fileName);
        Task<Stream> GetFileAsync(string fileId);
        Task DeleteFileAsync(string fileId);
    }
}
