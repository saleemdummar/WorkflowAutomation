using System.ComponentModel.DataAnnotations;

namespace WorkflowAutomation.Application.DTOs.Forms
{
    public class ImportFormDto
    {
        [Required]
        public string Name { get; set; }

        public string Description { get; set; }

        [Required]
        public string Definition { get; set; }

        public string Layout { get; set; }

        public Guid CategoryId { get; set; }
    }
}
