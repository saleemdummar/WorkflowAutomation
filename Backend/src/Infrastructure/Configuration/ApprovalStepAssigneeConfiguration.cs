using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class ApprovalStepAssigneeConfiguration : IEntityTypeConfiguration<ApprovalStepAssignee>
    {
        public void Configure(EntityTypeBuilder<ApprovalStepAssignee> builder)
        {
            builder.Property(e => e.AssignmentType).HasMaxLength(50);

            builder.HasIndex(e => e.StepId);

            builder.HasOne(e => e.Step)
                .WithMany(s => s.Assignees)
                .HasForeignKey(e => e.StepId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
