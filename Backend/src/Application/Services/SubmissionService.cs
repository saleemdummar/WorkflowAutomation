using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Hangfire;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Interfaces;
using WorkflowAutomation.Application.DTOs.Forms;
using WorkflowAutomation.Domain.Enums;

namespace WorkflowAutomation.Application.Services
{
    public class SubmissionService : ISubmissionService
    {
        private readonly IRepository<FormSubmission> _submissionRepository;
        private readonly IRepository<Form> _formRepository;
        private readonly IRepository<FormField> _fieldRepository;
        private readonly IRepository<FormSubmissionData> _submissionDataRepository;
        private readonly IRepository<FormSubmissionAttachment> _attachmentRepository;
        private readonly IRepository<FormPermission> _formPermissionRepository;
        private readonly IRepository<WorkflowInstance> _workflowInstanceRepository;
        private readonly IRepository<UserProfile> _userProfileRepository;
        private readonly IWorkflowRepository _workflowRepository;
        private readonly IJintExecutionService _jintExecutionService;
        private readonly IFormConditionValidationService _conditionValidationService;
        private readonly IWorkflowEngine _workflowEngine;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IFormService _formService;
        private readonly IBackgroundJobClient _backgroundJobClient;
        private readonly ILogger<SubmissionService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public SubmissionService(
            IRepository<FormSubmission> submissionRepository,
            IRepository<Form> formRepository,
            IRepository<FormField> fieldRepository,
            IRepository<FormSubmissionData> submissionDataRepository,
            IRepository<FormSubmissionAttachment> attachmentRepository,
            IRepository<FormPermission> formPermissionRepository,
            IRepository<WorkflowInstance> workflowInstanceRepository,
            IRepository<UserProfile> userProfileRepository,
            IWorkflowRepository workflowRepository,
            IJintExecutionService jintExecutionService,
            IFormConditionValidationService conditionValidationService,
            IWorkflowEngine workflowEngine,
            IUnitOfWork unitOfWork,
            IFormService formService,
            IBackgroundJobClient backgroundJobClient,
            IHttpContextAccessor httpContextAccessor,
            ILogger<SubmissionService> logger)
        {
            _submissionRepository = submissionRepository;
            _formRepository = formRepository;
            _fieldRepository = fieldRepository;
            _submissionDataRepository = submissionDataRepository;
            _attachmentRepository = attachmentRepository;
            _formPermissionRepository = formPermissionRepository;
            _workflowInstanceRepository = workflowInstanceRepository;
            _userProfileRepository = userProfileRepository;
            _workflowRepository = workflowRepository;
            _jintExecutionService = jintExecutionService;
            _conditionValidationService = conditionValidationService;
            _workflowEngine = workflowEngine;
            _unitOfWork = unitOfWork;
            _formService = formService;
            _backgroundJobClient = backgroundJobClient;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        private sealed class CurrentUserContext
        {
            public string? UserId { get; set; }
            public HashSet<string> Roles { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        }

        private CurrentUserContext GetCurrentUserContext()
        {
            var context = new CurrentUserContext();
            var principal = _httpContextAccessor.HttpContext?.User as ClaimsPrincipal;
            if (principal == null || principal.Identity?.IsAuthenticated != true) return context;

            context.UserId = principal.FindFirst("sub")?.Value
                ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            foreach (var roleClaim in principal.FindAll(ClaimTypes.Role))
            {
                if (!string.IsNullOrWhiteSpace(roleClaim.Value))
                {
                    context.Roles.Add(roleClaim.Value.Trim());
                }
            }

            foreach (var roleClaim in principal.FindAll("role"))
            {
                if (string.IsNullOrWhiteSpace(roleClaim.Value)) continue;
                foreach (var role in roleClaim.Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    context.Roles.Add(role);
                }
            }

            return context;
        }

        /// <summary>
        /// Resolves user display names from UserProfile table by SubjectId (GUID string).
        /// Returns a dictionary mapping GUID string → display name.
        /// </summary>
        private async Task<Dictionary<string, string>> ResolveUserNamesAsync(IEnumerable<Guid> userGuids)
        {
            var subjectIds = userGuids.Select(g => g.ToString()).Distinct().ToList();
            var profiles = await _userProfileRepository.FindAsync(p => subjectIds.Contains(p.SubjectId));
            return profiles.ToDictionary(
                p => p.SubjectId,
                p => !string.IsNullOrWhiteSpace(p.DisplayName) ? p.DisplayName : p.Email
            );
        }

        private static int PermissionRank(string level)
        {
            return level?.ToLowerInvariant() switch
            {
                "admin" => 4,
                "edit" => 3,
                "submit" => 2,
                _ => 1
            };
        }

        private static IEnumerable<string> TryExtractFileIds(object value)
        {
            if (value == null) return Enumerable.Empty<string>();

            if (value is JsonElement jsonElement)
            {
                if (jsonElement.ValueKind == JsonValueKind.Array)
                {
                    return jsonElement.EnumerateArray()
                        .Where(e => e.ValueKind == JsonValueKind.String)
                        .Select(e => e.GetString() ?? string.Empty)
                        .Where(s => !string.IsNullOrWhiteSpace(s));
                }

                if (jsonElement.ValueKind == JsonValueKind.String)
                {
                    var single = jsonElement.GetString();
                    return string.IsNullOrWhiteSpace(single) ? Enumerable.Empty<string>() : new[] { single };
                }

                return Enumerable.Empty<string>();
            }

            if (value is IEnumerable<object> enumerable)
            {
                return enumerable.Select(v => v?.ToString() ?? string.Empty)
                    .Where(s => !string.IsNullOrWhiteSpace(s));
            }

            if (value is IEnumerable<string> stringEnumerable)
            {
                return stringEnumerable.Where(s => !string.IsNullOrWhiteSpace(s));
            }

            if (value is string str)
            {
                if (string.IsNullOrWhiteSpace(str)) return Enumerable.Empty<string>();

                if (str.TrimStart().StartsWith("["))
                {
                    try
                    {
                        var parsed = JsonSerializer.Deserialize<List<string>>(str);
                        return parsed?.Where(s => !string.IsNullOrWhiteSpace(s)) ?? Enumerable.Empty<string>();
                    }
                    catch
                    {
                        return Enumerable.Empty<string>();
                    }
                }

                return new[] { str };
            }

            return Enumerable.Empty<string>();
        }

        private static FormSubmissionAttachment? BuildAttachment(Guid submissionId, Guid fieldId, string fileId, Guid userGuid)
        {
            var safeFileId = Path.GetFileName(fileId);
            if (string.IsNullOrWhiteSpace(safeFileId)) return null;

            var fileName = safeFileId;
            var extension = Path.GetExtension(safeFileId);
            var fileType = string.IsNullOrWhiteSpace(extension)
                ? "application/octet-stream"
                : extension.TrimStart('.').ToLowerInvariant();

            return new FormSubmissionAttachment
            {
                Id = Guid.NewGuid(),
                SubmissionId = submissionId,
                FieldId = fieldId,
                FileName = fileName,
                FileSize = 0,
                FileType = fileType,
                FilePath = safeFileId,
                UploadedBy = userGuid,
                UploadedAt = DateTime.UtcNow
            };
        }

        private async Task<bool> HasFormPermissionAsync(Guid formId, string requiredLevel)
        {
            var current = GetCurrentUserContext();
            if (current.Roles.Contains("super-admin") || current.Roles.Contains("admin")) return true;
            if (string.IsNullOrWhiteSpace(current.UserId)) return true;

            var permissions = (await _formPermissionRepository.FindAsync(p => p.FormId == formId)).ToList();
            if (!permissions.Any()) return true;

            var requiredRank = PermissionRank(requiredLevel);
            Guid.TryParse(current.UserId, out var userGuid);

            foreach (var permission in permissions)
            {
                if (PermissionRank(permission.PermissionLevel) < requiredRank) continue;

                if (permission.UserId.HasValue && permission.UserId.Value == userGuid)
                {
                    return true;
                }

                if (!string.IsNullOrWhiteSpace(permission.RoleName) && current.Roles.Contains(permission.RoleName))
                {
                    return true;
                }
            }

            return false;
        }

        public async Task<FormSubmissionResult> SubmitFormAsync(Guid formId, FormSubmissionDto dto, string userId, Guid userGuid)
        {
            var result = new FormSubmissionResult();

            try
            {
                if (!await HasFormPermissionAsync(formId, "Submit"))
                {
                    result.Success = false;
                    result.Errors = new[] { "You do not have permission to submit this form" };
                    return result;
                }

                var form = await _formRepository.GetByIdAsync(formId);
                if (form == null)
                {
                    result.Success = false;
                    result.Errors = new[] { "Form not found" };
                    return result;
                }

                var availabilityError = GetFormSubmissionAvailabilityError(form);
                if (availabilityError != null)
                {
                    result.Success = false;
                    result.Errors = new[] { availabilityError };
                    return result;
                }


                await _formService.SyncFormFieldsAsync(formId, userId);

                if (string.IsNullOrWhiteSpace(dto.SubmissionData))
                {
                    result.Success = false;
                    result.Errors = new[] { "Submission data is required" };
                    return result;
                }

                Dictionary<string, object> submissionData;
                try
                {
                    submissionData = JsonSerializer.Deserialize<Dictionary<string, object>>(dto.SubmissionData,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                        ?? new Dictionary<string, object>();
                }
                catch
                {
                    result.Success = false;
                    result.Errors = new[] { "Invalid submission data format" };
                    return result;
                }

                var validationResult = await _conditionValidationService.ValidateFormSubmissionAsync(formId, submissionData);

                if (!validationResult.IsValid)
                {
                    result.Success = false;
                    result.Errors = validationResult.Errors;
                    return result;
                }

                foreach (var calc in validationResult.CalculatedValues)
                {
                    submissionData[calc.Key] = calc.Value;
                }

                foreach (var hiddenField in validationResult.HiddenFields)
                {
                    submissionData.Remove(hiddenField);
                }

                var submission = new FormSubmission
                {
                    FormId = formId,
                    SubmittedBy = userGuid,
                    SubmissionStatus = SubmissionStatus.Submitted,
                    SubmittedAt = DateTime.UtcNow,
                    CreatedBy = userId,
                    LastModifiedBy = userId,
                    LastModifiedDate = DateTime.UtcNow
                };

                await _submissionRepository.AddAsync(submission);
                await _unitOfWork.CompleteAsync();

                var attachmentsToPersist = new List<FormSubmissionAttachment>();

                foreach (var entry in submissionData)
                {
                    if (!Guid.TryParse(entry.Key, out var fieldId))
                    {
                        validationResult.Errors.Add($"Invalid field ID format: {entry.Key}");
                        continue;
                    }

                    // Validate field exists in the FormField table (normalized source of truth)
                    var validFields = await _fieldRepository.FindAsync(f => f.FormId == formId && f.Id == fieldId);
                    if (!validFields.Any())
                    {
                        validationResult.Errors.Add($"Field with ID {entry.Key} does not exist in form {formId}");
                        continue;
                    }

                    string fieldValue;
                    string valueType;

                    if (entry.Value == null)
                    {
                        fieldValue = "";
                        valueType = "Null";
                    }
                    else
                    {
                        // For arrays and objects, serialize to JSON
                        if (entry.Value is System.Collections.IEnumerable && !(entry.Value is string))
                        {
                            fieldValue = JsonSerializer.Serialize(entry.Value);
                            valueType = "JsonArray";
                        }
                        else if (entry.Value.GetType().IsClass && entry.Value.GetType() != typeof(string))
                        {
                            fieldValue = JsonSerializer.Serialize(entry.Value);
                            valueType = "JsonObject";
                        }
                        else
                        {
                            fieldValue = entry.Value.ToString() ?? "";
                            valueType = entry.Value.GetType().Name;
                        }
                    }

                    var submissionDataEntity = new FormSubmissionData
                    {
                        SubmissionId = submission.Id,
                        FieldId = fieldId,
                        FieldValue = fieldValue,
                        FieldValueType = valueType,
                        CreatedBy = userId,
                        CreatedDate = DateTime.UtcNow,
                        LastModifiedBy = userId,
                        LastModifiedDate = DateTime.UtcNow
                    };
                    await _submissionDataRepository.AddAsync(submissionDataEntity);

                    if (entry.Value != null)
                    {
                        try
                        {
                            var files = TryExtractFileIds(entry.Value);
                            foreach (var fileId in files)
                            {
                                var attachment = BuildAttachment(submission.Id, fieldId, fileId, userGuid);
                                if (attachment != null)
                                {
                                    attachmentsToPersist.Add(attachment);
                                }
                            }
                        }
                        catch
                        {
                            // Ignore malformed file values in payload
                        }
                    }
                }

                foreach (var attachment in attachmentsToPersist)
                {
                    await _attachmentRepository.AddAsync(attachment);
                }

                // Check for any validation errors that occurred during data processing
                if (validationResult.Errors.Any())
                {
                    // Rollback the submission if there were data validation errors
                    await _submissionRepository.DeleteAsync(submission);
                    await _unitOfWork.CompleteAsync();
                    result.Success = false;
                    result.Errors = validationResult.Errors;
                    return result;
                }

                await _unitOfWork.CompleteAsync();

                try
                {
                    _backgroundJobClient.Enqueue<IWorkflowEngine>(x => x.TriggerWorkflowAsync(submission.Id));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to trigger workflow for submission {SubmissionId}", submission.Id);
                }

                result.Success = true;
                result.SubmissionId = submission.Id;
                result.Message = "Form submitted successfully";
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SubmitFormAsync for form {FormId}", formId);
                result.Success = false;
                result.Errors = new[] { "An error occurred while processing the submission" };
                return result;
            }
        }

        public async Task<FormSubmissionResult> SaveDraftAsync(Guid formId, FormSubmissionDto dto, string userId, Guid userGuid)
        {
            var result = new FormSubmissionResult();

            try
            {
                if (!await HasFormPermissionAsync(formId, "Submit"))
                {
                    result.Success = false;
                    result.Errors = new[] { "You do not have permission to save draft for this form" };
                    return result;
                }

                var form = await _formRepository.GetByIdAsync(formId);
                if (form == null)
                {
                    result.Success = false;
                    result.Errors = new[] { "Form not found" };
                    return result;
                }

                if (string.IsNullOrWhiteSpace(dto.SubmissionData))
                {
                    result.Success = false;
                    result.Errors = new[] { "Submission data is required" };
                    return result;
                }

                Dictionary<string, object> submissionData;
                try
                {
                    submissionData = JsonSerializer.Deserialize<Dictionary<string, object>>(dto.SubmissionData,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                        ?? new Dictionary<string, object>();
                }
                catch
                {
                    result.Success = false;
                    result.Errors = new[] { "Invalid submission data format" };
                    return result;
                }

                var existingDrafts = await _submissionRepository.FindAsync(s =>
                    s.FormId == formId &&
                    (s.CreatedBy == userId || s.SubmittedBy == userGuid) &&
                    s.IsDraft);
                var existingDraft = dto.DraftId != null
                    ? existingDrafts.FirstOrDefault(s => s.Id.ToString() == dto.DraftId)
                    : existingDrafts.FirstOrDefault();

                FormSubmission submission;
                if (existingDraft != null)
                {
                    submission = existingDraft;
                    submission.DraftSavedAt = DateTime.UtcNow;
                    submission.LastModifiedBy = userId;
                    submission.LastModifiedDate = DateTime.UtcNow;
                    var draftData = (await _submissionDataRepository.FindAsync(d => d.SubmissionId == submission.Id)).ToList();
                    foreach (var data in draftData)
                    {
                        await _submissionDataRepository.DeleteAsync(data);
                    }
                }
                else
                {
                    submission = new FormSubmission
                    {
                        FormId = formId,
                        SubmissionStatus = SubmissionStatus.Draft,
                        IsDraft = true,
                        DraftSavedAt = DateTime.UtcNow,
                        SubmittedBy = userGuid,
                        CreatedBy = userId,
                        LastModifiedBy = userId,
                        LastModifiedDate = DateTime.UtcNow
                    };
                    await _submissionRepository.AddAsync(submission);
                }

                foreach (var kvp in submissionData)
                {
                    if (!Guid.TryParse(kvp.Key, out var fieldId))
                    {
                        continue;
                    }

                    string fieldValue;
                    string valueType;

                    if (kvp.Value == null)
                    {
                        fieldValue = "";
                        valueType = "Null";
                    }
                    else
                    {
                        // For arrays and objects, serialize to JSON
                        if (kvp.Value is System.Collections.IEnumerable && !(kvp.Value is string))
                        {
                            fieldValue = JsonSerializer.Serialize(kvp.Value);
                            valueType = "JsonArray";
                        }
                        else if (kvp.Value.GetType().IsClass && kvp.Value.GetType() != typeof(string))
                        {
                            fieldValue = JsonSerializer.Serialize(kvp.Value);
                            valueType = "JsonObject";
                        }
                        else
                        {
                            fieldValue = kvp.Value.ToString() ?? "";
                            valueType = kvp.Value.GetType().Name;
                        }
                    }

                    var submissionDataEntity = new FormSubmissionData
                    {
                        SubmissionId = submission.Id,
                        FieldId = fieldId,
                        FieldValue = fieldValue,
                        FieldValueType = valueType,
                        CreatedBy = userId,
                        CreatedDate = DateTime.UtcNow,
                        LastModifiedBy = userId,
                        LastModifiedDate = DateTime.UtcNow
                    };
                    await _submissionDataRepository.AddAsync(submissionDataEntity);
                }

                await _unitOfWork.CompleteAsync();

                result.Success = true;
                result.SubmissionId = submission.Id;
                result.Message = "Draft saved successfully";
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SaveDraftAsync for form {FormId}", formId);
                result.Success = false;
                result.Errors = new[] { "An error occurred while saving the draft" };
                return result;
            }
        }

        public async Task<IEnumerable<FormSubmission>> GetMyDraftsAsync(Guid formId, string userId, Guid userGuid)
        {
            if (!await HasFormPermissionAsync(formId, "View"))
            {
                return Enumerable.Empty<FormSubmission>();
            }

            var allSubmissions = await _submissionRepository.FindAsync(s =>
                s.FormId == formId &&
                (s.CreatedBy == userId || s.SubmittedBy == userGuid) &&
                s.IsDraft);
            return allSubmissions.OrderByDescending(s => s.DraftSavedAt).ToList();
        }

        public async Task<DraftResult> GetDraftAsync(Guid formId, Guid draftId, string userId, Guid userGuid)
        {
            var result = new DraftResult();

            try
            {
                if (!await HasFormPermissionAsync(formId, "View"))
                {
                    result.Success = false;
                    result.Errors = new[] { "You do not have permission to view drafts for this form" };
                    return result;
                }

                var draft = await _submissionRepository.GetByIdAsync(draftId);
                if (draft == null || draft.FormId != formId || !draft.IsDraft ||
                    (draft.CreatedBy != userId && draft.SubmittedBy != userGuid))
                {
                    result.Success = false;
                    result.Errors = new[] { "Draft not found" };
                    return result;
                }

                var form = await _formRepository.GetByIdAsync(formId);
                if (form == null)
                {
                    result.Success = false;
                    result.Errors = new[] { "Form not found" };
                    return result;
                }

                var availabilityError = GetFormSubmissionAvailabilityError(form);
                if (availabilityError != null)
                {
                    result.Success = false;
                    result.Errors = new[] { availabilityError };
                    return result;
                }

                var submissionDataEntries = (await _submissionDataRepository.FindAsync(d => d.SubmissionId == draft.Id))
                    .ToList();

                var dataMap = new Dictionary<string, object>();
                foreach (var entry in submissionDataEntries)
                {
                    object? value = entry.FieldValue ?? string.Empty;

                    // Deserialize based on type
                    if (entry.FieldValueType == "JsonArray" || entry.FieldValueType == "JsonObject")
                    {
                        try
                        {
                            value = JsonSerializer.Deserialize<object>(entry.FieldValue ?? "null");
                        }
                        catch
                        {
                            // If deserialization fails, keep as string
                            value = entry.FieldValue ?? string.Empty;
                        }
                    }

                    dataMap[entry.FieldId.ToString()] = value ?? string.Empty;
                }

                result.Success = true;
                result.Id = draft.Id;
                result.DraftSavedAt = draft.DraftSavedAt;
                result.SubmissionData = dataMap;
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDraftAsync for form {FormId}, draft {DraftId}", formId, draftId);
                result.Success = false;
                result.Errors = new[] { "An error occurred while retrieving the draft" };
                return result;
            }
        }

        public async Task<OperationResult> DeleteDraftAsync(Guid formId, Guid draftId, string userId, Guid userGuid)
        {
            var result = new OperationResult();

            try
            {
                if (!await HasFormPermissionAsync(formId, "Submit"))
                {
                    result.Success = false;
                    result.Errors = new[] { "You do not have permission to delete drafts for this form" };
                    return result;
                }

                var draft = await _submissionRepository.GetByIdAsync(draftId);

                if (draft == null || draft.FormId != formId || !draft.IsDraft ||
                    (draft.CreatedBy != userId && draft.SubmittedBy != userGuid))
                {
                    result.Success = false;
                    result.Errors = new[] { "Draft not found" };
                    return result;
                }

                await _submissionRepository.DeleteAsync(draft);
                await _unitOfWork.CompleteAsync();

                result.Success = true;
                result.Message = "Draft deleted successfully";
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DeleteDraftAsync for form {FormId}, draft {DraftId}", formId, draftId);
                result.Success = false;
                result.Errors = new[] { "An error occurred while deleting the draft" };
                return result;
            }
        }

        public async Task<FormSubmissionResult> SubmitDraftAsync(Guid formId, Guid draftId, string userId, Guid userGuid)
        {
            var result = new FormSubmissionResult();

            try
            {
                if (!await HasFormPermissionAsync(formId, "Submit"))
                {
                    result.Success = false;
                    result.Errors = new[] { "You do not have permission to submit drafts for this form" };
                    return result;
                }

                var draft = await _submissionRepository.GetByIdAsync(draftId);

                if (draft == null || draft.FormId != formId || !draft.IsDraft ||
                    (draft.CreatedBy != userId && draft.SubmittedBy != userGuid))
                {
                    result.Success = false;
                    result.Errors = new[] { "Draft not found" };
                    return result;
                }

                draft.IsDraft = false;
                draft.SubmissionStatus = SubmissionStatus.Submitted;
                draft.SubmittedAt = DateTime.UtcNow;
                draft.LastModifiedBy = userId;
                draft.LastModifiedDate = DateTime.UtcNow;

                await _unitOfWork.CompleteAsync();

                // Trigger workflow - if it fails, log but don't fail the submission
                try
                {
                    _backgroundJobClient.Enqueue<IWorkflowEngine>(x => x.TriggerWorkflowAsync(draft.Id));
                }
                catch (Exception ex)
                {
                    // Log the error but don't fail the submission
                    _logger.LogError(ex, "Failed to trigger workflow for draft submission {DraftId}", draft.Id);
                }

                result.Success = true;
                result.SubmissionId = draft.Id;
                result.Message = "Draft submitted successfully";
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SubmitDraftAsync for form {FormId}, draft {DraftId}", formId, draftId);
                result.Success = false;
                result.Errors = new[] { "An error occurred while submitting the draft" };
                return result;
            }
        }

        public async Task<IEnumerable<SubmissionDto>> GetMySubmissionsAsync(Guid userGuid)
        {
            var submissions = await _submissionRepository.FindAsync(s => s.SubmittedBy == userGuid && !s.IsDraft);
            var mySubmissions = submissions.OrderByDescending(s => s.SubmittedAt).ToList();

            var formIds = mySubmissions.Select(s => s.FormId).Distinct().ToList();
            var forms = await _formRepository.FindAsync(f => formIds.Contains(f.Id));
            var formNames = forms.ToDictionary(f => f.Id, f => f.FormName ?? "Untitled Form");
            var allFields = await _fieldRepository.FindAsync(f => formIds.Contains(f.FormId));
            var fieldLabelLookup = allFields.ToDictionary(f => f.Id, f => f.FieldLabel ?? f.FieldName ?? f.Id.ToString());

            var submissionIds = mySubmissions.Select(s => s.Id).ToList();
            var allDataEntries = await _submissionDataRepository.FindAsync(d => submissionIds.Contains(d.SubmissionId));
            var dataBySubmission = allDataEntries
                .GroupBy(d => d.SubmissionId)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Resolve user display names (fixes P2-13)
            var userNames = await ResolveUserNamesAsync(mySubmissions.Select(s => s.SubmittedBy));

            return mySubmissions.Select(s =>
            {
                var dataMap = new Dictionary<string, object>();
                if (dataBySubmission.TryGetValue(s.Id, out var entries))
                {
                    foreach (var entry in entries)
                    {
                        object? value = entry.FieldValue ?? string.Empty;

                        if (entry.FieldValueType == "JsonArray" || entry.FieldValueType == "JsonObject")
                        {
                            try
                            {
                                value = JsonSerializer.Deserialize<object>(entry.FieldValue ?? "null");
                            }
                            catch
                            {
                                value = entry.FieldValue ?? string.Empty;
                            }
                        }

                        var key = fieldLabelLookup.TryGetValue(entry.FieldId, out var label) ? label : entry.FieldId.ToString();
                        dataMap[key] = value ?? string.Empty;
                    }
                }

                var submitterId = s.SubmittedBy.ToString();
                return new SubmissionDto
                {
                    Id = s.Id,
                    FormId = s.FormId,
                    FormName = formNames.TryGetValue(s.FormId, out var name) ? name : "Untitled Form",
                    SubmittedBy = submitterId,
                    SubmitterName = userNames.TryGetValue(submitterId, out var displayName) ? displayName : submitterId,
                    SubmittedAt = s.SubmittedAt,
                    Status = s.SubmissionStatus.ToString(),
                    SubmissionData = JsonSerializer.Serialize(dataMap),
                    CreatedDate = s.CreatedDate,
                    LastModifiedDate = s.LastModifiedDate
                };
            });
        }

        private static string? GetFormSubmissionAvailabilityError(Form form)
        {
            if (form.IsArchived)
            {
                return "Form is archived and not accepting submissions";
            }

            if (!form.IsPublished)
            {
                return "Form is not published";
            }

            if (!form.IsActive)
            {
                return "Form is not active";
            }

            var now = DateTime.UtcNow;

            if (form.PublishDate.HasValue && form.PublishDate.Value > now)
            {
                return "Form is scheduled and not yet available";
            }

            if (form.UnpublishDate.HasValue && form.UnpublishDate.Value <= now)
            {
                return "Form is no longer accepting submissions";
            }

            if (form.ExpirationDate.HasValue && form.ExpirationDate.Value <= now)
            {
                return "Form has expired and is not accepting submissions";
            }

            return null;
        }

        public async Task<SubmissionDetail?> GetSubmissionByIdAsync(Guid id, string userId, Guid userGuid, bool allowAll = false)
        {
            var submission = await _submissionRepository.GetByIdAsync(id);
            if (submission == null)
            {
                return null;
            }

            if (!allowAll && submission.SubmittedBy != userGuid && submission.CreatedBy != userId)
            {
                return null;
            }

            var form = await _formRepository.GetByIdAsync(submission.FormId);
            var formName = form?.FormName ?? "Untitled Form";
            var formFields = form != null
                ? await _fieldRepository.FindAsync(f => f.FormId == form.Id)
                : new List<FormField>();
            var fields = formFields.ToDictionary(f => f.Id, f => f.FieldLabel ?? f.FieldName ?? f.Id.ToString());

            var dataEntries = await _submissionDataRepository.FindAsync(d => d.SubmissionId == submission.Id);
            var submissionDataEntries = dataEntries.ToList();
            var dataMap = new Dictionary<string, object>();

            foreach (var entry in submissionDataEntries)
            {
                var key = entry.FieldId.ToString();
                object? value = entry.FieldValue ?? string.Empty;

                // Deserialize based on type
                if (entry.FieldValueType == "JsonArray" || entry.FieldValueType == "JsonObject")
                {
                    try
                    {
                        value = JsonSerializer.Deserialize<object>(entry.FieldValue ?? "null");
                    }
                    catch
                    {
                        // If deserialization fails, keep as string
                        value = entry.FieldValue ?? string.Empty;
                    }
                }

                dataMap[key] = value ?? string.Empty;
            }

            return new SubmissionDetail
            {
                Id = submission.Id,
                FormId = submission.FormId,
                FormName = formName,
                SubmittedBy = submission.SubmittedBy.ToString(),
                SubmittedAt = submission.SubmittedAt,
                Status = submission.SubmissionStatus.ToString(),
                SubmissionData = JsonSerializer.Serialize(dataMap),
                WorkflowExecutions = await GetWorkflowExecutionsForSubmission(submission.Id)
            };
        }

        public async Task<IEnumerable<SubmissionDto>> GetSubmissionsByFormAsync(Guid formId, string userId, Guid userGuid, bool allowAll = false)
        {
            if (!allowAll && !await HasFormPermissionAsync(formId, "View"))
            {
                return Enumerable.Empty<SubmissionDto>();
            }

            var submissions = await _submissionRepository.FindAsync(s => s.FormId == formId && !s.IsDraft);
            var filtered = allowAll
                ? submissions
                : submissions.Where(s => s.SubmittedBy == userGuid || s.CreatedBy == userId);

            var ordered = filtered.OrderByDescending(s => s.SubmittedAt).ToList();
            if (!ordered.Any()) return Enumerable.Empty<SubmissionDto>();

            var form = await _formRepository.GetByIdAsync(formId);
            var formName = form?.FormName ?? "Untitled Form";

            // Load field labels from normalized FormField table for human-readable keys
            var formFields = await _fieldRepository.FindAsync(f => f.FormId == formId);
            var fieldLabelLookup = formFields.ToDictionary(f => f.Id, f => f.FieldLabel ?? f.FieldName ?? f.Id.ToString());

            var submissionIds = ordered.Select(s => s.Id).ToList();
            var allDataEntries = await _submissionDataRepository.FindAsync(d => submissionIds.Contains(d.SubmissionId));
            var dataBySubmission = allDataEntries
                .GroupBy(d => d.SubmissionId)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Resolve user display names (fixes P2-13)
            var userNames = await ResolveUserNamesAsync(ordered.Select(s => s.SubmittedBy));

            return ordered.Select(s =>
            {
                var dataMap = new Dictionary<string, object>();
                if (dataBySubmission.TryGetValue(s.Id, out var entries))
                {
                    foreach (var entry in entries)
                    {
                        object? value = entry.FieldValue ?? string.Empty;
                        if (entry.FieldValueType == "JsonArray" || entry.FieldValueType == "JsonObject")
                        {
                            try
                            {
                                value = JsonSerializer.Deserialize<object>(entry.FieldValue ?? "null");
                            }
                            catch
                            {
                                value = entry.FieldValue ?? string.Empty;
                            }
                        }

                        var key = fieldLabelLookup.TryGetValue(entry.FieldId, out var label) ? label : entry.FieldId.ToString();
                        dataMap[key] = value ?? string.Empty;
                    }
                }

                var submitterId = s.SubmittedBy.ToString();
                return new SubmissionDto
                {
                    Id = s.Id,
                    FormId = s.FormId,
                    FormName = formName,
                    SubmittedBy = submitterId,
                    SubmitterName = userNames.TryGetValue(submitterId, out var displayName) ? displayName : submitterId,
                    SubmittedAt = s.SubmittedAt,
                    Status = s.SubmissionStatus.ToString(),
                    SubmissionData = JsonSerializer.Serialize(dataMap),
                    CreatedDate = s.CreatedDate,
                    LastModifiedDate = s.LastModifiedDate
                };
            });
        }

        private async Task<List<WorkflowExecutionInfo>> GetWorkflowExecutionsForSubmission(Guid submissionId)
        {
            var instances = await _workflowInstanceRepository.FindAsync(i => i.SubmissionId == submissionId);
            if (!instances.Any()) return new List<WorkflowExecutionInfo>();

            var result = new List<WorkflowExecutionInfo>();
            foreach (var instance in instances.OrderByDescending(i => i.StartedAt))
            {
                var workflow = await _workflowRepository.GetByIdAsync(instance.WorkflowId);
                result.Add(new WorkflowExecutionInfo
                {
                    InstanceId = instance.Id,
                    WorkflowId = instance.WorkflowId,
                    WorkflowName = workflow?.WorkflowName ?? "Unknown Workflow",
                    Status = instance.InstanceStatus.ToString(),
                    StartedAt = instance.StartedAt,
                    CompletedAt = instance.CompletedAt,
                    ErrorMessage = instance.ErrorMessage
                });
            }
            return result;
        }

        public async Task<IEnumerable<SubmissionDto>> GetAllSubmissionsAsync()
        {
            var submissions = await _submissionRepository.FindAsync(s => !s.IsDraft);
            var allSubmissions = submissions.OrderByDescending(s => s.SubmittedAt).ToList();

            var formIds = allSubmissions.Select(s => s.FormId).Distinct().ToList();
            var forms = await _formRepository.FindAsync(f => formIds.Contains(f.Id));
            var formNames = forms.ToDictionary(f => f.Id, f => f.FormName ?? "Untitled Form");

            // Load field labels from normalized FormField table for human-readable keys
            var allFields = await _fieldRepository.FindAsync(f => formIds.Contains(f.FormId));
            var fieldLabelLookup = allFields.ToDictionary(f => f.Id, f => f.FieldLabel ?? f.FieldName ?? f.Id.ToString());

            var submissionIds = allSubmissions.Select(s => s.Id).ToList();
            var allDataEntries = await _submissionDataRepository.FindAsync(d => submissionIds.Contains(d.SubmissionId));
            var dataBySubmission = allDataEntries
                .GroupBy(d => d.SubmissionId)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Resolve user display names (fixes P2-13)
            var userNames = await ResolveUserNamesAsync(allSubmissions.Select(s => s.SubmittedBy));

            return allSubmissions.Select(s =>
            {
                var dataMap = new Dictionary<string, object>();
                if (dataBySubmission.TryGetValue(s.Id, out var entries))
                {
                    foreach (var entry in entries)
                    {
                        object? value = entry.FieldValue ?? string.Empty;

                        // Deserialize based on type
                        if (entry.FieldValueType == "JsonArray" || entry.FieldValueType == "JsonObject")
                        {
                            try
                            {
                                value = JsonSerializer.Deserialize<object>(entry.FieldValue ?? "null");
                            }
                            catch
                            {
                                // If deserialization fails, keep as string
                                value = entry.FieldValue ?? string.Empty;
                            }
                        }

                        var key = fieldLabelLookup.TryGetValue(entry.FieldId, out var label) ? label : entry.FieldId.ToString();
                        dataMap[key] = value ?? string.Empty;
                    }
                }

                var submitterId = s.SubmittedBy.ToString();
                return new SubmissionDto
                {
                    Id = s.Id,
                    FormId = s.FormId,
                    FormName = formNames.TryGetValue(s.FormId, out var name) ? name : "Untitled Form",
                    SubmittedBy = submitterId,
                    SubmitterName = userNames.TryGetValue(submitterId, out var displayName) ? displayName : submitterId,
                    SubmittedAt = s.SubmittedAt,
                    Status = s.SubmissionStatus.ToString(),
                    SubmissionData = JsonSerializer.Serialize(dataMap),
                    CreatedDate = s.CreatedDate,
                    LastModifiedDate = s.LastModifiedDate
                };
            });
        }

        public async Task<IEnumerable<DraftSummary>> GetAllDraftsAsync(string userId, Guid userGuid)
        {
            var allSubmissions = await _submissionRepository.FindAsync(s =>
                (s.CreatedBy == userId || s.SubmittedBy == userGuid) &&
                s.IsDraft);
            var drafts = allSubmissions.OrderByDescending(s => s.DraftSavedAt).ToList();

            var formIds = drafts.Select(s => s.FormId).Distinct().ToList();
            var forms = await _formRepository.FindAsync(f => formIds.Contains(f.Id));
            var formNames = forms.ToDictionary(f => f.Id, f => f.FormName ?? "Untitled Form");

            return drafts.Select(s => new DraftSummary
            {
                Id = s.Id,
                FormId = s.FormId,
                FormName = formNames.TryGetValue(s.FormId, out var name) ? name : "Untitled Form",
                DraftSavedAt = s.DraftSavedAt
            });
        }

        public async Task<FormSubmission?> GetSubmissionAsync(Guid formId, Guid id)
        {
            if (!await HasFormPermissionAsync(formId, "View"))
                return null;

            var submission = await _submissionRepository.GetByIdAsync(id);
            if (submission == null || submission.FormId != formId)
                return null;

            return submission;
        }

        /// <summary>
        /// Gets valid field IDs from the FormField table (normalized source of truth).
        /// Falls back to parsing FormDefinitionJson if table query fails.
        /// </summary>
        private async Task<HashSet<Guid>> GetFieldIdsFromFormAsync(Guid formId)
        {
            var fields = await _fieldRepository.FindAsync(f => f.FormId == formId);
            return fields.Select(f => f.Id).ToHashSet();
        }

        [Obsolete("Use GetFieldIdsFromFormAsync instead - reads from normalized FormField table")]
        private HashSet<Guid> GetFieldIdsFromFormDefinition(string formDefinitionJson)
        {
            var fieldIds = new HashSet<Guid>();
            if (string.IsNullOrWhiteSpace(formDefinitionJson))
                return fieldIds;

            try
            {
                var formElements = JsonSerializer.Deserialize<List<FormElementDto>>(formDefinitionJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (formElements != null)
                {
                    foreach (var element in formElements)
                    {
                        if (Guid.TryParse(element.Id, out var fieldId))
                        {
                            fieldIds.Add(fieldId);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse form definition JSON for field IDs");
            }

            return fieldIds;
        }
    }
}