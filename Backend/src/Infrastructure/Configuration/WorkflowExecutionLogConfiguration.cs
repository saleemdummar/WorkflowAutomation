using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class WorkflowExecutionLogConfiguration : IEntityTypeConfiguration<WorkflowExecutionLog>
    {
        public void Configure(EntityTypeBuilder<WorkflowExecutionLog> builder)
        {
            builder.Property(e => e.InputDataJson).HasColumnType("nvarchar(max)");
            builder.Property(e => e.OutputDataJson).HasColumnType("nvarchar(max)");
            builder.Property(e => e.ErrorMessage).HasColumnType("nvarchar(max)");

            builder.HasIndex(e => e.InstanceId);
            builder.HasIndex(e => e.ExecutedAt);

            builder.HasOne(e => e.Instance)
                .WithMany(i => i.ExecutionLogs)
                .HasForeignKey(e => e.InstanceId)
                .OnDelete(DeleteBehavior.Cascade);

            // NodeId is stored but not enforced as a foreign key since workflow nodes
            // are stored in JSON and the source of truth is the WorkflowDefinitionJson
        }
    }
}
