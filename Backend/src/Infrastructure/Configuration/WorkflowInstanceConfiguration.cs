using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class WorkflowInstanceConfiguration : IEntityTypeConfiguration<WorkflowInstance>
    {
        public void Configure(EntityTypeBuilder<WorkflowInstance> builder)
        {
            builder.Property(e => e.InstanceStatus)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(e => e.ErrorMessage).HasColumnType("nvarchar(max)");

            builder.HasOne(e => e.Workflow)
                .WithMany(w => w.Instances)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(e => e.Submission)
                .WithMany(s => s.WorkflowInstances)
                .HasForeignKey(e => e.SubmissionId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            // Indexes
            builder.HasIndex(e => e.WorkflowId);
            builder.HasIndex(e => e.SubmissionId);
            builder.HasIndex(e => e.InstanceStatus);
        }
    }
}
