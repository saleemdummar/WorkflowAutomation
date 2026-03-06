using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class WorkflowVersionHistoryConfiguration : IEntityTypeConfiguration<WorkflowVersionHistory>
    {
        public void Configure(EntityTypeBuilder<WorkflowVersionHistory> builder)
        {
            builder.Property(e => e.WorkflowDefinitionJson).HasColumnType("nvarchar(max)");
            builder.Property(e => e.ChangeDescription).HasMaxLength(2000);
            builder.Property(e => e.CreatedBy).HasMaxLength(500);

            builder.HasIndex(e => e.WorkflowId);
            builder.HasIndex(e => e.VersionNumber);

            builder.HasOne(e => e.Workflow)
                .WithMany(w => w.VersionHistory)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
