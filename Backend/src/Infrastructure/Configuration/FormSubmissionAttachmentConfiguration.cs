using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class FormSubmissionAttachmentConfiguration : IEntityTypeConfiguration<FormSubmissionAttachment>
    {
        public void Configure(EntityTypeBuilder<FormSubmissionAttachment> builder)
        {
            builder.HasOne(e => e.Field)
                .WithMany()
                .HasForeignKey(e => e.FieldId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
