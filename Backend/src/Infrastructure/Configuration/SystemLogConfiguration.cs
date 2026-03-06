using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class SystemLogConfiguration : IEntityTypeConfiguration<SystemLog>
    {
        public void Configure(EntityTypeBuilder<SystemLog> builder)
        {
            builder.HasKey(e => e.LogId);
            builder.Property(e => e.LogId).ValueGeneratedOnAdd();
            builder.Property(e => e.Source).HasMaxLength(500);
            builder.Property(e => e.Message).HasColumnType("nvarchar(max)");
            builder.Property(e => e.Exception).HasColumnType("nvarchar(max)");
            builder.Property(e => e.StackTrace).HasColumnType("nvarchar(max)");
            builder.HasIndex(e => e.Timestamp);
            builder.HasIndex(e => e.LogLevel);
        }
    }
}
