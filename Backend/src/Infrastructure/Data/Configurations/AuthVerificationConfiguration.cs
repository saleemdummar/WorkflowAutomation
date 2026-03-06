using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities.BetterAuth;

namespace WorkflowAutomation.Infrastructure.Data.Configurations
{
    /// <summary>
    /// EF Core configuration for the AuthVerification entity (auth_verifications table).
    /// Maps to the exact schema expected by Better Auth.
    /// </summary>
    public class AuthVerificationConfiguration : IEntityTypeConfiguration<AuthVerification>
    {
        public void Configure(EntityTypeBuilder<AuthVerification> builder)
        {
            builder.ToTable("auth_verifications");

            builder.HasKey(v => v.Id);

            builder.Property(v => v.Id)
                .HasColumnName("id")
                .HasMaxLength(36)
                .IsRequired();

            builder.Property(v => v.Identifier)
                .HasColumnName("identifier")
                .HasMaxLength(255)
                .IsRequired();

            builder.Property(v => v.Value)
                .HasColumnName("value")
                .HasMaxLength(500)
                .IsRequired();

            builder.Property(v => v.ExpiresAt)
                .HasColumnName("expiresAt")
                .IsRequired();

            builder.Property(v => v.CreatedAt)
                .HasColumnName("createdAt")
                .IsRequired();

            builder.Property(v => v.UpdatedAt)
                .HasColumnName("updatedAt")
                .IsRequired();

            // Index for quick lookup by identifier
            builder.HasIndex(v => v.Identifier);
        }
    }
}
