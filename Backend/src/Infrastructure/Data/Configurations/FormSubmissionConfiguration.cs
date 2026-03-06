using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorkflowAutomation.Domain.Entities;

namespace WorkflowAutomation.Infrastructure.Data.Configurations
{
       public class FormSubmissionConfiguration : IEntityTypeConfiguration<FormSubmission>
       {
              public void Configure(EntityTypeBuilder<FormSubmission> builder)
              {
                     builder.HasKey(fs => fs.Id);
                     builder.Property(fs => fs.SubmissionStatus).IsRequired();
                     builder.Property(fs => fs.SubmittedBy).IsRequired();

                     builder.HasOne(fs => fs.Form)
                            .WithMany(f => f.Submissions)
                            .HasForeignKey(fs => fs.FormId)
                            .OnDelete(DeleteBehavior.NoAction);

                     builder.HasOne(fs => fs.Workflow)
                            .WithMany(w => w.Submissions)
                            .HasForeignKey(fs => fs.WorkflowId)
                            .OnDelete(DeleteBehavior.NoAction);


                     builder.HasMany(fs => fs.SubmissionData)
                            .WithOne(sd => sd.Submission)
                            .HasForeignKey(sd => sd.SubmissionId)
                            .OnDelete(DeleteBehavior.Cascade);

                     builder.HasMany(fs => fs.Attachments)
                            .WithOne(a => a.Submission)
                            .HasForeignKey(a => a.SubmissionId)
                            .OnDelete(DeleteBehavior.NoAction);

                     // ApprovalTasks FK on the FormSubmission side (shadow FK)
                     builder.HasMany(fs => fs.ApprovalTasks)
                            .WithOne()
                            .HasForeignKey("FormSubmissionId")
                            .OnDelete(DeleteBehavior.NoAction);

                     builder.HasMany(fs => fs.ApprovalHistory)
                            .WithOne(ah => ah.Submission)
                            .HasForeignKey(ah => ah.SubmissionId)
                            .OnDelete(DeleteBehavior.NoAction);

                     // Indexes
                     builder.HasIndex(fs => fs.FormId);
                     builder.HasIndex(fs => fs.SubmittedBy);
                     builder.HasIndex(fs => fs.SubmissionStatus);
              }
       }
}