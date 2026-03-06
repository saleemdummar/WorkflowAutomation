using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;
using WorkflowAutomation.Domain.Enums;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class WorkflowNodeConfiguration : IEntityTypeConfiguration<WorkflowNode>
    {
        public void Configure(EntityTypeBuilder<WorkflowNode> builder)
        {
            builder.Property(e => e.NodeType)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(e => e.NodeName).HasMaxLength(500);
            builder.Property(e => e.NodeConfigJson).HasColumnType("nvarchar(max)");
            builder.Property(e => e.PositionX).HasColumnType("decimal(18,2)");
            builder.Property(e => e.PositionY).HasColumnType("decimal(18,2)");

            builder.HasIndex(e => e.WorkflowId);

            builder.HasOne(e => e.Workflow)
                .WithMany(w => w.Nodes)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
