namespace WorkflowAutomation.Application.DTOs.Forms
{
    public class CreateFormDto
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string Definition { get; set; }
        public string Layout { get; set; }
        public Guid? CategoryId { get; set; }
        public string ChangeDescription { get; set; }
    }
}
