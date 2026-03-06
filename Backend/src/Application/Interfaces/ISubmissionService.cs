using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface ISubmissionService
    {
        Task<FormSubmissionResult> SubmitFormAsync(Guid formId, FormSubmissionDto dto, string userId, Guid userGuid);
        Task<FormSubmissionResult> SaveDraftAsync(Guid formId, FormSubmissionDto dto, string userId, Guid userGuid);
        Task<IEnumerable<FormSubmission>> GetMyDraftsAsync(Guid formId, string userId, Guid userGuid);
        Task<DraftResult> GetDraftAsync(Guid formId, Guid draftId, string userId, Guid userGuid);
        Task<OperationResult> DeleteDraftAsync(Guid formId, Guid draftId, string userId, Guid userGuid);
        Task<FormSubmissionResult> SubmitDraftAsync(Guid formId, Guid draftId, string userId, Guid userGuid);
        Task<IEnumerable<SubmissionDto>> GetMySubmissionsAsync(Guid userGuid);
        Task<SubmissionDetail?> GetSubmissionByIdAsync(Guid id, string userId, Guid userGuid, bool allowAll = false);
        Task<IEnumerable<SubmissionDto>> GetSubmissionsByFormAsync(Guid formId, string userId, Guid userGuid, bool allowAll = false);
        Task<IEnumerable<SubmissionDto>> GetAllSubmissionsAsync();
        Task<IEnumerable<DraftSummary>> GetAllDraftsAsync(string userId, Guid userGuid);
        Task<FormSubmission?> GetSubmissionAsync(Guid formId, Guid id);
    }

    public class FormSubmissionResult
    {
        public bool Success { get; set; }
        public Guid? SubmissionId { get; set; }
        public string Message { get; set; }
        public IEnumerable<string> Errors { get; set; } = new List<string>();
    }

    public class DraftResult
    {
        public bool Success { get; set; }
        public Guid? Id { get; set; }
        public DateTime? DraftSavedAt { get; set; }
        public Dictionary<string, object> SubmissionData { get; set; } = new Dictionary<string, object>();
        public string Message { get; set; }
        public IEnumerable<string> Errors { get; set; } = new List<string>();
    }

    public class OperationResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public IEnumerable<string> Errors { get; set; } = new List<string>();
    }

    public class SubmissionSummary
    {
        public Guid Id { get; set; }
        public Guid FormId { get; set; }
        public string FormName { get; set; }
        public string SubmittedBy { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public string Status { get; set; }
        public string SubmissionData { get; set; }
    }

    public class SubmissionDetail
    {
        public Guid Id { get; set; }
        public Guid FormId { get; set; }
        public string FormName { get; set; }
        public string SubmittedBy { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public string Status { get; set; }
        public string SubmissionData { get; set; }
        public List<WorkflowExecutionInfo> WorkflowExecutions { get; set; } = new();
    }

    public class WorkflowExecutionInfo
    {
        public Guid InstanceId { get; set; }
        public Guid WorkflowId { get; set; }
        public string WorkflowName { get; set; }
        public string Status { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? CurrentNodeName { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class DraftSummary
    {
        public Guid Id { get; set; }
        public Guid FormId { get; set; }
        public string FormName { get; set; }
        public DateTime? DraftSavedAt { get; set; }
    }
}