using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class WorkflowConfiguration : IEntityTypeConfiguration<Workflow>
    {
        public void Configure(EntityTypeBuilder<Workflow> builder)
        {
            builder.Property(e => e.WorkflowName).HasMaxLength(500).IsRequired();
            builder.Property(e => e.WorkflowDescription).HasMaxLength(2000);
            builder.Property(e => e.WorkflowDefinitionJson).HasColumnType("nvarchar(max)");

            builder.HasIndex(e => e.FormId);
            builder.HasIndex(e => e.IsActive);
            builder.HasIndex(e => e.IsPublished);

            builder.HasOne(e => e.Form)
                .WithMany(f => f.Workflows)
                .HasForeignKey(e => e.FormId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
