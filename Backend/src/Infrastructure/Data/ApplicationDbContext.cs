using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Entities.BetterAuth;
using WorkflowAutomation.Domain.Interfaces;

namespace WorkflowAutomation.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext, IUnitOfWork
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        // Better Auth tables (managed by EF Core migrations, used by Better Auth and .NET backend)
        public DbSet<AuthUser> AuthUsers { get; set; }
        public DbSet<AuthSession> AuthSessions { get; set; }
        public DbSet<AuthAccount> AuthAccounts { get; set; }
        public DbSet<AuthVerification> AuthVerifications { get; set; }

        // Application entities
        public DbSet<Form> Forms { get; set; }
        public DbSet<FormCategory> FormCategories { get; set; }
        public DbSet<FormVersionHistory> FormVersionHistories { get; set; }
        public DbSet<FormField> FormFields { get; set; }
        public DbSet<FormTemplate> FormTemplates { get; set; }
        public DbSet<FormSubmission> FormSubmissions { get; set; }
        public DbSet<Workflow> Workflows { get; set; }
        public DbSet<WorkflowNode> WorkflowNodes { get; set; }
        public DbSet<WorkflowEdge> WorkflowEdges { get; set; }
        public DbSet<WorkflowInstance> WorkflowInstances { get; set; }
        public DbSet<ApprovalTask> ApprovalTasks { get; set; }
        public DbSet<ApprovalHistory> ApprovalHistories { get; set; }
        public DbSet<ApprovalEscalationRule> ApprovalEscalationRules { get; set; }
        public DbSet<ApprovalEscalationHistory> ApprovalEscalationHistories { get; set; }
        public DbSet<CrossFieldValidationRule> CrossFieldValidationRules { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<NotificationPreference> NotificationPreferences { get; set; }
        public DbSet<NotificationTemplate> NotificationTemplates { get; set; }
        public DbSet<SystemSetting> SystemSettings { get; set; }
        public DbSet<FormSubmissionData> FormSubmissionData { get; set; }
        public DbSet<ApprovalStep> ApprovalSteps { get; set; }
        public DbSet<ApprovalStepAssignee> ApprovalStepAssignees { get; set; }
        public DbSet<WorkflowVersionHistory> WorkflowVersionHistories { get; set; }
        public DbSet<WorkflowExecutionLog> WorkflowExecutionLogs { get; set; }
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<FormPermission> FormPermissions { get; set; }
        public DbSet<SystemLog> SystemLogs { get; set; }
        public DbSet<ConditionGroup> ConditionGroups { get; set; }
        public DbSet<FormSubmissionAttachment> FormSubmissionAttachments { get; set; }
        public DbSet<FormCondition> FormConditions { get; set; }
        public DbSet<ConditionAction> ConditionActions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        }

        public async Task<int> CompleteAsync(CancellationToken cancellationToken = default)
        {
            return await SaveChangesAsync(cancellationToken);
        }
    }
}
