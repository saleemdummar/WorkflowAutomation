using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class FormConfiguration : IEntityTypeConfiguration<Form>
    {
        public void Configure(EntityTypeBuilder<Form> builder)
        {
            builder.Property(e => e.FormName).HasMaxLength(500).IsRequired();
            builder.Property(e => e.FormDescription).HasMaxLength(2000);
            builder.Property(e => e.FormDefinitionJson).HasColumnType("nvarchar(max)");
            builder.Property(e => e.FormLayoutJson).HasColumnType("nvarchar(max)");
            builder.Property(e => e.ArchiveReason).HasMaxLength(1000);
            builder.Property(e => e.ExpirationReason).HasMaxLength(1000);
            builder.Property(e => e.ScheduleReason).HasMaxLength(1000);

            builder.HasIndex(e => e.CategoryId);
            builder.HasIndex(e => e.IsActive);
            builder.HasIndex(e => e.IsPublished);
            builder.HasIndex(e => e.IsArchived);

            builder.HasOne(e => e.Category)
                .WithMany(c => c.Forms)
                .HasForeignKey(e => e.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
