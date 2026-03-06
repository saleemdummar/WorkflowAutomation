using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class CrossFieldValidationRuleConfiguration : IEntityTypeConfiguration<CrossFieldValidationRule>
    {
        public void Configure(EntityTypeBuilder<CrossFieldValidationRule> builder)
        {
            builder.Property(e => e.RuleName).HasMaxLength(500).IsRequired();
            builder.Property(e => e.ValidationType).HasMaxLength(50).IsRequired();
            builder.Property(e => e.RuleConfiguration).HasColumnType("nvarchar(max)").IsRequired();
            builder.Property(e => e.ErrorMessage).HasMaxLength(2000).IsRequired();

            builder.HasIndex(e => e.FormId);

            builder.HasOne(e => e.Form)
                .WithMany()
                .HasForeignKey(e => e.FormId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
