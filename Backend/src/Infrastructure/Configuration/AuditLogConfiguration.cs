using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
    {
        public void Configure(EntityTypeBuilder<AuditLog> builder)
        {
            builder.Property(e => e.Action).HasMaxLength(100).IsRequired();
            builder.Property(e => e.EntityType).HasMaxLength(100).IsRequired();
            builder.Property(e => e.EntityName).HasMaxLength(500);
            builder.Property(e => e.UserName).HasMaxLength(500);
            builder.Property(e => e.UserEmail).HasMaxLength(500);
            builder.Property(e => e.IpAddress).HasMaxLength(100);
            builder.Property(e => e.UserAgent).HasMaxLength(1000);
            builder.Property(e => e.OldValues).HasColumnType("nvarchar(max)");
            builder.Property(e => e.NewValues).HasColumnType("nvarchar(max)");
            builder.Property(e => e.AdditionalInfo).HasColumnType("nvarchar(max)");

            builder.HasIndex(e => e.EntityType);
            builder.HasIndex(e => e.EntityId);
            builder.HasIndex(e => e.UserId);
            builder.HasIndex(e => e.Timestamp);
        }
    }
}
