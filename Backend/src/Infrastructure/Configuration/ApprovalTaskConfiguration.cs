using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class ApprovalTaskConfiguration : IEntityTypeConfiguration<ApprovalTask>
    {
        public void Configure(EntityTypeBuilder<ApprovalTask> builder)
        {
            builder.Property(e => e.AssignedTo).HasMaxLength(500);
            builder.Property(e => e.Comments).HasColumnType("nvarchar(max)");

            builder.HasOne(e => e.WorkflowInstance)
                .WithMany(i => i.ApprovalTasks)
                .HasForeignKey(e => e.WorkflowInstanceId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(e => e.Step)
                .WithMany(s => s.Tasks)
                .HasForeignKey(e => e.StepId)
                .OnDelete(DeleteBehavior.Restrict);

            // Indexes
            builder.HasIndex(e => e.WorkflowInstanceId);
            builder.HasIndex(e => e.AssignedTo);
            builder.HasIndex(e => e.TaskStatus);
        }
    }
}
