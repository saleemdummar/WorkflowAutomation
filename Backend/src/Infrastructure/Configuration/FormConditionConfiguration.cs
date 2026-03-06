using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class FormConditionConfiguration : IEntityTypeConfiguration<FormCondition>
    {
        public void Configure(EntityTypeBuilder<FormCondition> builder)
        {
            builder.Property(e => e.ConditionName).HasMaxLength(500);
            builder.Property(e => e.Operator).HasMaxLength(50);
            builder.Property(e => e.ComparisonValue).HasMaxLength(1000);
            builder.Property(e => e.LogicalOperator).HasMaxLength(10);

            builder.HasIndex(e => e.FormId);
            builder.HasIndex(e => e.TriggerFieldId);

            builder.HasOne(e => e.Form)
                .WithMany(f => f.Conditions)
                .HasForeignKey(e => e.FormId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(e => e.TriggerField)
                .WithMany(f => f.TriggerConditions)
                .HasForeignKey(e => e.TriggerFieldId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(e => e.ConditionGroup)
                .WithMany(g => g.Conditions)
                .HasForeignKey(e => e.ConditionGroupId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
