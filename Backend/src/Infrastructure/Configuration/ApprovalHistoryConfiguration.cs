using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class ApprovalHistoryConfiguration : IEntityTypeConfiguration<ApprovalHistory>
    {
        public void Configure(EntityTypeBuilder<ApprovalHistory> builder)
        {
            builder.Property(e => e.Action).HasMaxLength(50);
            builder.Property(e => e.Comments).HasColumnType("nvarchar(max)");

            builder.HasIndex(e => e.TaskId);
            builder.HasIndex(e => e.SubmissionId);
            builder.HasIndex(e => e.ActionAt);

            builder.HasOne(e => e.Task)
                .WithMany(t => t.History)
                .HasForeignKey(e => e.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(e => e.Submission)
                .WithMany(s => s.ApprovalHistory)
                .HasForeignKey(e => e.SubmissionId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
