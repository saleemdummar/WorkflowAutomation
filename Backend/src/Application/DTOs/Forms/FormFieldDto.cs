namespace WorkflowAutomation.Application.DTOs.Forms
{
    public class FormFieldDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Label { get; set; }
        public string Type { get; set; }
        public bool Required { get; set; }
        public string ConfigJson { get; set; }
        public int Order { get; set; }
    }
}