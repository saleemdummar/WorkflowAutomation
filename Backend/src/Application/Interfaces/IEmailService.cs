using System.Threading.Tasks;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IEmailService
    {
        Task SendPasswordResetEmailAsync(string toEmail, string resetToken, string userName);
        Task SendEmailAsync(string toEmail, string subject, string body);
        Task SendApprovalNotificationAsync(string toEmail, string approverName, string workflowName, string formTitle);
        Task SendWorkflowCompletedEmailAsync(string toEmail, string userName, string workflowName, bool approved);
        Task SendEscalationNotificationAsync(string toEmail, string approverName, string workflowName, string reason);
    }
}
