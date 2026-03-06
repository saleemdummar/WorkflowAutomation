using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowAutomation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MakeWorkflowInstanceSubmissionIdNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ApprovalHistories_ApprovalTasks_TaskId",
                table: "ApprovalHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_ApprovalSteps_Workflows_WorkflowId",
                table: "ApprovalSteps");

            migrationBuilder.DropForeignKey(
                name: "FK_ApprovalTasks_ApprovalSteps_StepId",
                table: "ApprovalTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_ApprovalTasks_WorkflowInstances_WorkflowInstanceId",
                table: "ApprovalTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_FormConditions_Forms_FormId",
                table: "FormConditions");

            migrationBuilder.DropForeignKey(
                name: "FK_FormSubmissionAttachments_FormSubmissions_FormSubmissionId",
                table: "FormSubmissionAttachments");

            migrationBuilder.DropForeignKey(
                name: "FK_FormSubmissionAttachments_FormSubmissions_SubmissionId",
                table: "FormSubmissionAttachments");

            migrationBuilder.DropForeignKey(
                name: "FK_FormSubmissions_Workflows_WorkflowId",
                table: "FormSubmissions");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkflowEdges_WorkflowNodes_SourceNodeId",
                table: "WorkflowEdges");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkflowEdges_WorkflowNodes_TargetNodeId",
                table: "WorkflowEdges");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkflowEdges_Workflows_WorkflowId",
                table: "WorkflowEdges");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkflowEdges_Workflows_WorkflowId1",
                table: "WorkflowEdges");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkflowExecutionLogs_WorkflowInstances_WorkflowInstanceId",
                table: "WorkflowExecutionLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkflowNodes_Workflows_WorkflowId",
                table: "WorkflowNodes");

            migrationBuilder.DropForeignKey(
                name: "FK_Workflows_Forms_FormId",
                table: "Workflows");

            migrationBuilder.DropIndex(
                name: "IX_Workflows_CreatedDate",
                table: "Workflows");

            migrationBuilder.DropIndex(
                name: "IX_WorkflowExecutionLogs_WorkflowInstanceId",
                table: "WorkflowExecutionLogs");

            migrationBuilder.DropIndex(
                name: "IX_WorkflowEdges_WorkflowId1",
                table: "WorkflowEdges");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_FormVersionHistories_CreatedAt",
                table: "FormVersionHistories");

            migrationBuilder.DropIndex(
                name: "IX_FormVersionHistories_FormId_VersionNumber",
                table: "FormVersionHistories");

            migrationBuilder.DropIndex(
                name: "IX_FormSubmissionAttachments_FormSubmissionId",
                table: "FormSubmissionAttachments");

            migrationBuilder.DropIndex(
                name: "IX_Forms_CreatedDate",
                table: "Forms");

            migrationBuilder.DropColumn(
                name: "WorkflowInstanceId",
                table: "WorkflowExecutionLogs");

            migrationBuilder.DropColumn(
                name: "WorkflowId1",
                table: "WorkflowEdges");

            migrationBuilder.DropColumn(
                name: "FormSubmissionId",
                table: "FormSubmissionAttachments");

            migrationBuilder.AlterColumn<int>(
                name: "WorkflowVersion",
                table: "Workflows",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValue: 1);

            migrationBuilder.AlterColumn<string>(
                name: "WorkflowName",
                table: "Workflows",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "WorkflowDescription",
                table: "Workflows",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AlterColumn<bool>(
                name: "IsPublished",
                table: "Workflows",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "Workflows",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "SubmissionId",
                table: "WorkflowInstances",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<string>(
                name: "Subject",
                table: "Notifications",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "ChangeDescription",
                table: "FormVersionHistories",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AlterColumn<bool>(
                name: "IsPublished",
                table: "Forms",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "Forms",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<int>(
                name: "FormVersion",
                table: "Forms",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValue: 1);

            migrationBuilder.AlterColumn<string>(
                name: "FormName",
                table: "Forms",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "FormDescription",
                table: "Forms",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AlterColumn<string>(
                name: "FieldName",
                table: "FormFields",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "FieldLabel",
                table: "FormFields",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500);

            migrationBuilder.AddForeignKey(
                name: "FK_ApprovalHistories_ApprovalTasks_TaskId",
                table: "ApprovalHistories",
                column: "TaskId",
                principalTable: "ApprovalTasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ApprovalSteps_Workflows_WorkflowId",
                table: "ApprovalSteps",
                column: "WorkflowId",
                principalTable: "Workflows",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ApprovalTasks_ApprovalSteps_StepId",
                table: "ApprovalTasks",
                column: "StepId",
                principalTable: "ApprovalSteps",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ApprovalTasks_WorkflowInstances_WorkflowInstanceId",
                table: "ApprovalTasks",
                column: "WorkflowInstanceId",
                principalTable: "WorkflowInstances",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FormConditions_Forms_FormId",
                table: "FormConditions",
                column: "FormId",
                principalTable: "Forms",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_FormSubmissionAttachments_FormSubmissions_SubmissionId",
                table: "FormSubmissionAttachments",
                column: "SubmissionId",
                principalTable: "FormSubmissions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_FormSubmissions_Workflows_WorkflowId",
                table: "FormSubmissions",
                column: "WorkflowId",
                principalTable: "Workflows",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkflowEdges_WorkflowNodes_SourceNodeId",
                table: "WorkflowEdges",
                column: "SourceNodeId",
                principalTable: "WorkflowNodes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkflowEdges_WorkflowNodes_TargetNodeId",
                table: "WorkflowEdges",
                column: "TargetNodeId",
                principalTable: "WorkflowNodes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkflowEdges_Workflows_WorkflowId",
                table: "WorkflowEdges",
                column: "WorkflowId",
                principalTable: "Workflows",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkflowNodes_Workflows_WorkflowId",
                table: "WorkflowNodes",
                column: "WorkflowId",
                principalTable: "Workflows",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Workflows_Forms_FormId",
                table: "Workflows",
                column: "FormId",
                principalTable: "Forms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ApprovalHistories_ApprovalTasks_TaskId",
                table: "ApprovalHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_ApprovalSteps_Workflows_WorkflowId",
                table: "ApprovalSteps");

            migrationBuilder.DropForeignKey(
                name: "FK_ApprovalTasks_ApprovalSteps_StepId",
                table: "ApprovalTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_ApprovalTasks_WorkflowInstances_WorkflowInstanceId",
                table: "ApprovalTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_FormConditions_Forms_FormId",
                table: "FormConditions");

            migrationBuilder.DropForeignKey(
                name: "FK_FormSubmissionAttachments_FormSubmissions_SubmissionId",
                table: "FormSubmissionAttachments");

            migrationBuilder.DropForeignKey(
                name: "FK_FormSubmissions_Workflows_WorkflowId",
                table: "FormSubmissions");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkflowEdges_WorkflowNodes_SourceNodeId",
                table: "WorkflowEdges");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkflowEdges_WorkflowNodes_TargetNodeId",
                table: "WorkflowEdges");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkflowEdges_Workflows_WorkflowId",
                table: "WorkflowEdges");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkflowNodes_Workflows_WorkflowId",
                table: "WorkflowNodes");

            migrationBuilder.DropForeignKey(
                name: "FK_Workflows_Forms_FormId",
                table: "Workflows");

            migrationBuilder.AlterColumn<int>(
                name: "WorkflowVersion",
                table: "Workflows",
                type: "int",
                nullable: false,
                defaultValue: 1,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "WorkflowName",
                table: "Workflows",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "WorkflowDescription",
                table: "Workflows",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<bool>(
                name: "IsPublished",
                table: "Workflows",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "Workflows",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<Guid>(
                name: "SubmissionId",
                table: "WorkflowInstances",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "WorkflowInstanceId",
                table: "WorkflowExecutionLogs",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "WorkflowId1",
                table: "WorkflowEdges",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Subject",
                table: "Notifications",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "ChangeDescription",
                table: "FormVersionHistories",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AddColumn<Guid>(
                name: "FormSubmissionId",
                table: "FormSubmissionAttachments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsPublished",
                table: "Forms",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "Forms",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<int>(
                name: "FormVersion",
                table: "Forms",
                type: "int",
                nullable: false,
                defaultValue: 1,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "FormName",
                table: "Forms",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "FormDescription",
                table: "Forms",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<string>(
                name: "FieldName",
                table: "FormFields",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "FieldLabel",
                table: "FormFields",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_CreatedDate",
                table: "Workflows",
                column: "CreatedDate");

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowExecutionLogs_WorkflowInstanceId",
                table: "WorkflowExecutionLogs",
                column: "WorkflowInstanceId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowEdges_WorkflowId1",
                table: "WorkflowEdges",
                column: "WorkflowId1");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notifications",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_FormVersionHistories_CreatedAt",
                table: "FormVersionHistories",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_FormVersionHistories_FormId_VersionNumber",
                table: "FormVersionHistories",
                columns: new[] { "FormId", "VersionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormSubmissionAttachments_FormSubmissionId",
                table: "FormSubmissionAttachments",
                column: "FormSubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_Forms_CreatedDate",
                table: "Forms",
                column: "CreatedDate");

            migrationBuilder.AddForeignKey(
                name: "FK_ApprovalHistories_ApprovalTasks_TaskId",
                table: "ApprovalHistories",
                column: "TaskId",
                principalTable: "ApprovalTasks",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ApprovalSteps_Workflows_WorkflowId",
                table: "ApprovalSteps",
                column: "WorkflowId",
                principalTable: "Workflows",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ApprovalTasks_ApprovalSteps_StepId",
                table: "ApprovalTasks",
                column: "StepId",
                principalTable: "ApprovalSteps",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ApprovalTasks_WorkflowInstances_WorkflowInstanceId",
                table: "ApprovalTasks",
                column: "WorkflowInstanceId",
                principalTable: "WorkflowInstances",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_FormConditions_Forms_FormId",
                table: "FormConditions",
                column: "FormId",
                principalTable: "Forms",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_FormSubmissionAttachments_FormSubmissions_FormSubmissionId",
                table: "FormSubmissionAttachments",
                column: "FormSubmissionId",
                principalTable: "FormSubmissions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_FormSubmissionAttachments_FormSubmissions_SubmissionId",
                table: "FormSubmissionAttachments",
                column: "SubmissionId",
                principalTable: "FormSubmissions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FormSubmissions_Workflows_WorkflowId",
                table: "FormSubmissions",
                column: "WorkflowId",
                principalTable: "Workflows",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkflowEdges_WorkflowNodes_SourceNodeId",
                table: "WorkflowEdges",
                column: "SourceNodeId",
                principalTable: "WorkflowNodes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkflowEdges_WorkflowNodes_TargetNodeId",
                table: "WorkflowEdges",
                column: "TargetNodeId",
                principalTable: "WorkflowNodes",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkflowEdges_Workflows_WorkflowId",
                table: "WorkflowEdges",
                column: "WorkflowId",
                principalTable: "Workflows",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkflowEdges_Workflows_WorkflowId1",
                table: "WorkflowEdges",
                column: "WorkflowId1",
                principalTable: "Workflows",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkflowExecutionLogs_WorkflowInstances_WorkflowInstanceId",
                table: "WorkflowExecutionLogs",
                column: "WorkflowInstanceId",
                principalTable: "WorkflowInstances",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkflowNodes_Workflows_WorkflowId",
                table: "WorkflowNodes",
                column: "WorkflowId",
                principalTable: "Workflows",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Workflows_Forms_FormId",
                table: "Workflows",
                column: "FormId",
                principalTable: "Forms",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
