using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class NotificationTemplateConfiguration : IEntityTypeConfiguration<NotificationTemplate>
    {
        public void Configure(EntityTypeBuilder<NotificationTemplate> builder)
        {
            builder.Property(e => e.TemplateName).HasMaxLength(500).IsRequired();
            builder.Property(e => e.TemplateType).HasMaxLength(50);
            builder.Property(e => e.Subject).HasMaxLength(500);
            builder.Property(e => e.BodyTemplate).HasColumnType("nvarchar(max)");

            builder.HasIndex(e => e.TemplateName);
            builder.HasIndex(e => e.TemplateType);
        }
    }
}
