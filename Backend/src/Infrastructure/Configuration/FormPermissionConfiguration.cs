using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class FormPermissionConfiguration : IEntityTypeConfiguration<FormPermission>
    {
        public void Configure(EntityTypeBuilder<FormPermission> builder)
        {
            builder.Property(e => e.PermissionLevel).HasMaxLength(50).IsRequired();
            builder.Property(e => e.RoleName).HasMaxLength(200);

            builder.HasIndex(e => e.FormId);
            builder.HasIndex(e => e.UserId);

            builder.HasOne(e => e.Form)
                .WithMany()
                .HasForeignKey(e => e.FormId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
