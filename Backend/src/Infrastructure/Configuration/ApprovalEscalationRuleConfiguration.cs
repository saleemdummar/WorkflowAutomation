using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class ApprovalEscalationRuleConfiguration : IEntityTypeConfiguration<ApprovalEscalationRule>
    {
        public void Configure(EntityTypeBuilder<ApprovalEscalationRule> builder)
        {
            builder.HasOne(e => e.Workflow)
                .WithMany()
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
