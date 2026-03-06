using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class ConditionActionConfiguration : IEntityTypeConfiguration<ConditionAction>
    {
        public void Configure(EntityTypeBuilder<ConditionAction> builder)
        {
            builder.Property(e => e.ActionType).HasMaxLength(50).IsRequired();
            builder.Property(e => e.ActionConfigJson).HasColumnType("nvarchar(max)");

            builder.HasIndex(e => e.ConditionId);
            builder.HasIndex(e => e.TargetFieldId);

            builder.HasOne(e => e.Condition)
                .WithMany(c => c.Actions)
                .HasForeignKey(e => e.ConditionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(e => e.TargetField)
                .WithMany(f => f.TargetActions)
                .HasForeignKey(e => e.TargetFieldId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
