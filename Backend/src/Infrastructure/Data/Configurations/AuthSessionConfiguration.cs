using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities.BetterAuth;

namespace WorkflowAutomation.Infrastructure.Data.Configurations
{
    /// <summary>
    /// EF Core configuration for the AuthSession entity (auth_sessions table).
    /// Maps to the exact schema expected by Better Auth.
    /// </summary>
    public class AuthSessionConfiguration : IEntityTypeConfiguration<AuthSession>
    {
        public void Configure(EntityTypeBuilder<AuthSession> builder)
        {
            builder.ToTable("auth_sessions");

            builder.HasKey(s => s.Id);

            builder.Property(s => s.Id)
                .HasColumnName("id")
                .HasMaxLength(36)
                .IsRequired();

            builder.Property(s => s.Token)
                .HasColumnName("token")
                .HasMaxLength(500)
                .IsRequired();

            builder.HasIndex(s => s.Token)
                .IsUnique();

            builder.Property(s => s.ExpiresAt)
                .HasColumnName("expiresAt")
                .IsRequired();

            builder.Property(s => s.IpAddress)
                .HasColumnName("ipAddress")
                .HasMaxLength(50);

            builder.Property(s => s.UserAgent)
                .HasColumnName("userAgent")
                .HasMaxLength(1000);

            builder.Property(s => s.UserId)
                .HasColumnName("userId")
                .HasMaxLength(36)
                .IsRequired();

            builder.Property(s => s.CreatedAt)
                .HasColumnName("createdAt")
                .IsRequired();

            builder.Property(s => s.UpdatedAt)
                .HasColumnName("updatedAt")
                .IsRequired();

            // Relationship to AuthUser
            builder.HasOne(s => s.User)
                .WithMany(u => u.Sessions)
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
