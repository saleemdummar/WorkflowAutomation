using System;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WorkflowAutomation.Application.DTOs;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Domain.Enums;
using WorkflowAutomation.Infrastructure.Data;

namespace WorkflowAutomation.Infrastructure.Services
{
    public class PerformanceService : IPerformanceService
    {
        private readonly ApplicationDbContext _context;

        public PerformanceService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<PerformanceMetricsDto> GetMetricsAsync()
        {
            var process = Process.GetCurrentProcess();

            // Database counts
            var formCount = await _context.Forms.CountAsync();
            var workflowCount = await _context.Workflows.CountAsync();
            var submissionCount = await _context.FormSubmissions.CountAsync();
            var activeInstances = await _context.WorkflowInstances.CountAsync(i => i.InstanceStatus == WorkflowInstanceStatus.Running);
            var pendingApprovals = await _context.ApprovalTasks.CountAsync(t => t.TaskStatus == ApprovalTaskStatus.Pending);
            var notificationCount = await _context.Notifications.CountAsync(n => !n.IsRead);
            var userCount = await _context.UserProfiles.CountAsync();

            // Recent activity (last 24 hours)
            var oneDayAgo = DateTime.UtcNow.AddDays(-1);
            var recentSubmissions = await _context.FormSubmissions.CountAsync(s => s.SubmittedAt.HasValue && s.SubmittedAt.Value >= oneDayAgo);
            var recentWorkflowRuns = await _context.WorkflowInstances.CountAsync(i => i.StartedAt >= oneDayAgo);

            // Average workflow execution time (last 100)
            var instances = await _context.WorkflowInstances
                .Where(i => i.CompletedAt.HasValue)
                .OrderByDescending(i => i.CompletedAt)
                .Take(100)
                .ToListAsync();

            var avgExecutionMs = instances.Any()
                ? instances.Average(i => (i.CompletedAt!.Value - i.StartedAt).TotalMilliseconds)
                : 0.0;

            // Workflow success rate
            var totalCompleted = await _context.WorkflowInstances.CountAsync(i => i.InstanceStatus == WorkflowInstanceStatus.Completed || i.InstanceStatus == WorkflowInstanceStatus.Failed);
            var successful = await _context.WorkflowInstances.CountAsync(i => i.InstanceStatus == WorkflowInstanceStatus.Completed);
            var successRate = totalCompleted > 0 ? (double)successful / totalCompleted * 100 : 100;

            return new PerformanceMetricsDto
            {
                System = new PerformanceMetricsDto.SystemMetrics
                {
                    Uptime = (DateTime.UtcNow - process.StartTime.ToUniversalTime()).TotalHours,
                    MemoryUsageMB = process.WorkingSet64 / 1024 / 1024,
                    ThreadCount = process.Threads.Count,
                    CpuTimeMs = process.TotalProcessorTime.TotalMilliseconds,
                },
                Database = new PerformanceMetricsDto.DatabaseMetrics
                {
                    FormCount = formCount,
                    WorkflowCount = workflowCount,
                    SubmissionCount = submissionCount,
                    ActiveInstances = activeInstances,
                    PendingApprovals = pendingApprovals,
                    UnreadNotifications = notificationCount,
                    UserCount = userCount,
                },
                Activity = new PerformanceMetricsDto.ActivityMetrics
                {
                    SubmissionsLast24h = recentSubmissions,
                    WorkflowRunsLast24h = recentWorkflowRuns,
                    AvgWorkflowExecutionMs = Math.Round(avgExecutionMs, 0),
                    WorkflowSuccessRate = Math.Round(successRate, 1),
                }
            };
        }
    }
}
