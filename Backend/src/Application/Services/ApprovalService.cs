using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WorkflowAutomation.Application.DTOs.Approvals;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Application.Services
{
    public class ApprovalService : IApprovalService
    {
        private readonly IRepository<ApprovalTask> _approvalRepository;
        private readonly IRepository<ApprovalHistory> _approvalHistoryRepository;
        private readonly IFormSubmissionRepository _submissionRepository;
        private readonly IRepository<Form> _formRepository;
        private readonly ISystemLogService _systemLogService;
        private readonly IAuditLogService _auditLogService;
        private readonly IFormConditionNormalizationService _normalizationService;

        public ApprovalService(
            IRepository<ApprovalTask> approvalRepository,
            IRepository<ApprovalHistory> approvalHistoryRepository,
            IFormSubmissionRepository submissionRepository,
            IRepository<Form> formRepository,
            ISystemLogService systemLogService,
            IAuditLogService auditLogService,
            IFormConditionNormalizationService normalizationService)
        {
            _approvalRepository = approvalRepository;
            _approvalHistoryRepository = approvalHistoryRepository;
            _submissionRepository = submissionRepository;
            _formRepository = formRepository;
            _systemLogService = systemLogService;
            _auditLogService = auditLogService;
            _normalizationService = normalizationService;
        }

        public async Task<IEnumerable<EnrichedApprovalTaskDto>> GetMyTasksAsync(string userId)
        {
            var pendingTasks = await _approvalRepository.FindAsync(t =>
                t.TaskStatus == ApprovalTaskStatus.Pending && t.AssignedTo == userId);

            var (submissionLookup, formLookup) = await BatchLoadSubmissionsAndFormsAsync(pendingTasks);

            var enrichedTasks = pendingTasks.Select(task =>
            {
                var submission = task.WorkflowInstance?.Submission
                    ?? (task.WorkflowInstance != null && task.WorkflowInstance.SubmissionId.HasValue && submissionLookup.ContainsKey(task.WorkflowInstance.SubmissionId.Value)
                        ? submissionLookup[task.WorkflowInstance.SubmissionId.Value] : null);
                var form = submission?.Form
                    ?? (submission != null && formLookup.ContainsKey(submission.FormId)
                        ? formLookup[submission.FormId] : null);

                return new EnrichedApprovalTaskDto
                {
                    Id = task.Id,
                    WorkflowInstanceId = task.WorkflowInstanceId,
                    AssignedTo = task.AssignedTo,
                    Status = task.TaskStatus.ToString(),
                    DueDate = task.DueDate,
                    CreatedDate = task.CreatedDate,
                    Comments = task.Comments,
                    CompletedAt = task.CompletedAt,
                    FormId = submission?.FormId,
                    FormName = form?.FormName ?? "Unknown Form",
                    SubmissionId = submission?.Id,
                    SubmittedBy = submission?.SubmittedBy.ToString(),
                    SubmittedAt = submission?.SubmittedAt,
                    IsOverdue = task.DueDate.HasValue && task.DueDate < DateTime.UtcNow && task.TaskStatus == ApprovalTaskStatus.Pending,
                    Priority = CalculatePriority(task.DueDate, task.TaskStatus)
                };
            }).ToList();

            return enrichedTasks
                .OrderByDescending(t => t.Priority switch
                {
                    "critical" => 4,
                    "high" => 3,
                    "medium" => 2,
                    "normal" => 1,
                    _ => 0
                })
                .ThenBy(t => t.DueDate);
        }

        public async Task<ApprovalTaskDetailDto?> GetTaskByIdAsync(Guid taskId)
        {
            var task = await _approvalRepository.GetByIdAsync(taskId);
            if (task == null) return null;

            var (submission, form) = await ResolveSubmissionAndFormAsync(task);
            string? formDefinition = null;
            if (form != null)
            {
                try
                {
                    var rebuilt = await _normalizationService.BuildFormDefinitionJsonAsync(form.Id);
                    formDefinition = !string.IsNullOrWhiteSpace(rebuilt) && rebuilt != "[]"
                        ? rebuilt
                        : form.FormDefinitionJson;
                }
                catch
                {
                    formDefinition = form.FormDefinitionJson;
                }
            }

            return new ApprovalTaskDetailDto
            {
                Id = task.Id,
                WorkflowInstanceId = task.WorkflowInstanceId,
                AssignedTo = task.AssignedTo,
                Status = task.TaskStatus.ToString(),
                DueDate = task.DueDate,
                CreatedDate = task.CreatedDate,
                Comments = task.Comments,
                CompletedAt = task.CompletedAt,
                FormId = submission?.FormId,
                FormName = form?.FormName ?? "Unknown Form",
                FormDefinition = formDefinition,
                SubmissionId = submission?.Id,
                SubmittedBy = submission?.SubmittedBy.ToString(),
                SubmittedAt = submission?.SubmittedAt,
                SubmissionStatus = submission?.SubmissionStatus.ToString(),
                SubmissionData = submission?.SubmissionData?.Select(d => new
                {
                    fieldId = d.FieldId,
                    fieldName = d.Field?.FieldName,
                    fieldLabel = d.Field?.FieldLabel,
                    value = d.FieldValue
                }),
                IsOverdue = task.DueDate.HasValue && task.DueDate < DateTime.UtcNow && task.TaskStatus == ApprovalTaskStatus.Pending,
                Priority = CalculatePriority(task.DueDate, task.TaskStatus)
            };
        }

        public async Task<IEnumerable<ApprovalHistoryEntryDto>> GetApprovalHistoryAsync(Guid taskId)
        {
            var task = await _approvalRepository.GetByIdAsync(taskId);
            if (task == null)
                throw new KeyNotFoundException("Approval task not found");

            var history = await _approvalHistoryRepository.FindAsync(h => h.TaskId == task.Id);

            return history
                .OrderByDescending(h => h.ActionAt)
                .Select(entry => new ApprovalHistoryEntryDto
                {
                    Decision = NormalizeDecision(entry.Action),
                    DecidedBy = entry.ApprovedBy.ToString(),
                    DecidedAt = entry.ActionAt,
                    Comments = entry.Comments
                });
        }

        public async Task<IEnumerable<EnrichedApprovalTaskDto>> GetAllTasksAsync()
        {
            var tasks = await _approvalRepository.GetAllAsync();

            var (submissionLookup, formLookup) = await BatchLoadSubmissionsAndFormsAsync(tasks);

            var enrichedTasks = tasks.Select(task =>
            {
                var submission = task.WorkflowInstance?.Submission
                    ?? (task.WorkflowInstance != null && task.WorkflowInstance.SubmissionId.HasValue && submissionLookup.ContainsKey(task.WorkflowInstance.SubmissionId.Value)
                        ? submissionLookup[task.WorkflowInstance.SubmissionId.Value] : null);
                var form = submission?.Form
                    ?? (submission != null && formLookup.ContainsKey(submission.FormId)
                        ? formLookup[submission.FormId] : null);

                return new EnrichedApprovalTaskDto
                {
                    Id = task.Id,
                    WorkflowInstanceId = task.WorkflowInstanceId,
                    AssignedTo = task.AssignedTo,
                    Status = task.TaskStatus.ToString(),
                    DueDate = task.DueDate,
                    CreatedDate = task.CreatedDate,
                    FormId = submission?.FormId,
                    FormName = form?.FormName ?? "Unknown Form",
                    SubmissionId = submission?.Id
                };
            }).ToList();

            return enrichedTasks;
        }

        /// <summary>
        /// Batch-loads FormSubmission and Form entities for a collection of approval tasks,
        /// eliminating N+1 query patterns by loading all needed entities in two bulk queries.
        /// </summary>
        private async Task<(Dictionary<Guid, FormSubmission> submissions, Dictionary<Guid, Form> forms)>
            BatchLoadSubmissionsAndFormsAsync(IEnumerable<ApprovalTask> tasks)
        {
            // Collect submission IDs from tasks that have a loaded WorkflowInstance
            var submissionIds = tasks
                .Where(t => t.WorkflowInstance != null && t.WorkflowInstance.Submission == null && t.WorkflowInstance.SubmissionId.HasValue)
                .Select(t => t.WorkflowInstance.SubmissionId!.Value)
                .Distinct()
                .ToList();

            // Batch-load submissions with their SubmissionData and Field nav properties
            var submissions = submissionIds.Count > 0
                ? (await _submissionRepository.GetSubmissionsWithDataAsync(submissionIds))
                    .ToDictionary(s => s.Id)
                : new Dictionary<Guid, FormSubmission>();

            // Collect form IDs from already-loaded submissions + newly loaded submissions
            var formIds = tasks
                .Select(t =>
                {
                    var sub = t.WorkflowInstance?.Submission;
                    if (sub != null && sub.Form == null) return sub.FormId;
                    if (t.WorkflowInstance != null && t.WorkflowInstance.SubmissionId.HasValue && submissions.TryGetValue(t.WorkflowInstance.SubmissionId.Value, out var loadedSub))
                        return loadedSub.FormId;
                    return Guid.Empty;
                })
                .Where(id => id != Guid.Empty)
                .Distinct()
                .ToList();

            // Batch-load forms
            var forms = formIds.Count > 0
                ? (await _formRepository.FindAsync(f => formIds.Contains(f.Id)))
                    .ToDictionary(f => f.Id)
                : new Dictionary<Guid, Form>();

            return (submissions, forms);
        }

        private async Task<(FormSubmission? submission, Form? form)> ResolveSubmissionAndFormAsync(ApprovalTask task)
        {
            var submission = task.WorkflowInstance?.Submission ??
                (task.WorkflowInstance != null && task.WorkflowInstance.SubmissionId.HasValue
                    ? await _submissionRepository.GetSubmissionWithDataAsync(task.WorkflowInstance.SubmissionId.Value)
                    : null);

            var form = submission?.Form ?? (submission != null ? await _formRepository.GetByIdAsync(submission.FormId) : null);

            return (submission, form);
        }

        private static string CalculatePriority(DateTime? dueDate, ApprovalTaskStatus status)
        {
            if (status != ApprovalTaskStatus.Pending) return "none";
            if (!dueDate.HasValue) return "normal";

            var hoursUntilDue = (dueDate.Value - DateTime.UtcNow).TotalHours;
            if (hoursUntilDue < 0) return "critical";
            if (hoursUntilDue < 24) return "high";
            if (hoursUntilDue < 72) return "medium";
            return "normal";
        }

        private static string NormalizeDecision(string action)
        {
            if (string.IsNullOrWhiteSpace(action)) return "Unknown";
            return action.ToLowerInvariant() switch
            {
                "approve" or "approved" => "Approved",
                "reject" or "rejected" => "Rejected",
                "return" or "returned" => "Returned",
                _ => action
            };
        }
    }
}
