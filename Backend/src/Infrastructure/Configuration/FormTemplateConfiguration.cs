using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Configuration
{
    public class FormTemplateConfiguration : IEntityTypeConfiguration<FormTemplate>
    {
        public void Configure(EntityTypeBuilder<FormTemplate> builder)
        {
            builder.Property(e => e.Name).HasMaxLength(500).IsRequired();
            builder.Property(e => e.Category).HasMaxLength(200);
            builder.Property(e => e.FormDefinition).HasColumnType("nvarchar(max)");
            builder.Property(e => e.FormLayoutJson).HasColumnType("nvarchar(max)");

            builder.HasIndex(e => e.IsPublic);
            builder.HasIndex(e => e.Category);
        }
    }
}
