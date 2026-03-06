using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Data.Configurations
{
       public class FormFieldConfiguration : IEntityTypeConfiguration<FormField>
       {
              public void Configure(EntityTypeBuilder<FormField> builder)
              {
                     builder.HasKey(ff => ff.Id);
                     builder.Property(ff => ff.FieldName).IsRequired().HasMaxLength(200);
                     builder.Property(ff => ff.FieldLabel).IsRequired().HasMaxLength(255);
                     builder.Property(ff => ff.FieldType).IsRequired().HasMaxLength(50);
                     builder.Property(ff => ff.FieldConfigJson);
                     builder.Property(ff => ff.IsRequired).HasDefaultValue(false);
                     builder.Property(ff => ff.DisplayOrder).HasDefaultValue(0);

                     builder.HasOne(ff => ff.Form)
                            .WithMany(f => f.Fields)
                            .HasForeignKey(ff => ff.FormId)
                            .OnDelete(DeleteBehavior.Cascade);

                     builder.HasOne(ff => ff.ParentField)
                            .WithMany(ff => ff.ChildFields)
                            .HasForeignKey(ff => ff.ParentFieldId)
                            .OnDelete(DeleteBehavior.NoAction);

                     builder.HasOne(ff => ff.ConditionGroup)
                            .WithMany()
                            .HasForeignKey(ff => ff.ConditionGroupId)
                            .OnDelete(DeleteBehavior.NoAction);

                     builder.HasMany(ff => ff.TriggerConditions)
                            .WithOne(c => c.TriggerField)
                            .HasForeignKey(c => c.TriggerFieldId)
                            .OnDelete(DeleteBehavior.NoAction);

                     builder.HasMany(ff => ff.TargetActions)
                            .WithOne(a => a.TargetField)
                            .HasForeignKey(a => a.TargetFieldId)
                            .OnDelete(DeleteBehavior.NoAction);

                     builder.HasMany(ff => ff.SubmissionData)
                            .WithOne(sd => sd.Field)
                            .HasForeignKey(sd => sd.FieldId)
                            .OnDelete(DeleteBehavior.Cascade);

                     builder.HasIndex(ff => ff.FormId);
                     builder.HasIndex(ff => new { ff.FormId, ff.FieldName }).IsUnique();
                     builder.HasIndex(ff => new { ff.FormId, ff.DisplayOrder });
                     builder.HasIndex(ff => ff.ParentFieldId);
              }
       }
}