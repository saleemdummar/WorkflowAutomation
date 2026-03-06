using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
    {
        public void Configure(EntityTypeBuilder<Notification> builder)
        {
            builder.Property(e => e.NotificationType).HasMaxLength(100);
            builder.Property(e => e.Subject).HasMaxLength(500);
            builder.Property(e => e.Message).HasColumnType("nvarchar(max)");
            builder.Property(e => e.RelatedEntityType).HasMaxLength(100);

            // Indexes
            builder.HasIndex(e => e.UserId);
            builder.HasIndex(e => e.IsRead);
        }
    }
}
