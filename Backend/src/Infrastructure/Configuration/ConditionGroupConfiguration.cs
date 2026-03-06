using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class ConditionGroupConfiguration : IEntityTypeConfiguration<ConditionGroup>
    {
        public void Configure(EntityTypeBuilder<ConditionGroup> builder)
        {
            builder.HasOne(e => e.ParentGroup)
                .WithMany(e => e.SubGroups)
                .HasForeignKey(e => e.ParentGroupId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(e => e.Form)
                .WithMany()
                .HasForeignKey(e => e.FormId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
