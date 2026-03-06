using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using System.Threading.RateLimiting;
using Hangfire;
using Hangfire.SqlServer;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Application.Services;
using WorkflowAutomation.Domain.Interfaces;
using WorkflowAutomation.Infrastructure.Data;
using WorkflowAutomation.Infrastructure.Repositories;
using WorkflowAutomation.Infrastructure.Services;

namespace WorkflowAutomation.Api;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        return services;
    }

    public static IServiceCollection AddRepositories(this IServiceCollection services)
    {
        services.AddScoped(typeof(IRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IFormRepository, FormRepository>();
        services.AddScoped<IWorkflowRepository, WorkflowRepository>();
        services.AddScoped<IApprovalRepository, ApprovalRepository>();
        services.AddScoped<IApprovalEscalationRepository, ApprovalEscalationRepository>();
        services.AddScoped<IFormSubmissionRepository, FormSubmissionRepository>();
        services.AddScoped<IUnitOfWork>(provider => provider.GetService<ApplicationDbContext>()!);
        return services;
    }

    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IFormService, FormService>();
        services.AddScoped<IFormLifecycleService, FormLifecycleService>();
        services.AddScoped<ICrossFieldValidationService, CrossFieldValidationService>();
        services.AddScoped<IWorkflowService, WorkflowService>();
        services.AddScoped<IFormCategoryService, FormCategoryService>();
        services.AddScoped<IFormTemplateService, FormTemplateService>();
        services.AddScoped<IFormVersionService, FormVersionService>();
        services.AddScoped<IJintExecutionService, JintExecutionService>();
        services.AddScoped<IFormConditionValidationService, FormConditionValidationService>();
        services.AddScoped<IFormConditionNormalizationService, FormConditionNormalizationService>();
        services.AddScoped<IWorkflowDefinitionService, WorkflowDefinitionService>();
        services.AddScoped<IWorkflowEngine, WorkflowEngine>();
        services.AddSingleton<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<INotificationHubService, NotificationHubService>();
        services.AddScoped<IApprovalEscalationService, ApprovalEscalationService>();
        services.AddScoped<INotificationStore, EfNotificationStore>();
        services.AddScoped<ISystemSettingsService, SystemSettingsService>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<ISystemLogService, SystemLogService>();
        services.AddScoped<IFormPermissionService, FormPermissionService>();
        services.AddScoped<IApprovalService, ApprovalService>();
        services.AddScoped<ISubmissionService, SubmissionService>();
        services.AddSingleton<IBackgroundJobService, BackgroundJobService>();
        services.AddScoped<IUserProfileSyncService, UserProfileSyncService>();
        services.AddScoped<IUserAdminService, BetterAuthUserAdminService>();
        services.AddScoped<IPerformanceService, PerformanceService>();
        services.AddHttpContextAccessor();

        services.AddHttpClient("WebhookClient", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        return services;
    }

    public static IServiceCollection AddBetterAuth(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection connection string not configured");

        services.AddAuthentication("BetterAuth")
            .AddScheme<BetterAuthSessionOptions, BetterAuthSessionHandler>("BetterAuth", options =>
            {
                options.ConnectionString = connectionString;
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("UserManagement", p =>
                p.RequireRole("super-admin", "workflow-designer", "approver"));

            options.AddPolicy("SystemSettings", p =>
                p.RequireRole("super-admin", "admin"));

            options.AddPolicy("AuditLogs", p =>
                p.RequireRole("super-admin", "admin"));

            options.AddPolicy("FormCreate", p =>
                p.RequireRole("super-admin", "admin", "form-designer"));

            options.AddPolicy("FormEditAny", p =>
                p.RequireRole("super-admin", "admin"));

            options.AddPolicy("FormDelete", p =>
                p.RequireRole("super-admin", "admin"));

            options.AddPolicy("FormPublish", p =>
                p.RequireRole("super-admin", "admin", "form-designer"));

            options.AddPolicy("FormViewAll", p =>
                p.RequireRole("super-admin", "admin", "form-designer", "workflow-designer", "approver"));

            options.AddPolicy("FormSubmit", p =>
                p.RequireRole("super-admin", "admin", "form-designer", "workflow-designer", "approver", "submitter"));

            options.AddPolicy("CategoryManage", p =>
                p.RequireRole("super-admin", "admin", "form-designer"));

            options.AddPolicy("TemplateManage", p =>
                p.RequireRole("super-admin", "admin", "form-designer"));

            options.AddPolicy("WorkflowCreate", p =>
                p.RequireRole("super-admin", "admin", "workflow-designer"));

            options.AddPolicy("WorkflowEdit", p =>
                p.RequireRole("super-admin", "admin", "workflow-designer"));

            options.AddPolicy("WorkflowDelete", p =>
                p.RequireRole("super-admin", "admin"));

            options.AddPolicy("WorkflowView", p =>
                p.RequireRole("super-admin", "admin", "form-designer", "workflow-designer", "approver"));

            options.AddPolicy("ApprovalAct", p =>
                p.RequireRole("super-admin", "admin", "approver"));

            options.AddPolicy("ApprovalViewAll", p =>
                p.RequireRole("super-admin", "admin"));

            options.AddPolicy("SubmissionViewAll", p =>
                p.RequireRole("super-admin", "admin"));

            options.AddPolicy("EscalationManage", p =>
                p.RequireRole("super-admin", "admin", "workflow-designer"));

            options.AddPolicy("CrossFieldValidation", p =>
                p.RequireRole("super-admin", "admin", "form-designer"));
        });

        return services;
    }

    public static IServiceCollection AddHangfireServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHangfire(config => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseSqlServerStorage(configuration.GetConnectionString("DefaultConnection")));

        services.AddHangfireServer();

        return services;
    }

    public static IServiceCollection AddRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            // Global limiter: 100 requests per minute per IP
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = 100,
                        QueueLimit = 10,
                        Window = TimeSpan.FromMinutes(1)
                    }));

            // API endpoints limiter
            options.AddSlidingWindowLimiter("api", limiterOptions =>
            {
                limiterOptions.AutoReplenishment = true;
                limiterOptions.PermitLimit = 200;
                limiterOptions.Window = TimeSpan.FromMinutes(1);
                limiterOptions.SegmentsPerWindow = 4;
                limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                limiterOptions.QueueLimit = 20;
            });

            // Concurrency limiter for heavy operations (file uploads, exports)
            options.AddConcurrencyLimiter("heavy", limiterOptions =>
            {
                limiterOptions.PermitLimit = 5;
                limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                limiterOptions.QueueLimit = 10;
            });

            options.OnRejected = async (context, token) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.HttpContext.Response.ContentType = "application/json";

                var response = new
                {
                    StatusCode = 429,
                    Message = "Too many requests. Please try again later.",
                    RetryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
                        ? retryAfter.TotalSeconds
                        : 60
                };

                await context.HttpContext.Response.WriteAsJsonAsync(response, token);
            };
        });

        return services;
    }
}
