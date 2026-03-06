using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Data.Configurations
{
    public class FormCategoryConfiguration : IEntityTypeConfiguration<FormCategory>
    {
        public void Configure(EntityTypeBuilder<FormCategory> builder)
        {
            builder.HasKey(c => c.Id);
            builder.Property(c => c.CategoryName).IsRequired().HasMaxLength(200);
            builder.Property(c => c.Description).HasMaxLength(1000);
            builder.Property(c => c.DisplayOrder).HasDefaultValue(0);

            // Self-referencing hierarchy: parent → subcategories
            builder.HasOne(c => c.ParentCategory)
                   .WithMany(c => c.SubCategories)
                   .HasForeignKey(c => c.ParentCategoryId)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(c => c.Forms)
                   .WithOne(f => f.Category)
                   .HasForeignKey(f => f.CategoryId)
                   .OnDelete(DeleteBehavior.SetNull);

            builder.HasIndex(c => c.ParentCategoryId);
            builder.HasIndex(c => c.DisplayOrder);
        }
    }
}