using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class ApprovalStepConfiguration : IEntityTypeConfiguration<ApprovalStep>
    {
        public void Configure(EntityTypeBuilder<ApprovalStep> builder)
        {
            builder.Property(e => e.StepName).HasMaxLength(500).IsRequired();
            builder.Property(e => e.ApprovalType).HasMaxLength(50);

            builder.HasIndex(e => e.WorkflowId);

            builder.HasOne(e => e.Workflow)
                .WithMany(w => w.ApprovalSteps)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);

            // NodeId is stored but not enforced as a foreign key since workflow nodes
            // are stored in JSON and the source of truth is the WorkflowDefinitionJson
        }
    }
}
