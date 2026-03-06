# Workflow and Approval Analysis - Issues

Scope (reviewed files):
- Backend/README.md
- Backend/src/Application/Services/WorkflowService.cs
- Backend/src/Application/Services/WorkflowDefinitionService.cs
- Backend/src/Application/Services/WorkflowEngine.cs
- Backend/src/Application/Services/ApprovalService.cs
- Backend/src/Application/DTOs/Workflows/WorkflowTestDto.cs
- frontend/src/components/WorkflowDesigner/NodeProperties.tsx
- frontend/src/components/WorkflowDesigner/WorkflowTestingTool.tsx
- frontend/src/lib/api/workflows.ts
- frontend/src/lib/api/types.ts
- frontend/src/types/entities.ts

This document lists concrete gaps and issues in workflow and approval behavior vs the expectations in Backend/README.md (visual workflow creation, conditional logic, multi-step approvals, deadlines and escalation, validation/testing).

Resolution Summary (applied February 22, 2026):
- Enforced GUID node IDs on save and added backend validation to prevent invalid node IDs.
- Added schedule trigger cron configuration, validation, and basic cron matching in backend scheduler.
- Prevented approval nodes from being bypassed when no approvers resolve; auto-closed tasks now use `Skipped`.
- Improved condition evaluation with typed coercion and `fields["..."]` safe access in both frontend and backend.
- Updated test runner to respect conditional branches, support multi-step approvals, and accept JSON test data.
- Exposed escalation rule management from approval node properties via a direct link.
- Aligned workflow test result types between frontend and backend.

## Backend Issues

B1. Node ID handling breaks execution logs and progress when node IDs are not GUIDs (Resolved)
Current behavior:
- WorkflowEngine converts React Flow node IDs to Guid via Guid.TryParse in ExecuteNodeCoreAsync, LogNodeExecutionAsync, and uses CurrentNodeId (Guid?) on the WorkflowInstance.
- WorkflowService BuildExecutionSteps and GetExecutionProgress also depend on Guid parsing and log lookups by Guid.
Impact:
- If designer node IDs are not GUIDs (e.g., React Flow default IDs like "node-1"), Guid.TryParse fails and logs are saved under Guid.Empty. Progress and execution steps become inaccurate or collapsed into a single node.
Expected behavior (README):
- Execution logging, status tracking, and progress should reflect the actual visual graph nodes consistently.
Suggested fix:
- Use string node IDs end-to-end in execution logs and instance tracking, or enforce GUID IDs in the designer and validation.
Files:
- Backend/src/Application/Services/WorkflowEngine.cs
- Backend/src/Application/Services/WorkflowService.cs

B2. Approval node can be silently bypassed when no approvers resolve (Resolved)
Current behavior:
- CreateApprovalStepAndTasksAsync returns 0 when approvers resolve to an empty list; ExecuteApprovalNodeAsync then immediately continues the workflow.
Impact:
- A misconfigured approval node (or role/group with zero members) causes approvals to be skipped, violating the approval gate.
Expected behavior (README):
- Approval processes should enforce pending tasks or fail the workflow with a clear error.
Suggested fix:
- Treat zero approvers as a validation error and fail the workflow instance (or mark as "Failed") instead of continuing.
Files:
- Backend/src/Application/Services/WorkflowEngine.cs

B3. Approval rejection and closure semantics are inconsistent (Resolved)
Current behavior:
- ClosePendingStepTasksAsync sets remaining pending tasks to "Returned" when approval criteria is met.
- ShouldRejectStep for approvalType "any" requires all tasks rejected (not a single rejection).
Impact:
- "Returned" is semantically incorrect for auto-closed tasks.
- Rejection behavior is weaker than expected for "any" approval type.
Expected behavior (README):
- Clear approval status transitions, especially for rejection and closure.
Suggested fix:
- Introduce a distinct status like "Cancelled" or "Skipped" for auto-closed tasks.
- For approvalType "any", consider treating a single rejection as a rejection if that matches business rules.
Files:
- Backend/src/Application/Services/WorkflowEngine.cs

B4. Trigger types declared in UI are not fully supported in backend execution (Resolved)
Current behavior:
- WorkflowDefinitionService.ValidateTriggerConfig accepts "field_change" and "schedule".
- WorkflowEngine.TriggerWorkflowAsync only matches "form_submission" via IsTriggerMatch.
- ProcessScheduledTriggersAsync requires cronExpression but the validator does not require it.
Impact:
- Field change triggers never fire.
- Schedule triggers may be invalid yet pass validation and never run.
Expected behavior (README):
- Field change and scheduled triggers should execute as configured.
Suggested fix:
- Add backend handling for field_change events.
- Require and validate cronExpression for schedule triggers and parse it properly.
Files:
- Backend/src/Application/Services/WorkflowDefinitionService.cs
- Backend/src/Application/Services/WorkflowEngine.cs

B5. Workflow definitions are not fully validated on create/update (Resolved)
Current behavior:
- WorkflowService.ParseAndValidateDefinition only checks for a trigger node and JSON validity.
- Full validation (action/approval/condition config) occurs only at runtime via WorkflowDefinitionService.ValidateWorkflowDefinition.
Impact:
- Invalid workflows can be saved and later fail to execute, contradicting the README requirement for validation/testing.
Expected behavior (README):
- Workflow definitions should be validated at save time.
Suggested fix:
- Reuse WorkflowDefinitionService.ValidateWorkflowDefinition (or similar) during Create/Update to reject invalid definitions early.
Files:
- Backend/src/Application/Services/WorkflowService.cs
- Backend/src/Application/Services/WorkflowDefinitionService.cs

B6. Simple condition evaluation ignores data types and may mis-evaluate numbers/dates (Resolved)
Current behavior:
- EvaluateConditionAsync uses string values from submission data and compares with double parsing or string comparisons.
Impact:
- Date and numeric fields may be mis-evaluated if formatting differs or types are not normalized.
Expected behavior (README):
- Conditional logic should evaluate accurately across field types.
Suggested fix:
- Normalize field types from form definitions and coerce values before comparison.
Files:
- Backend/src/Application/Services/WorkflowEngine.cs

## Frontend Issues

F1. WorkflowTestingTool local simulation ignores conditional branching (Resolved)
Current behavior:
- buildExecutionPath walks all outgoing edges from trigger, with no condition evaluation or sourceHandle handling.
Impact:
- Test path shows nodes that would not execute in real runs, leading to false confidence.
Expected behavior (README):
- Testing should reflect actual conditional paths.
Suggested fix:
- Evaluate condition nodes and respect edge sourceHandle (true/false), optionally using test data.
Files:
- frontend/src/components/WorkflowDesigner/WorkflowTestingTool.tsx

F2. WorkflowTestingTool ignores multi-step approvals and approverType (Resolved)
Current behavior:
- simulateNodeExecution checks approvalConfig.approverId only at node root.
Impact:
- Multi-step approvals (steps[]) or role/group approvals appear as "No approver configured" even when configured.
Expected behavior (README):
- Test runner should validate approval node configuration accurately.
Suggested fix:
- Detect steps[] and approverType/approverId per step.
Files:
- frontend/src/components/WorkflowDesigner/WorkflowTestingTool.tsx

F3. UI exposes trigger types without required configuration (Resolved)
Current behavior:
- Trigger UI supports "Scheduled" and "Field Value Change" but does not expose cronExpression.
- Field change UI collects fieldId but backend does not implement field_change triggers.
Impact:
- Users can configure triggers that never run.
Expected behavior (README):
- Trigger configuration should be complete and executable.
Suggested fix:
- Add cronExpression input for schedule triggers.
- Either implement field_change in backend or hide it in UI until supported.
Files:
- frontend/src/components/WorkflowDesigner/NodeProperties.tsx
- Backend/src/Application/Services/WorkflowEngine.cs

F4. Approval escalation rules are not surfaced in UI (Resolved)
Current behavior:
- Backend contains ApprovalEscalationService and related entities, but the workflow designer does not expose escalation settings.
Impact:
- Escalation functionality is unreachable from the UI, despite README expectations.
Expected behavior (README):
- Approval deadline and escalation rules should be configurable.
Suggested fix:
- Add escalation rule configuration UI and wire it to backend APIs.
Files:
- frontend/src/components/WorkflowDesigner/NodeProperties.tsx
- Backend/src/Infrastructure/Services/ApprovalEscalationService.cs

F5. Condition "simple" mode can generate invalid expressions for non-identifier field names (Resolved)
Current behavior:
- Auto-generated JS uses raw field names (e.g., "Total Amount") as variables.
Impact:
- Generated expression is invalid JS, and backend Jint evaluation fails.
Expected behavior (README):
- Condition builder should produce valid expressions or safely map fields to identifiers.
Suggested fix:
- Map field names to safe identifiers or use a structured evaluation path instead of raw JS.
Files:
- frontend/src/components/WorkflowDesigner/NodeProperties.tsx
- Backend/src/Application/Services/WorkflowEngine.cs

F6. Encoding artifact in test runner UI (Resolved)
Current behavior:
- The warning text contains "⚠" which indicates a broken encoding for a warning symbol.
Expected behavior:
- Clean warning text or proper symbol.
Files:
- frontend/src/components/WorkflowDesigner/WorkflowTestingTool.tsx

## Cross-Cutting / Contract Issues

C1. WorkflowTestResult contract mismatch (Resolved)
Current behavior:
- Backend returns Success/Message/SimulatedSteps/ValidationErrors/Warnings.
- Frontend WorkflowTestResult type includes fields like errors, executionId, result, nodesExecuted.
Impact:
- Type mismatch can confuse consumers and cause unused or undefined UI fields.
Expected behavior:
- Frontend types should match backend DTOs.
Files:
- Backend/src/Application/DTOs/Workflows/WorkflowTestDto.cs
- frontend/src/lib/api/types.ts

C2. Save-time validation is weaker than runtime validation (Resolved)
Current behavior:
- Save allows invalid approval/condition configs; runtime execution fails.
Impact:
- Violates README expectation of robust validation and testing before execution.
Expected behavior:
- Validate workflows at save time with the same rules used at runtime.
Files:
- Backend/src/Application/Services/WorkflowService.cs
- Backend/src/Application/Services/WorkflowDefinitionService.cs
