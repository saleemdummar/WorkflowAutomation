using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities.BetterAuth;

namespace WorkflowAutomation.Infrastructure.Data.Configurations
{
    /// <summary>
    /// EF Core configuration for the AuthAccount entity (auth_accounts table).
    /// Maps to the exact schema expected by Better Auth.
    /// </summary>
    public class AuthAccountConfiguration : IEntityTypeConfiguration<AuthAccount>
    {
        public void Configure(EntityTypeBuilder<AuthAccount> builder)
        {
            builder.ToTable("auth_accounts");

            builder.HasKey(a => a.Id);

            builder.Property(a => a.Id)
                .HasColumnName("id")
                .HasMaxLength(36)
                .IsRequired();

            builder.Property(a => a.UserId)
                .HasColumnName("userId")
                .HasMaxLength(36)
                .IsRequired();

            builder.Property(a => a.AccountId)
                .HasColumnName("accountId")
                .HasMaxLength(255)
                .IsRequired();

            builder.Property(a => a.ProviderId)
                .HasColumnName("providerId")
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(a => a.AccessToken)
                .HasColumnName("accessToken");

            builder.Property(a => a.RefreshToken)
                .HasColumnName("refreshToken");

            builder.Property(a => a.AccessTokenExpiresAt)
                .HasColumnName("accessTokenExpiresAt");

            builder.Property(a => a.RefreshTokenExpiresAt)
                .HasColumnName("refreshTokenExpiresAt");

            builder.Property(a => a.Scope)
                .HasColumnName("scope")
                .HasMaxLength(500);

            builder.Property(a => a.IdToken)
                .HasColumnName("idToken");

            builder.Property(a => a.Password)
                .HasColumnName("password")
                .HasMaxLength(500);

            builder.Property(a => a.CreatedAt)
                .HasColumnName("createdAt")
                .IsRequired();

            builder.Property(a => a.UpdatedAt)
                .HasColumnName("updatedAt")
                .IsRequired();

            // Relationship to AuthUser
            builder.HasOne(a => a.User)
                .WithMany(u => u.Accounts)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Composite unique index for provider + accountId (as per Better Auth schema)
            builder.HasIndex(a => new { a.ProviderId, a.AccountId })
                .IsUnique();
        }
    }
}
