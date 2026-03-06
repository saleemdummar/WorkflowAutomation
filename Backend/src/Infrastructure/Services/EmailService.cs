using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.Interfaces;
using WorkflowAutomation.Infrastructure.Data;

namespace WorkflowAutomation.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;
        private readonly ApplicationDbContext _dbContext;
        private readonly ISystemLogService _systemLogService;
        private readonly IAuditLogService _auditLogService;
        private readonly string _smtpHost;
        private readonly int _smtpPort;
        private readonly string _smtpUsername;
        private readonly string _smtpPassword;
        private readonly string _fromEmail;
        private readonly string _fromName;
        private readonly bool _enableSsl;
        private readonly string _baseUrl;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger, ApplicationDbContext dbContext, ISystemLogService systemLogService, IAuditLogService auditLogService)
        {
            _configuration = configuration;
            _logger = logger;
            _dbContext = dbContext;
            _systemLogService = systemLogService;
            _auditLogService = auditLogService;

            _smtpHost = _configuration["Email:SmtpHost"] ?? "localhost";
            _smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            _smtpUsername = _configuration["Email:Username"] ?? "";
            _smtpPassword = _configuration["Email:Password"] ?? "";
            _fromEmail = _configuration["Email:FromEmail"] ?? "noreply@workflowautomation.com";
            _fromName = _configuration["Email:FromName"] ?? "Workflow Automation";
            _enableSsl = bool.Parse(_configuration["Email:EnableSsl"] ?? "true");
            _baseUrl = _configuration["App:BaseUrl"] ?? "http://localhost:3000";
        }

        /// <summary>
        /// Tries to load a NotificationTemplate by name. Returns null if not found or inactive.
        /// </summary>
        private async Task<(string subject, string body)?> TryGetTemplateAsync(string templateName, Dictionary<string, string> replacements)
        {
            var template = await _dbContext.NotificationTemplates
                .FirstOrDefaultAsync(t => t.TemplateName == templateName && t.IsActive && t.TemplateType == "Email");

            if (template == null) return null;

            var subject = template.Subject;
            var body = template.BodyTemplate;

            foreach (var kvp in replacements)
            {
                subject = subject.Replace($"{{{{{kvp.Key}}}}}", kvp.Value);
                body = body.Replace($"{{{{{kvp.Key}}}}}", kvp.Value);
            }

            return (subject, body);
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                using var client = CreateSmtpClient();
                var mailMessage = new MailMessage
                {
                    From = new MailAddress(_fromEmail, _fromName),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };
                mailMessage.To.Add(toEmail);

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("Email sent successfully to {Email} with subject: {Subject}", toEmail, subject);
                await _systemLogService.LogInfoAsync("EmailService", $"Email sent to {toEmail} with subject: {subject}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {Email} with subject: {Subject}", toEmail, subject);
                await _systemLogService.LogAsync(Domain.Enums.LogLevel.Error, "EmailService", $"Failed to send email to {toEmail}: {ex.Message}", ex);
                throw;
            }
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string resetToken, string userName)
        {
            var resetLink = $"{_baseUrl}/reset-password?token={WebUtility.UrlEncode(resetToken)}&email={WebUtility.UrlEncode(toEmail)}";

            var subject = "Password Reset Request - Workflow Automation";
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
        .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Password Reset Request</h1>
        </div>
        <div class='content'>
            <p>Hello {userName},</p>
            <p>We received a request to reset your password for your Workflow Automation account.</p>
            <p>Click the button below to reset your password:</p>
            <p style='text-align: center;'>
                <a href='{resetLink}' class='button'>Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style='word-break: break-all;'>{resetLink}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div class='footer'>
            <p>This is an automated message from Workflow Automation. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>";

            await SendEmailAsync(toEmail, subject, body);
        }

        public async Task SendApprovalNotificationAsync(string toEmail, string approverName, string workflowName, string formTitle)
        {
            // Try to use a NotificationTemplate first
            var templateResult = await TryGetTemplateAsync("ApprovalNotification", new Dictionary<string, string>
            {
                { "ApproverName", approverName },
                { "WorkflowName", workflowName },
                { "FormTitle", formTitle },
                { "BaseUrl", _baseUrl }
            });

            if (templateResult.HasValue)
            {
                await SendEmailAsync(toEmail, templateResult.Value.subject, templateResult.Value.body);
                return;
            }

            // Fallback to default HTML template
            var subject = $"Action Required: Approval Needed for {formTitle}";
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #F59E0B; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
        .info-box {{ background-color: #fff; border-left: 4px solid #F59E0B; padding: 15px; margin: 15px 0; }}
        .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Approval Required</h1>
        </div>
        <div class='content'>
            <p>Hello {approverName},</p>
            <p>You have a new item waiting for your approval:</p>
            <div class='info-box'>
                <p><strong>Form:</strong> {formTitle}</p>
                <p><strong>Workflow:</strong> {workflowName}</p>
            </div>
            <p style='text-align: center;'>
                <a href='{_baseUrl}/approvals' class='button'>Review & Approve</a>
            </p>
            <p>Please review this item at your earliest convenience.</p>
        </div>
        <div class='footer'>
            <p>This is an automated message from Workflow Automation. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>";

            await SendEmailAsync(toEmail, subject, body);
        }

        public async Task SendWorkflowCompletedEmailAsync(string toEmail, string userName, string workflowName, bool approved)
        {
            var status = approved ? "Approved" : "Rejected";
            var statusColor = approved ? "#10B981" : "#EF4444";
            var subject = $"Workflow {status}: {workflowName}";

            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: {statusColor}; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
        .status {{ font-size: 24px; font-weight: bold; color: {statusColor}; }}
        .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Workflow {status}</h1>
        </div>
        <div class='content'>
            <p>Hello {userName},</p>
            <p>Your workflow submission has been processed:</p>
            <p class='status'>{status}</p>
            <p><strong>Workflow:</strong> {workflowName}</p>
            <p style='text-align: center;'>
                <a href='{_baseUrl}/submissions' class='button'>View Details</a>
            </p>
        </div>
        <div class='footer'>
            <p>This is an automated message from Workflow Automation. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>";

            await SendEmailAsync(toEmail, subject, body);
        }

        public async Task SendEscalationNotificationAsync(string toEmail, string approverName, string workflowName, string reason)
        {
            // Try to use a NotificationTemplate first
            var templateResult = await TryGetTemplateAsync("EscalationNotification", new Dictionary<string, string>
            {
                { "ApproverName", approverName },
                { "WorkflowName", workflowName },
                { "Reason", reason },
                { "BaseUrl", _baseUrl }
            });

            if (templateResult.HasValue)
            {
                await SendEmailAsync(toEmail, templateResult.Value.subject, templateResult.Value.body);
                return;
            }

            // Fallback to default HTML template
            var subject = $"Escalation: Action Required for {workflowName}";
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #EF4444; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
        .warning-box {{ background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 15px 0; }}
        .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Escalation Notice</h1>
        </div>
        <div class='content'>
            <p>Hello {approverName},</p>
            <p>An approval request has been escalated to you:</p>
            <div class='warning-box'>
                <p><strong>Workflow:</strong> {workflowName}</p>
                <p><strong>Reason:</strong> {reason}</p>
            </div>
            <p style='text-align: center;'>
                <a href='{_baseUrl}/approvals' class='button'>Review Now</a>
            </p>
            <p>This item requires immediate attention.</p>
        </div>
        <div class='footer'>
            <p>This is an automated message from Workflow Automation. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>";

            await SendEmailAsync(toEmail, subject, body);
        }

        private SmtpClient CreateSmtpClient()
        {
            var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                EnableSsl = _enableSsl
            };

            if (!string.IsNullOrEmpty(_smtpUsername) && !string.IsNullOrEmpty(_smtpPassword))
            {
                client.Credentials = new NetworkCredential(_smtpUsername, _smtpPassword);
            }

            return client;
        }
    }
}
