using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class FormSubmissionDataConfiguration : IEntityTypeConfiguration<FormSubmissionData>
    {
        public void Configure(EntityTypeBuilder<FormSubmissionData> builder)
        {
            builder.Property(e => e.FieldValue).HasColumnType("nvarchar(max)");
            builder.Property(e => e.FieldValueType).HasMaxLength(50);

            builder.HasIndex(e => e.SubmissionId);
            builder.HasIndex(e => e.FieldId);

            builder.HasOne(e => e.Submission)
                .WithMany(s => s.SubmissionData)
                .HasForeignKey(e => e.SubmissionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(e => e.Field)
                .WithMany(f => f.SubmissionData)
                .HasForeignKey(e => e.FieldId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
