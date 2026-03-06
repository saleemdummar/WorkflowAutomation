using System;
using System.Threading.Tasks;
using Hangfire;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Infrastructure.Services
{
    /// <summary>
    /// Service for handling background job operations using Hangfire.
    /// This service provides methods for scheduling and managing long-running workflow tasks.
    /// </summary>
    public interface IBackgroundJobService
    {
        /// <summary>
        /// Enqueues a workflow trigger job for background processing
        /// </summary>
        string EnqueueWorkflowTrigger(Guid submissionId);

        /// <summary>
        /// Enqueues a workflow instance processing job
        /// </summary>
        string EnqueueWorkflowProcessing(Guid instanceId);

        /// <summary>
        /// Schedules an approval reminder notification
        /// </summary>
        string ScheduleApprovalReminder(Guid taskId, TimeSpan delay);

        /// <summary>
        /// Enqueues an email sending job
        /// </summary>
        string EnqueueEmail(string to, string subject, string body);

        /// <summary>
        /// Enqueues a notification job
        /// </summary>
        string EnqueueNotification(string userId, string title, string message, string type);

        /// <summary>
        /// Schedules a recurring job for processing approval escalations
        /// </summary>
        void ScheduleEscalationProcessing(string cronExpression = "*/15 * * * *");

        /// <summary>
        /// Schedules a recurring job to process scheduled form publish/unpublish dates
        /// </summary>
        void ScheduleFormPublishing(string cronExpression = "*/5 * * * *");
    }

    public class BackgroundJobService : IBackgroundJobService
    {
        private readonly ILogger<BackgroundJobService> _logger;

        public BackgroundJobService(ILogger<BackgroundJobService> logger)
        {
            _logger = logger;
        }

        public string EnqueueWorkflowTrigger(Guid submissionId)
        {
            _logger.LogInformation("Enqueueing workflow trigger for submission {SubmissionId}", submissionId);
            return BackgroundJob.Enqueue<IWorkflowEngine>(engine => engine.TriggerWorkflowAsync(submissionId));
        }

        public string EnqueueWorkflowProcessing(Guid instanceId)
        {
            _logger.LogInformation("Enqueueing workflow processing for instance {InstanceId}", instanceId);
            return BackgroundJob.Enqueue<IWorkflowEngine>(engine => engine.ProcessWorkflowInstanceAsync(instanceId, null));
        }

        public string ScheduleApprovalReminder(Guid taskId, TimeSpan delay)
        {
            _logger.LogInformation("Scheduling approval reminder for task {TaskId} in {Delay}", taskId, delay);
            return BackgroundJob.Schedule<INotificationHubService>(
                service => service.SendApprovalReminderAsync(taskId.ToString()),
                delay);
        }

        public string EnqueueEmail(string to, string subject, string body)
        {
            _logger.LogInformation("Enqueueing email to {To}", to);
            return BackgroundJob.Enqueue<IEmailService>(service => service.SendEmailAsync(to, subject, body));
        }

        public string EnqueueNotification(string userId, string title, string message, string type)
        {
            _logger.LogInformation("Enqueueing notification for user {UserId}", userId);
            return BackgroundJob.Enqueue<INotificationHubService>(
                service => service.SendNotificationAsync(userId, title, message, type));
        }

        public void ScheduleEscalationProcessing(string cronExpression = "*/15 * * * *")
        {
            _logger.LogInformation("Scheduling escalation processing with cron: {CronExpression}", cronExpression);
            RecurringJob.AddOrUpdate<IApprovalEscalationService>(
                "process-approval-escalations",
                service => service.ProcessEscalationsAsync(),
                cronExpression);
        }

        public void ScheduleFormPublishing(string cronExpression = "*/5 * * * *")
        {
            _logger.LogInformation("Scheduling form publish/unpublish processing with cron: {CronExpression}", cronExpression);
            RecurringJob.AddOrUpdate<IFormLifecycleService>(
                "process-scheduled-form-publishing",
                service => service.ProcessScheduledPublishingAsync(),
                cronExpression);
        }
    }
}
