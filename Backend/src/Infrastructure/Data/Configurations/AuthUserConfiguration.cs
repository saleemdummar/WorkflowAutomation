using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities.BetterAuth;

namespace WorkflowAutomation.Infrastructure.Data.Configurations
{
    /// <summary>
    /// EF Core configuration for the AuthUser entity (auth_users table).
    /// Maps to the exact schema expected by Better Auth.
    /// </summary>
    public class AuthUserConfiguration : IEntityTypeConfiguration<AuthUser>
    {
        public void Configure(EntityTypeBuilder<AuthUser> builder)
        {
            builder.ToTable("auth_users");

            builder.HasKey(u => u.Id);

            builder.Property(u => u.Id)
                .HasColumnName("id")
                .HasMaxLength(36)
                .IsRequired();

            builder.Property(u => u.Name)
                .HasColumnName("name")
                .HasMaxLength(255);

            builder.Property(u => u.Email)
                .HasColumnName("email")
                .HasMaxLength(255)
                .IsRequired();

            builder.HasIndex(u => u.Email)
                .IsUnique();

            builder.Property(u => u.EmailVerified)
                .HasColumnName("emailVerified");

            builder.Property(u => u.Image)
                .HasColumnName("image")
                .HasMaxLength(1000);

            builder.Property(u => u.CreatedAt)
                .HasColumnName("createdAt")
                .IsRequired();

            builder.Property(u => u.UpdatedAt)
                .HasColumnName("updatedAt")
                .IsRequired();

            builder.Property(u => u.Role)
                .HasColumnName("role")
                .HasMaxLength(500);

            builder.Property(u => u.Banned)
                .HasColumnName("banned");

            builder.Property(u => u.BanReason)
                .HasColumnName("banReason")
                .HasMaxLength(1000);

            builder.Property(u => u.BanExpires)
                .HasColumnName("banExpires");

            // Relationships are configured in child entities
        }
    }
}
