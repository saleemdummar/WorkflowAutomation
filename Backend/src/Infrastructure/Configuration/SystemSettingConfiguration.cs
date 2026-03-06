using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class SystemSettingConfiguration : IEntityTypeConfiguration<SystemSetting>
    {
        public void Configure(EntityTypeBuilder<SystemSetting> builder)
        {
            builder.Property(e => e.SettingKey).HasMaxLength(500).IsRequired();
            builder.Property(e => e.SettingValue).HasColumnType("nvarchar(max)");
            builder.Property(e => e.SettingType).HasMaxLength(50);
            builder.Property(e => e.Description).HasMaxLength(2000);
            builder.Property(e => e.Category).HasMaxLength(100);

            builder.HasIndex(e => e.SettingKey).IsUnique();
            builder.HasIndex(e => e.Category);
        }
    }
}
