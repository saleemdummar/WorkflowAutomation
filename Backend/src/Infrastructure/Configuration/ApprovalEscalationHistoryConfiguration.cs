using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class ApprovalEscalationHistoryConfiguration : IEntityTypeConfiguration<ApprovalEscalationHistory>
    {
        public void Configure(EntityTypeBuilder<ApprovalEscalationHistory> builder)
        {
            builder.Property(e => e.Reason).HasMaxLength(2000);

            builder.HasIndex(e => e.ApprovalTaskId);
            builder.HasIndex(e => e.ApprovalEscalationRuleId);
            builder.HasIndex(e => e.EscalatedAt);

            builder.HasOne(e => e.ApprovalTask)
                .WithMany()
                .HasForeignKey(e => e.ApprovalTaskId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(e => e.EscalationRule)
                .WithMany()
                .HasForeignKey(e => e.ApprovalEscalationRuleId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
