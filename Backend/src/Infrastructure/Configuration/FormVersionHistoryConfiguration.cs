using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class FormVersionHistoryConfiguration : IEntityTypeConfiguration<FormVersionHistory>
    {
        public void Configure(EntityTypeBuilder<FormVersionHistory> builder)
        {
            builder.Property(e => e.FormDefinitionJson).HasColumnType("nvarchar(max)");
            builder.Property(e => e.FormLayoutJson).HasColumnType("nvarchar(max)");
            builder.Property(e => e.ChangeDescription).HasMaxLength(2000);
            builder.Property(e => e.CreatedBy).HasMaxLength(500);

            builder.HasIndex(e => e.FormId);
            builder.HasIndex(e => e.VersionNumber);

            builder.HasOne(e => e.Form)
                .WithMany(f => f.VersionHistory)
                .HasForeignKey(e => e.FormId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
