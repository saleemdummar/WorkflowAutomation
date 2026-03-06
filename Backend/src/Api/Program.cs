using Microsoft.EntityFrameworkCore;
using Hangfire;
using WorkflowAutomation.Api;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Infrastructure.Data;
using WorkflowAutomation.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "Workflow Automation API", Version = "v1" });
});

// CORS — read allowed origins from configuration (fixes P2-18)
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins(corsOrigins)
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials();
    });
});

// Infrastructure
builder.Services.AddDatabase(builder.Configuration);
builder.Services.AddRepositories();
builder.Services.AddApplicationServices();

// Auth
builder.Services.AddBetterAuth(builder.Configuration);

// SignalR
builder.Services.AddSignalR();

// Background jobs
builder.Services.AddHangfireServices(builder.Configuration);

// Health Checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>("database");

// Rate Limiting
builder.Services.AddRateLimiting();

var app = builder.Build();

// Apply migrations
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var appDb = services.GetRequiredService<ApplicationDbContext>();
        await appDb.Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
    }
}

// Seed test users (development only)
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        try
        {
            var adminService = services.GetRequiredService<IUserAdminService>();
            var logger = services.GetRequiredService<ILogger<Program>>();
            var seeder = new TestUserSeeder(adminService, services.GetRequiredService<ILoggerFactory>().CreateLogger<TestUserSeeder>());
            await seeder.SeedAsync();
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogWarning(ex, "Test user seeding failed (non-critical — auth tables may not exist yet).");
        }
    }
}

// Hangfire Dashboard — moved after auth middleware, configured below
// (Hangfire dashboard must be placed after UseAuthentication/UseAuthorization for auth filter to work)

// Schedule recurring Hangfire jobs using service-based API (not static RecurringJob)
var recurringJobManager = app.Services.GetRequiredService<IRecurringJobManager>();

recurringJobManager.AddOrUpdate<IApprovalEscalationService>(
    "process-approval-escalations",
    service => service.ProcessEscalationsAsync(),
    "*/15 * * * *"); // Check every 15 minutes

recurringJobManager.AddOrUpdate<IFormLifecycleService>(
    "process-scheduled-form-publishing",
    service => service.ProcessScheduledPublishingAsync(),
    "*/5 * * * *"); // Check every 5 minutes for scheduled publish/unpublish

recurringJobManager.AddOrUpdate<IWorkflowEngine>(
    "process-scheduled-workflow-triggers",
    engine => engine.ProcessScheduledTriggersAsync(),
    "* * * * *"); // Check every minute for scheduled workflow triggers

// Configure the HTTP request pipeline.
app.UseMiddleware<WorkflowAutomation.Api.Middleware.ExceptionHandlingMiddleware>();

if (!app.Environment.IsDevelopment())
{
    app.Use(async (context, next) =>
    {
        context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        await next();
    });
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowAll");

app.UseRateLimiter();

// Authentication & Authorization middleware (order matters!)
app.UseAuthentication();
app.UseMiddleware<WorkflowAutomation.Api.Middleware.UserProfileSyncMiddleware>();
app.UseAuthorization();

// Hangfire Dashboard — placed after auth middleware so auth filter can read HttpContext.User
if (app.Environment.IsDevelopment())
{
    // In development, allow all access (cross-origin cookies from frontend won't transmit to backend)
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = new[] { new HangfireOpenAuthorizationFilter() }
    });
}
else
{
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = new[] { new HangfireAuthorizationFilter() }
    });
}

// Ensure uploads directory exists
var uploadsPath = System.IO.Path.Combine(builder.Environment.ContentRootPath, "uploads");
if (!System.IO.Directory.Exists(uploadsPath))
{
    System.IO.Directory.CreateDirectory(uploadsPath);
}

app.MapControllers();

// Apply rate limiter policies to API controllers (fixes P2-19)
// The global limiter is already active; named policies "api" and "heavy"
// can be applied per-endpoint via [EnableRateLimiting("api")] attributes on controllers

// Map health check endpoint
app.MapHealthChecks("/health");

// Map SignalR Hub (requires authentication)
app.MapHub<WorkflowAutomation.Infrastructure.Hubs.NotificationHub>("/hubs/notifications")
    .RequireAuthorization();

app.MapGet("/", () => Results.Redirect("/swagger"));

app.Run();

/// <summary>
/// Hangfire dashboard authorization filter — restricts access to super-admin and admin roles.
/// </summary>
public class HangfireAuthorizationFilter : Hangfire.Dashboard.IDashboardAuthorizationFilter
{
    public bool Authorize(Hangfire.Dashboard.DashboardContext context)
    {
        var aspNetContext = context as Hangfire.Dashboard.AspNetCoreDashboardContext;
        if (aspNetContext == null) return false;
        var user = aspNetContext.HttpContext.User;
        return user.Identity?.IsAuthenticated == true
            && (user.IsInRole("super-admin") || user.IsInRole("admin"));
    }
}

/// <summary>
/// Development-only Hangfire dashboard filter — allows all access since
/// the frontend (localhost:3000) and backend (localhost:5121) are different origins
/// and session cookies won't be sent cross-origin.
/// </summary>
public class HangfireOpenAuthorizationFilter : Hangfire.Dashboard.IDashboardAuthorizationFilter
{
    public bool Authorize(Hangfire.Dashboard.DashboardContext context) => true;
}
