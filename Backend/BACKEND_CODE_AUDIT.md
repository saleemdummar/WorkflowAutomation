# Backend Code Audit Report

> **Scope:** All `.cs` files under `Backend/src/` (Api, Application, Domain, Infrastructure layers)  
> **Files reviewed:** 60+ across 19 controllers, 13 services, 6 repositories, 30+ entities, 23 interfaces  
> **Date:** June 2025

---

## Executive Summary

| Severity     | Count | Examples                                                                                                                                   |
| ------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **CRITICAL** | 4     | God classes, mixed JSON libs, memory-loading analytics, infrastructure leaking into API                                                    |
| **HIGH**     | 6     | Massive duplication (GetUserId, CurrentUserContext, PermissionRank, HasFormPermissionAsync), duplicate approval endpoints, sync-over-async |
| **MEDIUM**   | 8     | Inconsistent error handling, inline DTOs/helper classes, inconsistent entity init, swallowed exceptions                                    |
| **LOW**      | 5     | Naming inconsistencies, obsolete code, minor style issues                                                                                  |

---

## 1. Api Layer

### 1.1 Program.cs (395 lines)

| #   | Issue                                 | Severity | Lines    | Details                                                                                                                                                                   |
| --- | ------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **Monolithic bootstrap**              | MEDIUM   | 1–280    | All DI, auth, rate-limiting, Hangfire, policies in a single file. Extract into extension methods (`AddAuthPolicies()`, `AddRateLimiting()`, `AddHangfireConfig()`, etc.). |
| A2  | **20+ inline authorization policies** | MEDIUM   | L108–155 | Each policy is a nearly identical `p.RequireRole(...)` call. Extract to a policy configuration method or data-driven approach.                                            |
| A3  | **Auto-migration at startup**         | MEDIUM   | L239–249 | `Database.MigrateAsync()` runs on every start. Risk of unintended schema changes in production. Use a separate migration tool/pipeline.                                   |
| A4  | **Inline Hangfire filter classes**    | LOW      | L370–395 | `HangfireAuthorizationFilter` and `HangfireOpenAuthorizationFilter` are defined at file bottom. Move to dedicated files.                                                  |
| A5  | **Test user seeding in dev**          | LOW      | L252–265 | `TestUserSeeder` instantiated inline. Fine for dev, but keep it well-isolated.                                                                                            |

### 1.2 GetUserId() Duplication (9 Controllers)

| #   | Issue                                                   | Severity | Files                                                                                                                                                                                                                                                     | Details                                                                                                                                                                                                      |
| --- | ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A6  | **Identical `GetUserId()` copied across 9 controllers** | HIGH     | FormsController L24, SubmissionsController L28, WorkflowsController L29, ApprovalsController L39, CrossFieldValidationController L24, FormCategoriesController L24, FormTemplatesController L24, FormVersionsController L23, SystemSettingsController L23 | Exact same logic: `User.FindFirst("sub")?.Value ?? User.FindFirst(NameIdentifier)?.Value ?? throw`. **Fix:** Create a `BaseApiController` with this method, or use an extension method on `ClaimsPrincipal`. |
| A7  | **SubmissionsController has extra `GetUserGuid()`**     | LOW      | SubmissionsController L35–41                                                                                                                                                                                                                              | Adds Guid parsing. Also should live in shared base.                                                                                                                                                          |

### 1.3 Infrastructure Leaking into API Layer

| #   | Issue                                                    | Severity | File                      | Details                                                                                                           |
| --- | -------------------------------------------------------- | -------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| A8  | **AuditLogsController injects `ApplicationDbContext`**   | HIGH     | AuditLogsController L18   | Directly queries `_dbContext.AuditLogs` for entity types/actions (L70–85). Should go through `IAuditLogService`.  |
| A9  | **PerformanceController injects `ApplicationDbContext`** | HIGH     | PerformanceController L18 | Entire controller is raw EF queries (13 direct `_context.X` calls). Should use a dedicated `IPerformanceService`. |
| A10 | **UserProfileController injects `ApplicationDbContext`** | HIGH     | UserProfileController L20 | Writes directly to DB for updates. Bypasses repository/UoW pattern entirely.                                      |

### 1.4 ApprovalsController Issues

| #   | Issue                            | Severity | Lines                                               | Details                                                                                                                                                                                                                |
| --- | -------------------------------- | -------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A11 | **Duplicate approval endpoints** | HIGH     | L78–101 (`TakeAction`) and L103–131 (`ApproveTask`) | Both do the same thing: check status, call `_workflowEngine.HandleApprovalActionAsync()`, log. The only difference is `ApproveTask` uses `request.Approved` boolean → converts to string. Consolidate to one endpoint. |
| A12 | **Bypasses service layer**       | MEDIUM   | L27                                                 | Injects `IRepository<ApprovalTask>` directly into controller alongside `IApprovalService`. The approval task lookup at L79/L104 should be in the service.                                                              |
| A13 | **Audit log duplication**        | MEDIUM   | L89–97, L118–126                                    | Nearly identical audit logging blocks in both endpoints.                                                                                                                                                               |

### 1.5 Inconsistent Error Handling Across Controllers

| #   | Issue                                                                      | Severity | Details                                                                                                                                   |
| --- | -------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A14 | **FormsController.UpdateForm** catches 5 exception types                   | MEDIUM   | `KeyNotFoundException` → 404, `InvalidOperationException` → 400, `UnauthorizedAccessException` → 403, generic `Exception` → 500 (L68–87). |
| A15 | **WorkflowsController.UpdateWorkflow** catches only `KeyNotFoundException` | MEDIUM   | L69–76. No handling for `InvalidOperationException`, `UnauthorizedAccessException`, or generic errors.                                    |
| A16 | **SubmissionsController.SubmitForm** rethrows all exceptions\*\*           | MEDIUM   | L57–63. Logs then `throw;` — relies on global middleware. Inconsistent with other controllers that catch inline.                          |
| A17 | **No global standardized error response**                                  | MEDIUM   | Some return `{ message }`, others `{ errors }`, others `{ errors = ex.Message.Split('\n') }`. Adopt a unified `ProblemDetails` approach.  |

### 1.6 Inline DTOs and Helper Classes in Controllers

| #   | Issue                                                            | Severity | File                             | Details                                                                                 |
| --- | ---------------------------------------------------------------- | -------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| A18 | **`TransferOwnershipDto` defined in FormsController**            | LOW      | FormsController L381–384         | Should be in DTOs folder.                                                               |
| A19 | **`FileValidationResult`, `FieldFileConfig` in FilesController** | LOW      | FilesController (bottom)         | Helper classes embedded in controller file.                                             |
| A20 | **`CreateFormFromTemplateDto` in FormTemplatesController**       | LOW      | FormTemplatesController (bottom) | DTO defined inline.                                                                     |
| A21 | **Inline mapping in ApprovalEscalationController**               | MEDIUM   | ApprovalEscalationController     | ~40 lines of `MapToEntity`/`MapToDto` inline. Use AutoMapper or dedicated mapper class. |

### 1.7 Routing Inconsistencies

| #   | Issue                                                       | Severity | File                  | Details                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------- | -------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A22 | **Mixed nested + absolute routes in SubmissionsController** | MEDIUM   | SubmissionsController | Class route: `api/forms/{formId}/[controller]`. But L186 uses `[HttpGet("/api/submissions/my-submissions")]`, L194 uses `[HttpGet("/api/submissions/{id}")]`, L206 uses `[HttpGet("/api/submissions")]`. Mixing patterns is confusing. |

---

## 2. Application Layer (Services)

### 2.1 God Classes

| #   | Issue                    | Severity | File                 | LOC      | Details                                                                                                                                                                                                                                        |
| --- | ------------------------ | -------- | -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | **WorkflowEngine.cs**    | CRITICAL | WorkflowEngine.cs    | **1745** | Handles execution, node processing, approval actions, webhooks, email, retry, cancel, scheduled triggers, Jint evaluation. Should split into: `WorkflowExecutor`, `NodeProcessor`, `ApprovalHandler`, `ActionExecutor` (webhook/email/script). |
| B2  | **WorkflowService.cs**   | CRITICAL | WorkflowService.cs   | **1238** | CRUD, versioning, analytics, testing, import/export, graph sync, cloning, version comparison. Split into: `WorkflowCrudService`, `WorkflowVersionService`, `WorkflowAnalyticsService`, `WorkflowImportExportService`.                          |
| B3  | **SubmissionService.cs** | CRITICAL | SubmissionService.cs | **1183** | Submission, drafts, validation, workflow triggering, permission checks, data deserialization. Has **18 constructor dependencies** — a clear SRP violation. Split into: `SubmissionCrudService`, `DraftService`, `SubmissionValidationService`. |
| B4  | **FormService.cs**       | CRITICAL | FormService.cs       | **1048** | CRUD, publishing, archiving, versioning, field sync, import/export, lifecycle, scheduling. Split into: `FormCrudService`, `FormLifecycleService`, `FormImportExportService`.                                                                   |

### 2.2 Duplicated Code Between Services

| #   | Issue                                                         | Severity | Files                                                                                                                               | Details                                                                                                                                                                               |
| --- | ------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B5  | **`CurrentUserContext` class** duplicated                     | HIGH     | FormService L62, SubmissionService L78                                                                                              | Identical private sealed class with `UserId`, `UserName`, `UserEmail`, `UserRole`. **Fix:** Extract to a shared class (e.g., `Application/Common/CurrentUserContext.cs`).             |
| B6  | **`PermissionRank()` method** duplicated                      | HIGH     | FormService L97, SubmissionService L127                                                                                             | Nearly identical rank mapping (Admin=4, Edit=3, Submit=2, View=1). Minor signature difference (`string?` vs `string`). **Fix:** Extract to a static helper or shared service.         |
| B7  | **`HasFormPermissionAsync()` method** duplicated              | HIGH     | FormService L108, SubmissionService L220                                                                                            | Both do the same permission-checking logic against form permissions + ownership + role. 20+ call sites total. **Fix:** Extract to `IFormPermissionChecker` or similar shared service. |
| B8  | **Submission data deserialization pattern** repeated 5+ times | HIGH     | SubmissionService (GetMySubmissionsAsync, GetSubmissionsByFormAsync, GetAllSubmissionsAsync, GetDraftAsync, GetSubmissionByIdAsync) | Same JSON deserialization of `FormSubmissionData` into dictionary. **Fix:** Extract to a private helper or mapper method.                                                             |
| B9  | **`BuildWorkflowDefinition` logic** duplicated                | MEDIUM   | WorkflowService L509 (`BuildWorkflowDefinitionFromNormalizedAsync`) vs WorkflowEngine L67 (`BuildDefinitionFromNormalizedGraph`)    | Both reconstruct workflow definition JSON from normalized graph (nodes + edges). Different signatures/implementations. Consolidate into one shared method.                            |

### 2.3 Mixed JSON Libraries

| #   | Issue                         | Severity | Files                                                                                                                                                                                                               | Details                                                                                                                                                                                                                                                         |
| --- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B10 | **Newtonsoft.Json used**      | CRITICAL | WorkflowEngine.cs, WorkflowService.cs, FormVersionService.cs                                                                                                                                                        | `JObject`, `JArray`, `JsonConvert`, `Formatting.None`.                                                                                                                                                                                                          |
| B11 | **System.Text.Json used**     | —        | FormService.cs, SubmissionService.cs, FormConditionValidationService.cs, FormConditionNormalizationService.cs, CrossFieldValidationService.cs, FormPermissionService.cs, FormTemplateService.cs, FilesController.cs | `JsonSerializer`, `JsonDocument`, `JsonElement`.                                                                                                                                                                                                                |
| B12 | **WorkflowService uses BOTH** | CRITICAL | WorkflowService.cs L7-8, L833-835                                                                                                                                                                                   | Imports `Newtonsoft.Json` at top, but also uses `System.Text.Json.JsonSerializer.Deserialize` inline at L833. **Fix:** Standardize on one library. If Newtonsoft is needed for `JObject` manipulation, create a thin adapter layer. Never mix in the same file. |

### 2.4 Performance Issues

| #   | Issue                                                                                     | Severity | File                                            | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------- | -------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B13 | **`GetAnalyticsAsync` loads ALL data into memory**                                        | CRITICAL | WorkflowService L733–737                        | `var workflows = await _workflowRepository.GetAllAsync(); var instances = await _instanceRepository.GetAllAsync(); var logs = await _executionLogRepository.GetAllAsync();` — Loads every workflow, every instance, every log into memory, then filters in-memory with LINQ. For a production system with thousands of workflows and millions of logs, this will cause OOM errors. **Fix:** Push aggregation to SQL with `GROUP BY`, or use materialized views/caching. |
| B14 | **Repeated permission queries per operation**                                             | MEDIUM   | FormService, SubmissionService                  | `HasFormPermissionAsync` does a DB query to load all permissions for the form every time it's called. In endpoints that check permissions multiple times, this results in redundant DB calls. **Fix:** Cache permissions per-request.                                                                                                                                                                                                                                   |
| B15 | **`SyncWorkflowGraphAsync` deletes then recreates all nodes/edges**                       | MEDIUM   | WorkflowService ~L400–510                       | Drops all existing edges, then all nodes, then recreates from scratch. No diffing. For large workflows, this is wasteful and produces excessive DB churn.                                                                                                                                                                                                                                                                                                               |
| B16 | **`GetPerformanceMetricsAsync` still loads entities**                                     | MEDIUM   | SystemSettingsService L153-163                  | While it uses `CountAsync` for counts (good), it loads `completedInstances` with `FindAsync` into memory to compute averages (L153–158). Should use a raw SQL aggregation or repository method.                                                                                                                                                                                                                                                                         |
| B17 | **No pagination on `GetAllFormsAsync`, `GetAllWorkflowsAsync`, `GetAllSubmissionsAsync`** | MEDIUM   | FormService, WorkflowService, SubmissionService | These load all records. Fine for small datasets, will degrade over time.                                                                                                                                                                                                                                                                                                                                                                                                |

### 2.5 SOLID Violations

| #   | Issue                                                            | Severity | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B18 | **SRP: SubmissionService has 18 constructor dependencies**       | CRITICAL | `IFormRepository`, `IFormSubmissionRepository`, `IRepository<FormSubmissionData>`, `IRepository<Form>`, `IRepository<FormField>`, `IRepository<FormSubmission>`, `IRepository<FormPermission>`, `IWorkflowEngine`, `IWorkflowService`, `ICrossFieldValidationService`, `IJintExecutionService`, `IFormConditionValidationService`, `IUnitOfWork`, `IAuditLogService`, `INotificationHubService`, `IHttpContextAccessor`, `ILogger`, `IRepository<FormSubmissionAttachment>`. Each dependency signals a responsibility the class shouldn't own. |
| B19 | **OCP: WorkflowEngine node processing uses switch/case**         | MEDIUM   | WorkflowEngine `ExecuteNodeCoreAsync` switches on `NodeType` enum. Adding new node types requires modifying this class. **Fix:** Strategy pattern — `INodeHandler` per type, registered in DI.                                                                                                                                                                                                                                                                                                                                                 |
| B20 | **DIP: Application services depend on Newtonsoft.Json directly** | MEDIUM   | WorkflowEngine, WorkflowService, FormVersionService. These should depend on abstractions for JSON operations, not concrete library types.                                                                                                                                                                                                                                                                                                                                                                                                      |

### 2.6 Error Handling Issues in Services

| #   | Issue                                                    | Severity | File                                                                                                                                               | Details |
| --- | -------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| B21 | **Silent `catch` blocks**                                | MEDIUM   | FormVersionService L170–176 `CompareVersionsAsync`: catches all exceptions during JSON parsing and falls back silently. At minimum, log the error. |
| B22 | **WorkflowEngine swallows exceptions in node execution** | MEDIUM   | WorkflowEngine: some node execution failures are caught and logged but leave the workflow in an ambiguous state.                                   |
| B23 | **`[Obsolete]` method still present**                    | LOW      | SubmissionService `GetFieldIdsFromFormDefinition` marked `[Obsolete]` but not removed.                                                             |

---

## 3. Domain Layer

### 3.1 Entity Inconsistencies

| #   | Issue                                                 | Severity | File                                                                                                                                                                                                                                                                 | Details                                          |
| --- | ----------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| C1  | **Inconsistent collection initialization**            | MEDIUM   | `FormSubmission` initializes collections (`= new List<>()`), `FormField` does NOT initialize `ChildFields`, `TriggerConditions`, `TargetActions`, `SubmissionData`. `Workflow` entity does not initialize `Nodes`, `Edges`, etc. Can cause `NullReferenceException`. |
| C2  | **Nullable annotations inconsistent**                 | LOW      | `BaseAuditableEntity.CreatedBy` is `string` (non-nullable) but likely often null for system-created records. Should be `string?`. Same for `LastModifiedBy`.                                                                                                         |
| C3  | **`FormField.FieldType` is `string` instead of enum** | LOW      | FormField.cs L16                                                                                                                                                                                                                                                     | Reduces type safety. Could use `FieldType` enum. |

### 3.2 Interface Inconsistencies

| #   | Issue                                                               | Severity | File                             | Details                                                                                                                                                                               |
| --- | ------------------------------------------------------------------- | -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C4  | **`IApprovalEscalationRepository` doesn't extend `IRepository<T>`** | MEDIUM   | IApprovalEscalationRepository.cs | All other specialized repos (`IFormRepository`, `IWorkflowRepository`, `IApprovalRepository`, `IFormSubmissionRepository`) extend `IRepository<T>`. This one defines its own methods. |
| C5  | **`IUnitOfWork` is minimal**                                        | LOW      | IUnitOfWork.cs                   | Only has `Task<int> CompleteAsync()`. Consider adding `BeginTransactionAsync()` for multi-step operations.                                                                            |

---

## 4. Infrastructure Layer

### 4.1 Repository Issues

| #   | Issue                                                                     | Severity | File                                                               | Details                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **`GenericRepository.UpdateAsync` and `DeleteAsync` are sync-over-async** | MEDIUM   | GenericRepository L73, L79                                         | Return `Task.CompletedTask` but have async signatures. While EF `Remove()` is synchronous, this is misleading. Consider dropping the `Async` suffix or documenting the behavior.                          |
| D2  | **`ApprovalEscalationRepository` doesn't extend `GenericRepository`**     | MEDIUM   | ApprovalEscalationRepository.cs                                    | Defines its own `ApplicationDbContext` field and implements its own CRUD. Inconsistent with all other repositories.                                                                                       |
| D3  | **Field shadowing in specialized repositories**                           | LOW      | FormRepository L14, WorkflowRepository L14, ApprovalRepository L15 | Each declares `private readonly ApplicationDbContext _dbContext;` which shadows `GenericRepository._dbContext` (protected). This works but is unnecessary duplication. Use the inherited field or rename. |

### 4.2 Duplicate Entity Configuration Locations

| #   | Issue                         | Severity | Details                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ----------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D4  | **Two configuration folders** | HIGH     | `Infrastructure/Configuration/` (25 files) and `Infrastructure/Data/Configurations/` (8 files). Both contain EF `IEntityTypeConfiguration<T>` implementations. Some entities (e.g., `FormCategory`, `FormField`, `FormSubmission`, `NotificationPreference`) appear in the second folder but not the first. Conflicting or incomplete configurations possible. **Fix:** Consolidate into a single folder. |

### 4.3 DbContext Field Naming Inconsistency

| #   | Issue                          | Severity | Details                                                                                                                                                                                 |
| --- | ------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D5  | **`_dbContext` vs `_context`** | LOW      | Most infrastructure classes use `_dbContext` (11 occurrences). But `AuditLogService`, `ApprovalEscalationRepository`, `PerformanceController` use `_context` (3 occurrences). Pick one. |

---

## 5. Cross-Cutting Concerns

### 5.1 Missing or Inconsistent Logging

| #   | Issue                                                                     | Severity | Details                                                                                                                |
| --- | ------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| E1  | **SubmissionsController injects `ILogger`; most other controllers don't** | MEDIUM   | Inconsistent observability.                                                                                            |
| E2  | **Service layer logging is sparse**                                       | MEDIUM   | FormService, SubmissionService have minimal `_logger` usage. WorkflowEngine has better logging but still inconsistent. |

### 5.2 Missing Input Validation

| #   | Issue                                              | Severity | Details                                                                                                                                                                                              |
| --- | -------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E3  | **No FluentValidation or DataAnnotations on DTOs** | MEDIUM   | Request DTOs (e.g., `CreateFormDto`, `CreateWorkflowDto`, `FormSubmissionDto`) lack `[Required]`, `[MaxLength]`, etc. Validation happens deep in service layer, if at all. Move to model validation. |
| E4  | **No request size limits on JSON body endpoints**  | LOW      | Large form definitions or workflow definitions could be very large. Consider `[RequestSizeLimit]`.                                                                                                   |

### 5.3 Missing Caching

| #   | Issue                | Severity | Details                                                                                                                                                                                         |
| --- | -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E5  | **No caching layer** | MEDIUM   | Forms, workflows, system settings are re-queried on every request. `IMemoryCache` or distributed cache (`IDistributedCache`) would reduce DB load for frequently-accessed, rarely-changed data. |

---

## 6. Priority Refactoring Roadmap

### Phase 1: Quick Wins (1–2 days)

1. **Extract `BaseApiController`** with `GetUserId()` and `GetUserGuid()` — eliminates A6/A7 duplication across 9 controllers.
2. **Consolidate duplicate approval endpoints** (A11) — remove `ApproveTask`, keep `TakeAction`.
3. **Extract inline DTOs** (A18–A20) to proper DTO folders.
4. **Move `CurrentUserContext` + `PermissionRank`** (B5/B6) to shared location.

### Phase 2: Architecture Cleanup (3–5 days)

5. **Create `IFormPermissionChecker`** service — centralize `HasFormPermissionAsync` (B7), inject into both `FormService` and `SubmissionService`.
6. **Create `IPerformanceService`** — move PerformanceController DB queries behind service (A9).
7. **Consolidate EF configuration folders** (D4) into one.
8. **Standardize JSON library** (B10–B12) — either all Newtonsoft or all System.Text.Json.
9. **Fix `ApprovalEscalationRepository`** to extend `GenericRepository` (D2/C4).

### Phase 3: God Class Decomposition (1–2 weeks)

10. **Split `WorkflowEngine`** (B1) into `WorkflowExecutor`, `NodeProcessor`, `ApprovalHandler`, `ActionExecutor`.
11. **Split `WorkflowService`** (B2) into `WorkflowCrudService`, `WorkflowVersionService`, `WorkflowAnalyticsService`.
12. **Split `SubmissionService`** (B3) and reduce its 18 dependencies.
13. **Split `FormService`** (B4) into focused sub-services.

### Phase 4: Performance & Production Hardening (1 week)

14. **Fix `GetAnalyticsAsync` to use SQL aggregation** (B13) — highest-impact perf fix.
15. **Add pagination** to all `GetAll*` endpoints (B17).
16. **Add DTO validation** with FluentValidation or DataAnnotations (E3).
17. **Add caching** for forms, workflows, system settings (E5).
18. **Standardize error responses** across all controllers (A17).

---

## Appendix: Issue Count by File

| File                             | Issues                                 |
| -------------------------------- | -------------------------------------- |
| WorkflowEngine.cs                | B1, B9, B10, B19, B20, B22             |
| WorkflowService.cs               | B2, B9, B10, B12, B13, B15, B17, B20   |
| SubmissionService.cs             | B3, B5, B6, B7, B8, B14, B17, B18, B23 |
| FormService.cs                   | B4, B5, B6, B7, B14, B17               |
| ApprovalsController.cs           | A11, A12, A13                          |
| PerformanceController.cs         | A9                                     |
| AuditLogsController.cs           | A8                                     |
| UserProfileController.cs         | A10                                    |
| Program.cs                       | A1, A2, A3, A4, A5                     |
| SubmissionsController.cs         | A6, A7, A22                            |
| All 9 controllers with GetUserId | A6                                     |
| GenericRepository.cs             | D1                                     |
| ApprovalEscalationRepository.cs  | D2                                     |
| FormVersionService.cs            | B10, B21                               |
| SystemSettingsService.cs         | B16                                    |
