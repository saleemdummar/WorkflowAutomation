using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Infrastructure.Services
{
    public class LocalFileStorageService : IFileStorageService
    {
        private readonly string _storagePath;

        public LocalFileStorageService(IConfiguration configuration)
        {
            _storagePath = configuration["FileStorage:Path"] ?? "App_Data/Uploads";
            if (!Directory.Exists(_storagePath))
            {
                Directory.CreateDirectory(_storagePath);
            }
        }

        public async Task<string> SaveFileAsync(Stream fileStream, string fileName)
        {
            var fileId = Guid.NewGuid().ToString();
            var extension = Path.GetExtension(fileName);
            var physicalPath = Path.Combine(_storagePath, fileId + extension);

            using (var destinationStream = new FileStream(physicalPath, FileMode.Create))
            {
                await fileStream.CopyToAsync(destinationStream);
            }

            return fileId + extension;
        }

        public Task<Stream> GetFileAsync(string fileId)
        {
            var sanitized = SanitizeFileId(fileId);
            var physicalPath = Path.Combine(_storagePath, sanitized);
            if (!File.Exists(physicalPath))
            {
                throw new FileNotFoundException("File not found on server.");
            }

            return Task.FromResult<Stream>(new FileStream(physicalPath, FileMode.Open, FileAccess.Read));
        }

        public Task DeleteFileAsync(string fileId)
        {
            var sanitized = SanitizeFileId(fileId);
            var physicalPath = Path.Combine(_storagePath, sanitized);
            if (File.Exists(physicalPath))
            {
                File.Delete(physicalPath);
            }
            return Task.CompletedTask;
        }

        /// <summary>
        /// Strips directory separators and path traversal sequences from fileId to prevent path traversal attacks.
        /// </summary>
        private static string SanitizeFileId(string fileId)
        {
            if (string.IsNullOrWhiteSpace(fileId))
                throw new ArgumentException("File identifier cannot be empty.", nameof(fileId));

            var fileName = Path.GetFileName(fileId);
            if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains(".."))
                throw new ArgumentException("Invalid file identifier.", nameof(fileId));

            return fileName;
        }
    }
}
