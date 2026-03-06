using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class UserProfileConfiguration : IEntityTypeConfiguration<UserProfile>
    {
        public void Configure(EntityTypeBuilder<UserProfile> builder)
        {
            builder.Property(e => e.SubjectId).HasMaxLength(500);
            builder.Property(e => e.Email).HasMaxLength(500);
            builder.Property(e => e.FirstName).HasMaxLength(200);
            builder.Property(e => e.LastName).HasMaxLength(200);
            builder.Property(e => e.DisplayName).HasMaxLength(500);
            builder.Property(e => e.Department).HasMaxLength(200);
            builder.Property(e => e.JobTitle).HasMaxLength(200);
            builder.Property(e => e.ProfilePictureUrl).HasMaxLength(2000);

            builder.HasIndex(e => e.SubjectId);
            builder.HasIndex(e => e.Email);
        }
    }
}
